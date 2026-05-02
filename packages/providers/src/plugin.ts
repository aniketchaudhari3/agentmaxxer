import type { RegistryProvider } from "@agentmaxxer/types"
import type { AgentOutput } from "@agentmaxxer/schemas"

export interface SessionHandle {
  pid: number | null
  provider: string
  threadId: string
}

export interface OpenSessionInput {
  threadId: string
  provider: RegistryProvider
  modelId?: string
}

export interface SubmitInput {
  threadId: string
  task: string
  signal?: AbortSignal
}

export interface ProviderPlugin {
  readonly meta: RegistryProvider

  open(input: OpenSessionInput): Promise<SessionHandle>

  attach(handle: SessionHandle): void

  submit(input: SubmitInput): AsyncGenerator<AgentOutput>

  halt(threadId: string): Promise<void>

  close(threadId: string): Promise<void>
}
