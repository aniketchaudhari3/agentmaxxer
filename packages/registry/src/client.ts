import type { RegistryProvider } from "@agentmaxxer/types"
import { Cache } from "./cache.js"

export class RegistryClient {
  private baseUrl: string
  private cache: Cache
  private providers: RegistryProvider[] | null = null

  constructor(baseUrl = "http://localhost:4100") {
    this.baseUrl = baseUrl
    this.cache = new Cache()
  }

  async fetchProviders(): Promise<RegistryProvider[]> {
    if (this.providers) return this.providers

    const cached = this.cache.read()
    if (cached) {
      this.providers = cached
      return cached
    }

    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 100)
      const res = await fetch(`${this.baseUrl}/providers`, { signal: ac.signal })
      clearTimeout(timer)
      const data = await res.json() as { providers: RegistryProvider[] }
      this.providers = data.providers
      this.cache.write(data.providers)
      return data.providers
    } catch {
      const { getBuiltinProviders } = await import("./builtin.js")
      const fallback = getBuiltinProviders()
      this.providers = fallback
      return fallback
    }
  }

  async fetchProvider(id: string): Promise<RegistryProvider | null> {
    const providers = await this.fetchProviders()
    return providers.find(p => p.id === id) ?? null
  }

  async refresh(): Promise<void> {
    this.providers = null
    await this.fetchProviders()
  }
}
