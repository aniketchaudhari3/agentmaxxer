import type { FastifyInstance } from "fastify"
import type { RegistryClient } from "@agentmaxxer/registry"
import type { DetectionEngine } from "@agentmaxxer/providers"
import { execSync } from "node:child_process"

const SAFE_INSTALL_BINS = ["npm", "npx", "yarn", "pnpm", "bun", "brew"]
const SHELL_METACHARS = /[;&|$`><()\n]/

function assertSafeInstallCommand(command: string): void {
  if (!command || SHELL_METACHARS.test(command)) {
    throw new Error("Refusing to run install command containing shell metacharacters")
  }
  const bin = command.split(" ")[0]
  if (!SAFE_INSTALL_BINS.includes(bin)) {
    throw new Error(`Refusing to run install command starting with "${bin}"`)
  }
}

export async function providerRoutes(
  app: FastifyInstance,
  opts: { registry: RegistryClient; detection: DetectionEngine }
): Promise<void> {
  app.get("/providers", async () => {
    const providers = await opts.registry.fetchProviders()
    const detected = await opts.detection.detectAll()
    return {
      providers: providers.map(p => ({
        ...p,
        status: detected.find(d => d.id === p.id) ?? null,
      })),
    }
  })

  app.get("/providers/:id", async (request) => {
    const { id } = request.params as { id: string }
    const provider = await opts.registry.fetchProvider(id)
    if (!provider) return { error: "Not found" }
    const detected = await opts.detection.detectAll()
    return {
      ...provider,
      status: detected.find(d => d.id === id) ?? null,
    }
  })

  app.get("/providers/:id/models", async (request) => {
    const { id } = request.params as { id: string }
    const provider = await opts.registry.fetchProvider(id)
    if (!provider) return { error: "Not found" }
    return { models: provider.models ?? [] }
  })

  app.post("/providers/:id/install", async (request, reply) => {
    const { id } = request.params as { id: string }
    const provider = await opts.registry.fetchProvider(id)
    if (!provider) { reply.code(404).send({ error: "Not found" }); return }

    const detected = await opts.detection.detectAll()
    const installed = detected.find(d => d.id === id)?.installed
    if (installed) {
      reply.code(409).send({ success: false, message: `${provider.name} is already installed` })
      return
    }

    try {
      assertSafeInstallCommand(provider.install.command)
      const output = execSync(provider.install.command, { timeout: 120000, encoding: "utf-8" })
      reply.send({ success: true, command: provider.install.command, output })
    } catch (err) {
      reply.code(500).send({
        success: false,
        command: provider.install.command,
        output: (err as Error).message,
      })
    }
  })
}
