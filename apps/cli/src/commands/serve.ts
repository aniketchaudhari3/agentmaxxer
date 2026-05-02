import { loadConfig } from "@agentmaxxer/config"
import { colors } from "../display/colors.js"

export default async function serveCommand(options: { port?: string }): Promise<void> {
  const config = loadConfig()
  const port = options.port ? parseInt(options.port, 10) : config.server.port

  console.log(colors.bold(`\n  Starting AgentMaxxer API server on port ${port}...\n`))

  const { createServer } = await import("@agentmaxxer/api")
  await createServer(port)
}
