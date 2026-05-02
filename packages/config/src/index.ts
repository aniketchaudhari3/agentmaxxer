import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export type RoutingStrategy = "free-first" | "paid-first" | "round-robin"

export interface Config {
  registry: { url: string }
  storage: { dbPath: string }
  server: { port: number }
  routing: {
    strategy: RoutingStrategy
  }
}

const DEFAULTS: Config = {
  registry: { url: "http://localhost:4100" },
  storage: { dbPath: join(homedir(), ".agentmaxxer", "data.db") },
  server: { port: 4001 },
  routing: { strategy: "paid-first" }
}

export function loadConfig(): Config {
  try {
    const raw = readFileSync(join(homedir(), ".agentmaxxer", "config.json"), "utf-8")
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}
