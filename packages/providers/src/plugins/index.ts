import type { RegistryProvider } from "@agentmaxxer/types"
import type { ProviderPlugin } from "../plugin.js"
import { ClaudePlugin } from "./claude.js"
import { CodexPlugin } from "./codex.js"
import { OpenCodePlugin } from "./opencode.js"
import { GenericPlugin } from "./generic.js"

const pluginConstructors: Record<string, new (meta: RegistryProvider) => ProviderPlugin> = {
  "claude-code": ClaudePlugin,
  "claude": ClaudePlugin,
  "codex-cli": CodexPlugin,
  "opencode": OpenCodePlugin,
}

export function getPlugin(meta: RegistryProvider): ProviderPlugin {
  const ctor = pluginConstructors[meta.id]
  if (ctor) return new ctor(meta)
  return new GenericPlugin(meta)
}
