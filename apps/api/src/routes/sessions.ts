import type { FastifyInstance } from "fastify"
import type { SessionStore, SessionRegistry } from "@agentmaxxer/tracking"

export async function sessionRoutes(
  app: FastifyInstance,
  opts: { sessions: SessionStore; sessionRegistry: SessionRegistry }
): Promise<void> {
  app.get("/sessions", async (request) => {
    const query = request.query as { global?: string }
    if (query.global === "true") {
      const sessions = opts.sessions.listSessions()
      return { sessions }
    }
    return { sessions: [] }
  })

  app.post("/sessions", async (request, reply) => {
    const { projectId, provider, mode } = request.body as { projectId?: string; provider?: string; mode?: string }
    const session = opts.sessions.createSession(provider, mode, projectId)
    if (provider) {
      opts.sessionRegistry.create(session.id, provider, (mode as "full" | "supervised") ?? "full")
    }
    reply.code(201).send(session)
  })

  app.get("/sessions/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = opts.sessions.getSession(id)
    if (!session) { reply.code(404).send({ error: "Not found" }); return }
    const events = opts.sessions.getEvents(id)
    const messages = opts.sessions.getMessages(id)
    const resumeBinding = opts.sessionRegistry.get(id)
    const lastEvent = events[events.length - 1]
    const hasMore = lastEvent ? lastEvent.type !== "done" : false
    return {
      session,
      events,
      messages,
      resume: resumeBinding,
      hasMore,
    }
  })

  app.delete("/sessions/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = opts.sessions.getSession(id)
    if (!session) { reply.code(404).send({ error: "Not found" }); return }
    opts.sessions.deleteSession(id)
    opts.sessionRegistry.delete(id)
    reply.code(204).send()
  })
}