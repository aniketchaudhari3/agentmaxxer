import { RegistryClient } from "@agentmaxxer/registry"
import { DetectionEngine } from "@agentmaxxer/providers"
import { RoutingEngine, ExecutionEngine, QuotaEngine, FailoverEngine, TaskHandoff } from "@agentmaxxer/router"
import { HealthStore, UsageStore } from "@agentmaxxer/tracking"
import { loadConfig } from "@agentmaxxer/config"

interface RunOptions {
  provider?: string
  timeout?: string
  cwd?: string
  failover?: boolean
}

function printAgentHeader(id: string) {
  process.stderr.write(`[agent: ${id}] Thinking...\n`)
}

export default async function runCommand(task: string, options: RunOptions): Promise<void> {
  const config = loadConfig()
  const client = new RegistryClient(config.registry.url)
  const detection = new DetectionEngine(client)
  const healthStore = new HealthStore(config.storage.dbPath)
  const usageStore = new UsageStore(config.storage.dbPath)
  const routing = new RoutingEngine(detection, client, healthStore)
  const execution = new ExecutionEngine()
  const quota = new QuotaEngine()
  const failover = new FailoverEngine(routing, execution, quota)
  const handoff = new TaskHandoff(task, options.cwd)

  const timeout = options.timeout ? parseInt(options.timeout, 10) : 300_000

  const onEvent = (e: { type: string; content?: string }) => {
    if (e.type === "text_delta" && e.content) process.stdout.write(e.content)
  }

  const recordUsage = (providerId: string, result: { success: boolean; output: string; duration: number }) => {
    usageStore.recordRequest(providerId)
    usageStore.recordTokens(providerId, Math.ceil(result.output.length / 4))
    if (result.success) healthStore.recordSuccess(providerId, result.duration)
    else healthStore.recordFailure(providerId, result.duration)
  }

  if (options.provider) {
    const allProviders = await client.fetchProviders()
    const provMeta = allProviders.find(p => p.id === options.provider || p.detection.binary === options.provider)
    if (!provMeta) {
      process.stderr.write(`Agent "${options.provider}" not found. Run \`amx agents\` to see available agents.\n`)
      return
    }
    printAgentHeader(provMeta.id)
    const adapter = new (await import("@agentmaxxer/providers")).GenericAdapter(provMeta)
    const result = await execution.execute(adapter, task, { timeout, onEvent })
    handoff.recordExecution(options.provider, result)
    recordUsage(options.provider, result)
    return
  }

  if (options.failover === false) {
    const { adapter } = await routing.selectProvider()
    printAgentHeader(adapter.meta.id)
    const result = await execution.execute(adapter, task, { timeout, onEvent })
    handoff.recordExecution(adapter.meta.id, result)
    recordUsage(adapter.meta.id, result)
    return
  }

  const { result, failovers: events, finalProvider } = await failover.executeWithFailover(task, {
    timeout,
    onEvent,
    onSwitch: (id) => printAgentHeader(id),
  })

  handoff.recordExecution(finalProvider, result)
  recordUsage(finalProvider, result)
  for (const ev of events) {
    usageStore.recordFailover(ev.from, ev.to)
  }
}
