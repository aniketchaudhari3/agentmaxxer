import type { FastifyInstance } from "fastify"
import type { UsageStore } from "@agentmaxxer/tracking"

export async function usageRoutes(app: FastifyInstance, opts: { usage: UsageStore }): Promise<void> {
  app.get("/usage", async () => {
    const daily = opts.usage.getDailySummary()
    return daily ?? { message: "No usage data yet" }
  })

  app.get("/usage/total", async () => {
    return opts.usage.getTotalUsage()
  })
}
