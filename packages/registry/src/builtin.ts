import type { RegistryProvider } from "@agentmaxxer/types"

// Mirrors apps/registry/src/data/providers.json — used as an offline fallback
// when the registry server is unreachable.
export function getBuiltinProviders(): RegistryProvider[] {
  return [
    {
      id: "claude-code",
      name: "Claude Code",
      type: "paid",
      detection: {
        binary: "claude",
        versionFlag: "--version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)"
      },
      exec: {
        template: "{binary} -p {task}",
        shell: false,
        modelFlag: "--model"
      },
      auth: { envVar: "ANTHROPIC_API_KEY" },
      install: { command: "npm install -g @anthropic-ai/claude-code" },
      quota: {
        exitCodes: [1],
        errorPatterns: ["quota exhausted", "rate limit", "too many requests"]
      },
      models: [
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", type: "paid" },
        { id: "claude-haiku-4-20250514", name: "Claude Haiku 4", type: "paid" }
      ]
    },
    {
      id: "gemini-cli",
      name: "Gemini CLI",
      type: "free",
      detection: {
        binary: "gemini",
        versionFlag: "--version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)"
      },
      exec: {
        template: "{binary} -p {task}",
        shell: false,
        modelFlag: "--model"
      },
      auth: { envVar: "GEMINI_API_KEY" },
      install: { command: "npm install -g @google/gemini-cli" },
      quota: {
        exitCodes: [1],
        errorPatterns: ["quota exhausted", "rate limit", "daily limit"]
      },
      models: [
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", type: "free" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", type: "free" }
      ]
    },
    {
      id: "codex-cli",
      name: "Codex CLI",
      type: "paid",
      detection: {
        binary: "codex",
        versionFlag: "--version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)"
      },
      exec: {
        template: "{binary} {task}",
        shell: false,
        modelFlag: "--model"
      },
      auth: { envVar: "OPENAI_API_KEY" },
      install: { command: "npm install -g @openai/codex-cli" },
      quota: {
        exitCodes: [1],
        errorPatterns: ["quota exhausted", "insufficient credits"]
      },
      models: [
        { id: "o4-mini", name: "o4-mini", type: "paid" },
        { id: "o3", name: "o3", type: "paid" }
      ]
    },
    {
      id: "cursor-cli",
      name: "Cursor CLI",
      type: "paid",
      detection: {
        binary: "cursor-agent",
        versionFlag: "--version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)"
      },
      exec: {
        template: "{binary} {task}",
        shell: false
      },
      auth: { envVar: "CURSOR_API_KEY" },
      install: { command: "npm install -g cursor" },
      quota: {
        exitCodes: [1],
        errorPatterns: ["quota", "limit exceeded"]
      },
      models: [{ id: "cursor-default", name: "Default", type: "paid" }]
    },
    {
      id: "opencode",
      name: "OpenCode",
      type: "free",
      detection: {
        binary: "opencode",
        versionFlag: "--version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)"
      },
      exec: {
        template: "{binary} run {task}",
        shell: false
      },
      auth: { envVar: null },
      install: { command: "npm install -g opencode-ai" },
      quota: {
        exitCodes: [],
        errorPatterns: []
      },
      models: []
    }
  ]
}
