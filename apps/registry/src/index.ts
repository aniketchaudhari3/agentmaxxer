import Fastify from "fastify"
import cors from "@fastify/cors"
import { providerRoutes } from "./routes/providers.js"

const PORT = parseInt(process.env.PORT ?? "4100", 10)

async function main() {
  const app = Fastify({ logger: true })

  await app.register(cors)

  app.get("/health", async () => ({ status: "ok" }))

  await app.register(providerRoutes)

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" })
    console.log(`Registry server running on http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
