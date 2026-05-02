import { exec } from "node:child_process"
import { promisify } from "node:util"
import type { RegistryClient } from "@agentmaxxer/registry"
import type { RegistryProvider } from "@agentmaxxer/types"

const execAsync = promisify(exec)

const CACHE_TTL_MS = 30_000

export interface DetectionResult {
  id: string
  name: string
  installed: boolean
  path?: string
  version?: string
  type: "paid" | "free"
  auth: boolean
  binary?: string
}

interface CacheEntry {
  result: DetectionResult
  expiresAt: number
}

export class DetectionEngine {
  private cache = new Map<string, CacheEntry>()

  constructor(private registry: RegistryClient) {}

  private isCached(key: string): DetectionResult | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.result
  }

  private setCache(key: string, result: DetectionResult): void {
    this.cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  reload(): void {
    this.cache.clear()
  }

  async detectAll(): Promise<DetectionResult[]> {
    const providers = await this.registry.fetchProviders()
    return Promise.all(providers.map(p => this.detectOne(p)))
  }

  async detectOne(provider: RegistryProvider): Promise<DetectionResult> {
    const key = provider.id
    const cached = this.isCached(key)
    if (cached) return cached

    const binary = provider.detection.binary
    try {
      const { stdout: which } = await execAsync(`which ${binary}`, { encoding: "utf-8", timeout: 1000 })
      const path = which.trim()
      if (!path) {
        const result: DetectionResult = { id: provider.id, name: provider.name, installed: false, type: provider.type, auth: false, binary }
        this.setCache(key, result)
        return result
      }

      let version: string | undefined
      try {
        const { stdout: verOut } = await execAsync(`${binary} ${provider.detection.versionFlag}`, { encoding: "utf-8", timeout: 300 })
        const regex = new RegExp(provider.detection.versionRegex)
        const match = verOut.match(regex)
        version = match ? match[1] : undefined
      } catch {}

      const auth = provider.auth.envVar ? !!process.env[provider.auth.envVar] : true

      const result: DetectionResult = { id: provider.id, name: provider.name, installed: true, path, version, type: provider.type, auth, binary }
      this.setCache(key, result)
      return result
    } catch {
      const result: DetectionResult = { id: provider.id, name: provider.name, installed: false, type: provider.type, auth: false, binary }
      this.setCache(key, result)
      return result
    }
  }
}
