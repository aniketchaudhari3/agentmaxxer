export interface DetectionResult {
  id: string
  name: string
  installed: boolean
  path?: string
  version?: string
  type: "paid" | "free"
  auth: boolean
}

export type AgentEventType =
  | "text_delta"
  | "tool_use"
  | "tool_result"
  | "reasoning"
  | "error"
  | "done"

export interface ToolUsePayload {
  name: string
  input: unknown
  callId: string
}

export interface ToolResultPayload {
  callId: string
  output: string
  isError?: boolean
}

export interface AgentEvent {
  id: string
  type: AgentEventType
  content: string
  toolUse?: ToolUsePayload
  toolResult?: ToolResultPayload
  provider: string
  model?: string
  sequence: number
  timestamp: number
  metadata?: {
    tokens?: number
    durationMs?: number
  }
}

export interface RegistryProvider {
  id: string
  name: string
  type: "paid" | "free"
  detection: {
    binary: string
    versionFlag: string
    versionRegex: string
  }
  exec: {
    template: string
    shell: boolean
    modelFlag?: string
  }
  auth: {
    envVar: string | null
  }
  install: {
    command: string
  }
  quota: {
    exitCodes: number[]
    errorPatterns: string[]
  }
  models?: Array<{
    id: string
    name: string
    type: "paid" | "free"
  }>
}

export interface HealthRecord {
  providerId: string
  successCount: number
  failureCount: number
  totalLatencyMs: number
  lastSuccessAt: number | null
  lastFailureAt: number | null
}

export interface UsageRecord {
  providerId: string
  date: string
  requests: number
  failoversFrom: number
  failoversTo: number
  estimatedTokens: number
}

export interface FailoverEvent {
  from: string
  to: string
  reason: string
  timestamp: number
}
