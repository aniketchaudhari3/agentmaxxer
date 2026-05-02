import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { RegistryProvider } from "@agentmaxxer/types"

const CACHE_PATH = join(homedir(), ".agentmaxxer", "registry-cache.json")

export class Cache {
  read(): RegistryProvider[] | null {
    try {
      const raw = readFileSync(CACHE_PATH, "utf-8")
      return JSON.parse(raw) as RegistryProvider[]
    } catch {
      return null
    }
  }

  write(providers: RegistryProvider[]): void {
    try {
      mkdirSync(join(homedir(), ".agentmaxxer"), { recursive: true })
      writeFileSync(CACHE_PATH, JSON.stringify(providers, null, 2))
    } catch {
      // Silently fail if we can't write cache
    }
  }
}
