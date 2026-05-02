import { RegistryClient } from "@agentmaxxer/registry"
import { GenericAdapter } from "@agentmaxxer/providers"
import { loadConfig } from "@agentmaxxer/config"
import { colors } from "../display/colors.js"

export default async function installCommand(providerId: string): Promise<void> {
  const config = loadConfig()
  const client = new RegistryClient(config.registry.url)
  const provider = await client.fetchProvider(providerId)

  if (!provider) {
    console.error(colors.red(`✗ Unknown provider: ${providerId}`))
    console.error(`  Available: ${(await client.fetchProviders()).map(p => p.id).join(", ")}`)
    process.exit(1)
  }

  console.log(`  Installing ${colors.bold(provider.name)}...`)
  console.log(`  ${colors.dim(provider.install.command)}\n`)

  const adapter = new GenericAdapter(provider)
  await adapter.install()

  console.log(`\n${colors.green("✓ Installed")} ${provider.name}`)
}
