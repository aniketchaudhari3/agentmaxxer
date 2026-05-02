import type { FastifyInstance } from "fastify"
import type { HealthStore } from "@agentmaxxer/tracking"

export async function healthRoutes(app: FastifyInstance, opts: { health: HealthStore }): Promise<void> {
  app.get("/health", async () => {
    const allHealth = opts.health.getAllHealth()
    return {
      status: "ok",
      providers: Object.fromEntries(
        Object.entries(allHealth).map(([id, h]) => [
          id,
          {
            successCount: h.successCount,
            failureCount: h.failureCount,
            healthy: !(h.failureCount > 3)
          }
        ])
      )
    }
  })
}
