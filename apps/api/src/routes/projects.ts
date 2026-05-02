import type { FastifyInstance } from "fastify"
import type { ProjectStore, SessionStore } from "@agentmaxxer/tracking"

export async function projectRoutes(
  app: FastifyInstance,
  opts: { projects: ProjectStore; sessions: SessionStore }
): Promise<void> {
  app.get("/projects", async () => {
    return { projects: opts.projects.listProjects() }
  })

  app.post("/projects", async (request, reply) => {
    const { name, path } = request.body as { name: string; path: string }
    if (!name || !path) {
      reply.code(400).send({ error: "name and path are required" })
      return
    }
    const existing = opts.projects.getProjectByPath(path)
    if (existing) {
      reply.code(409).send({ error: "Project already exists at this path", project: existing })
      return
    }
    const project = opts.projects.createProject(name, path)
    reply.code(201).send(project)
  })

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const project = opts.projects.getProject(id)
    if (!project) { reply.code(404).send({ error: "Not found" }); return }
    return project
  })

  app.delete("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const project = opts.projects.getProject(id)
    if (!project) { reply.code(404).send({ error: "Not found" }); return }
    opts.projects.deleteProject(id)
    reply.code(204).send()
  })

  app.get("/projects/:id/sessions", async (request, reply) => {
    const { id } = request.params as { id: string }
    const project = opts.projects.getProject(id)
    if (!project) { reply.code(404).send({ error: "Not found" }); return }
    return { sessions: opts.sessions.listByProject(id) }
  })
}
