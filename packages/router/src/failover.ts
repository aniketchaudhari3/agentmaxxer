import { RoutingEngine } from "./router.js"
import { ExecutionEngine, type ExecutionResult, type ExecutionOptions } from "./engine.js"
import { QuotaEngine } from "./quota.js"
import type { FailoverEvent } from "@agentmaxxer/types"

export class FailoverEngine {
  private failoverEvents: FailoverEvent[] = []
  private usedProviders = new Set<string>()

  constructor(
    private routing: RoutingEngine,
    private execution: ExecutionEngine,
    private quota: QuotaEngine
  ) {}

  async executeWithFailover(
    task: string,
    execOptions: ExecutionOptions & { onSwitch?: (id: string) => void } = {}
  ): Promise<{
    result: ExecutionResult
    failovers: FailoverEvent[]
    finalProvider: string
  }> {
    while (true) {
      const { adapter, reason } = await this.routing.selectProvider(
        [...this.usedProviders]
      )
      this.usedProviders.add(adapter.meta.id)
      execOptions.onSwitch?.(adapter.meta.id)

      const result = await this.execution.execute(adapter, task, execOptions)

      if (result.success) {
        return {
          result,
          failovers: [...this.failoverEvents],
          finalProvider: adapter.meta.id
        }
      }

      const assessment = this.quota.assess(
        adapter.meta,
        new Error(result.output),
        null
      )

      if (assessment.exhausted) {
        this.failoverEvents.push({
          from: adapter.meta.id,
          to: "(next)",
          reason: assessment.reason ?? "Quota exhausted",
          timestamp: Date.now()
        })

        if (this.usedProviders.size >= (await this.getAvailableCount())) {
          return {
            result,
            failovers: [...this.failoverEvents],
            finalProvider: adapter.meta.id
          }
        }

        continue
      }

      return {
        result,
        failovers: [...this.failoverEvents],
        finalProvider: adapter.meta.id
      }
    }
  }

  getFailoverHistory(): FailoverEvent[] {
    return [...this.failoverEvents]
  }

  private async getAvailableCount(): Promise<number> {
    const available = await this.routing.getAvailableProviders()
    return available.length
  }
}
