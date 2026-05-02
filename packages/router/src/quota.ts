import type { RegistryProvider } from "@agentmaxxer/types"

export interface QuotaAssessment {
  exhausted: boolean
  reason: string | null
  provider: string
}

export class QuotaEngine {
  assess(provider: RegistryProvider, error: Error, exitCode: number | null): QuotaAssessment {
    if (exitCode !== null && provider.quota.exitCodes.includes(exitCode)) {
      return {
        exhausted: true,
        reason: `Exit code ${exitCode} (quota signal)`,
        provider: provider.id
      }
    }

    const matchedPattern = provider.quota.errorPatterns.find(
      pattern => error.message.toLowerCase().includes(pattern.toLowerCase())
    )
    if (matchedPattern) {
      return {
        exhausted: true,
        reason: `Quota pattern matched: "${matchedPattern}"`,
        provider: provider.id
      }
    }

    return {
      exhausted: false,
      reason: null,
      provider: provider.id
    }
  }
}
