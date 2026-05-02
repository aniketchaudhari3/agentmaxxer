import { GenericAdapter } from "@agentmaxxer/providers"
import type { RegistryClient } from "@agentmaxxer/registry"
import { DetectionEngine } from "@agentmaxxer/providers"
import type { RegistryProvider } from "@agentmaxxer/types"
import type { RoutingStrategy } from "@agentmaxxer/config"

export class RoutingEngine {
  private strategy: RoutingStrategy
  private roundRobinIndex = 0

  constructor(
    readonly detection: DetectionEngine,
    readonly registryClient: RegistryClient,
    private healthStore?: { isHealthy(id: string): boolean },
    strategy?: RoutingStrategy
  ) {
    this.strategy = strategy ?? "paid-first"
  }

  async selectProvider(exclude: string[] = []): Promise<{ adapter: GenericAdapter; reason: string }> {
    const available = await this.getAvailable(exclude)
    if (available.length === 0) throw new Error("No provider available")

    switch (this.strategy) {
      case "paid-first": return this.selectPaidFirst(available)
      case "free-first": return this.selectFreeFirst(available)
      case "round-robin": return this.selectRoundRobin(available)
    }
  }

  async getAvailableProviders(): Promise<RegistryProvider[]> {
    const providers = await this.registryClient.fetchProviders()
    const detected = await this.detection.detectAll()
    return providers.filter(p => detected.find(d => d.id === p.id)?.installed)
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy
  }

  getStrategy(): RoutingStrategy {
    return this.strategy
  }

  private async getAvailable(exclude: string[]): Promise<Array<{ provider: RegistryProvider; status: { installed: boolean; auth: boolean } }>> {
    const providers = await this.registryClient.fetchProviders()
    const detected = await this.detection.detectAll()

    return providers
      .map(p => ({
        provider: p,
        status: detected.find(d => d.id === p.id)
      }))
      .filter((x): x is { provider: RegistryProvider; status: { id: string; name: string; installed: boolean; path?: string; version?: string; type: "paid" | "free"; auth: boolean } } =>
        x.status !== undefined && x.status.installed && !exclude.includes(x.provider.id))
      .filter(x => !this.healthStore || this.healthStore.isHealthy(x.provider.id))
  }

  private selectPaidFirst(available: Array<{ provider: RegistryProvider; status: { auth: boolean } }>): { adapter: GenericAdapter; reason: string } {
    const paid = available.filter(x => x.provider.type === "paid")
    const paidAuth = paid.filter(x => x.status.auth)
    if (paidAuth.length > 0) {
      return {
        adapter: new GenericAdapter(paidAuth[0].provider),
        reason: `Paid provider ${paidAuth[0].provider.name} (configured)`
      }
    }
    if (paid.length > 0) {
      return {
        adapter: new GenericAdapter(paid[0].provider),
        reason: `Paid provider ${paid[0].provider.name} (no auth)`
      }
    }
    const free = available.filter(x => x.provider.type === "free")
    if (free.length > 0) {
      return {
        adapter: new GenericAdapter(free[0].provider),
        reason: `Free provider ${free[0].provider.name}`
      }
    }
    throw new Error("No provider available")
  }

  private selectFreeFirst(available: Array<{ provider: RegistryProvider; status: { auth: boolean } }>): { adapter: GenericAdapter; reason: string } {
    const freeAuth = available.filter(x => x.provider.type === "free" && x.status.auth)
    if (freeAuth.length > 0) {
      return {
        adapter: new GenericAdapter(freeAuth[0].provider),
        reason: `Free provider ${freeAuth[0].provider.name} (configured)`
      }
    }
    const free = available.filter(x => x.provider.type === "free")
    if (free.length > 0) {
      return {
        adapter: new GenericAdapter(free[0].provider),
        reason: `Free provider ${free[0].provider.name}`
      }
    }
    const paid = available.filter(x => x.provider.type === "paid")
    const paidAuth = paid.filter(x => x.status.auth)
    if (paidAuth.length > 0) {
      return {
        adapter: new GenericAdapter(paidAuth[0].provider),
        reason: `Paid provider ${paidAuth[0].provider.name} (configured)`
      }
    }
    if (paid.length > 0) {
      return {
        adapter: new GenericAdapter(paid[0].provider),
        reason: `Paid provider ${paid[0].provider.name} (no auth)`
      }
    }
    throw new Error("No provider available")
  }

  private selectRoundRobin(available: Array<{ provider: RegistryProvider; status: { auth: boolean } }>): { adapter: GenericAdapter; reason: string } {
    const idx = this.roundRobinIndex % available.length
    this.roundRobinIndex = (idx + 1) % available.length
    const chosen = available[idx]
    return {
      adapter: new GenericAdapter(chosen.provider),
      reason: `Round-robin: ${chosen.provider.name}`
    }
  }
}
