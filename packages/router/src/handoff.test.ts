import { describe, it, expect } from "vitest"
import { TaskHandoff } from "./handoff.js"
import type { ExecutionResult } from "@agentmaxxer/types"

describe("TaskHandoff", () => {
  it("records execution history", () => {
    const handoff = new TaskHandoff("build a react app")
    const result: ExecutionResult = {
      success: true,
      output: "created App.tsx",
      events: [{ type: "stdout", data: "created App.tsx", timestamp: 1000 }],
      duration: 100
    }

    handoff.recordExecution("claude-code", result)
    const context = handoff.getContext()
    expect(context.executionHistory).toHaveLength(1)
    expect(context.executionHistory[0].provider).toBe("claude-code")
    expect(context.executionHistory[0].output).toBe("created App.tsx")
  })

  it("generates continuation prompt with context", () => {
    const handoff = new TaskHandoff("write a parser")
    const result: ExecutionResult = {
      success: false,
      output: "created parser.ts, modified types.ts",
      events: [],
      duration: 100
    }

    handoff.recordExecution("claude-code", result)
    const prompt = handoff.generateContinuationPrompt()

    expect(prompt).toContain("write a parser")
    expect(prompt).toContain("claude-code")
    expect(prompt).toContain("Continue the above task")
  })

  it("extracts file changes from output", () => {
    const handoff = new TaskHandoff("test")
    const result: ExecutionResult = {
      success: true,
      output: "created: src/index.ts\nmodified: src/types.ts\nupdated: README.md",
      events: [],
      duration: 100
    }

    handoff.recordExecution("test-cli", result)
    const context = handoff.getContext()
    expect(context.fileChanges).toHaveLength(3)
    expect(context.fileChanges[0]).toContain("src/index.ts")
  })

  it("stores original task", () => {
    const handoff = new TaskHandoff("refactor the codebase")
    expect(handoff.getContext().originalTask).toBe("refactor the codebase")
  })
})
