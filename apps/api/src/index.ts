import Fastify from "fastify"
import cors from "@fastify/cors"
import { RegistryClient } from "@agentmaxxer/registry"
import { DetectionEngine } from "@agentmaxxer/providers"
import { RoutingEngine, ExecutionEngine } from "@agentmaxxer/router"
import { HealthStore, UsageStore, SessionStore, ProjectStore, SessionRegistry } from "@agentmaxxer/tracking"
import { MessageBus } from "@agentmaxxer/core"
import { loadConfig } from "@agentmaxxer/config"
import { localOnly } from "./middleware/auth.js"
import { healthRoutes } from "./routes/health.js"
import { providerRoutes } from "./routes/providers.js"
import { usageRoutes } from "./routes/usage.js"
import { chatRoutes } from "./routes/chat.js"
import { projectRoutes } from "./routes/projects.js"
import { sessionRoutes } from "./routes/sessions.js"
import { createGateway } from "./gateway/index.js"

export async function createServer(port?: number): Promise<void> {
  const config = loadConfig()
  const client = new RegistryClient(config.registry.url)
  const detection = new DetectionEngine(client)
  const health = new HealthStore()
  const usage = new UsageStore()
  const sessions = new SessionStore()
  const projects = new ProjectStore()
  const sessionRegistry = new SessionRegistry()
  const routing = new RoutingEngine(detection, client, health)
  const execution = new ExecutionEngine()

  const app = Fastify({ logger: true, forceCloseConnections: true })
  await app.register(cors)
  app.addHook("onRequest", localOnly)

  const { bus, ws } = createGateway(app.server)

  await app.register(async (instance) => {
    await healthRoutes(instance, { health })
    await providerRoutes(instance, { registry: client, detection })
    await usageRoutes(instance, { usage })
    await chatRoutes(instance, { routing, execution, sessions, bus, ws })
    await projectRoutes(instance, { projects, sessions })
    await sessionRoutes(instance, { sessions, sessionRegistry })
  })

  const p = port ?? config.server.port
  await app.listen({ port: p, host: "127.0.0.1" })
  console.log(`AgentMaxxer API running on http://127.0.0.1:${p}`)
  console.log(`WebSocket gateway on ws://127.0.0.1:${p}/ws`)

  return { app, bus, ws, sessionRegistry } as any
}