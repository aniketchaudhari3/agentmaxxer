export type {
  AgentEvent,
  AgentEventType,
  ToolUsePayload,
  ToolResultPayload,
} from "@agentmaxxer/types"

export interface ProviderStatus {
  id: string
  name: string
  installed: boolean
  version?: string
  type: "paid" | "free"
  auth: boolean
  healthy: boolean
  models?: Array<{ id: string; name: string; type: string }>
}

export interface Project {
  id: string
  name: string
  path: string
  createdAt: number
  updatedAt: number
}

export interface Session {
  id: string
  createdAt: string
  updatedAt: string
  provider: string | null
  mode: string | null
  taskCount: number
  totalTokens: number
  projectId: string | null
  title: string | null
}

export interface DailySummary {
  date: string
  totalRequests: number
  totalFailovers: number
  totalTokens: number
  totalSavingsCents: number
}

export interface ProviderStat {
  requests: number
  failovers: number
  tokens: number
}