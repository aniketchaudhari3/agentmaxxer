import { FastifyInstance } from "fastify"
import providersData from "../data/providers.json" with { type: "json" }

export async function providerRoutes(app: FastifyInstance) {
  app.get("/providers", async () => providersData)

  app.get<{ Params: { id: string } }>("/providers/:id", async (request, reply) => {
    const provider = providersData.providers.find(
      (p: { id: string }) => p.id === request.params.id
    )
    if (!provider) {
      reply.code(404)
      return { error: "Provider not found" }
    }
    return provider
  })
}
