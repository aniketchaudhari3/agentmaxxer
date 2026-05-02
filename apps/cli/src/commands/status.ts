import { RegistryClient } from "@agentmaxxer/registry"
import { DetectionEngine } from "@agentmaxxer/providers"
import { HealthStore, UsageStore } from "@agentmaxxer/tracking"
import { loadConfig } from "@agentmaxxer/config"
import { renderTable } from "../display/table.js"
import { colors } from "../display/colors.js"

export default async function statusCommand(): Promise<void> {
  const config = loadConfig()
  const client = new RegistryClient(config.registry.url)
  const detection = new DetectionEngine(client)
  const health = new HealthStore()
  const usage = new UsageStore()

  const providers = await detection.detectAll()
  const allHealth = health.getAllHealth()
  const daily = usage.getDailySummary()

  console.log(colors.bold("\n  AgentMaxxer Status\n"))

  const rows = providers.map(p => {
    const h = allHealth[p.id]
    const healthStatus = h
      ? `${h.successCount}s/${h.failureCount}f`
      : colors.dim("no data")
    return [
      p.name,
      p.installed ? colors.green("✓") : colors.red("✗"),
      p.version ?? "-",
      p.auth ? colors.green("key") : colors.yellow("no-key"),
      healthStatus
    ]
  })

  console.log(renderTable(
    ["Provider", "", "Version", "Auth", "Health"],
    rows
  ))

  if (daily) {
    console.log(`\n  Today: ${daily.totalRequests} requests, ${daily.totalFailovers} failovers, ~${daily.totalTokens} tokens`)
  }
}
