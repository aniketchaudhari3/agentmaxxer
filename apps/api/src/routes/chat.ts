import type { FastifyInstance } from "fastify"
import type { RoutingEngine, ExecutionEngine } from "@agentmaxxer/router"
import type { SessionStore } from "@agentmaxxer/tracking"
import type { MessageBus } from "@agentmaxxer/core"
import type { WsTransport } from "../gateway/ws.js"
import { GenericAdapter, getPlugin } from "@agentmaxxer/providers"
import type { ProviderPlugin } from "@agentmaxxer/providers"
import type { AgentEvent } from "@agentmaxxer/types"
import type { AgentOutput } from "@agentmaxxer/schemas"

interface ChatRequest {
  model?: string
  messages?: Array<{ role: string; content: string }>
  stream?: boolean
  mode?: "auto" | "free" | "paid"
  sessionId?: string
  lastSequence?: number
}

function agentOutputToEvent(output: AgentOutput): AgentEvent {
  const base = {
    id: output.id,
    provider: output.provider,
    sequence: output.seq,
    timestamp: new Date(output.ts).getTime(),
    metadata: undefined,
  }
  switch (output.type) {
    case "text.chunk":
      return { ...base, type: "text_delta", content: output.text }
    case "text.complete":
      return { ...base, type: "text_delta", content: output.text }
    case "tool.invoke":
      return {
        ...base, type: "tool_use", content: "",
        toolUse: { name: output.name, input: output.args, callId: output.id },
      }
    case "tool.result":
      return {
        ...base, type: "tool_result", content: "",
        toolResult: { callId: output.id, output: output.output, isError: output.failed },
      }
    case "turn.finished":
      return { ...base, type: "done", content: "" }
    case "output.error":
      return { ...base, type: "error", content: output.message }
    default:
      return { ...base, type: "text_delta", content: "" }
  }
}

export async function chatRoutes(
  app: FastifyInstance,
  opts: {
    routing: RoutingEngine
    execution: ExecutionEngine
    sessions?: SessionStore
    bus?: MessageBus
    ws?: WsTransport
  }
): Promise<void> {
  app.post("/v1/chat/completions", async (request, reply) => {
    const { messages, stream, mode, model, sessionId, lastSequence } = request.body as ChatRequest
    const task = messages?.map(m => m.content).join("\n") ?? ""

    let activeSessionId = sessionId

    if (activeSessionId && opts.sessions) {
      const existing = opts.sessions.getSession(activeSessionId)
      if (!existing) {
        activeSessionId = undefined
      }
    }

    if (!activeSessionId && opts.sessions && task) {
      const session = opts.sessions.createSession(undefined, undefined, undefined)
      activeSessionId = session.id
      if (task.length > 60) {
        opts.sessions.setSessionTitle(session.id, task.slice(0, 60))
      }
    }

    let adapter: GenericAdapter
    let plugin: ProviderPlugin | null = null
    let usePlugin = false

    if (model) {
      const providers = await opts.routing.registryClient.fetchProviders()
      const detected = await opts.routing.detection.detectAll()
      const provider = providers.find((p: { id: string }) => p.id === model)
      if (!provider) {
        reply.code(400).send({ error: `Unknown provider: ${model}` })
        return
      }
      const detectedProvider = detected.find((d: { id: string }) => d.id === model)
      if (!detectedProvider?.installed) {
        reply.code(400).send({ error: `Provider ${model} is not installed` })
        return
      }
      try {
        const pluginResult = getPlugin(provider as any)
        plugin = pluginResult
        usePlugin = true
      } catch {
        adapter = new GenericAdapter(provider)
      }
    } else {
      if (mode) {
        const strategyMap: Record<string, "paid-first" | "free-first" | "round-robin"> = {
          auto: "paid-first",
          free: "free-first",
          paid: "paid-first",
        }
        opts.routing.setStrategy(strategyMap[mode] ?? "paid-first")
      }
      const result = await opts.routing.selectProvider()
      adapter = result.adapter
    }

    if (stream) {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      })

      const ac = new AbortController()
      request.raw.on("close", () => ac.abort())

      let seq = opts.sessions ? opts.sessions.getLastSequence(activeSessionId!) : 0

      if (usePlugin && plugin && activeSessionId) {
        try {
          await plugin.open({ threadId: activeSessionId, provider: plugin.meta })
        } catch { /* ignore */ }
        const gen = plugin.submit({ threadId: activeSessionId, task, signal: ac.signal })
        for await (const output of gen) {
          seq++
          const event = agentOutputToEvent(output)
          event.sequence = seq
          if (opts.bus) {
            opts.bus.broadcast("session.event", activeSessionId, event)
          }
          if (opts.sessions) opts.sessions.appendEvent(activeSessionId!, event)
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
        }
        await plugin.close(activeSessionId)
        reply.raw.write(`data: ${JSON.stringify({ type: "done", sessionId: activeSessionId })}\n\n`)
        reply.raw.write("data: [DONE]\n\n")
        reply.raw.end()
        return
      }

      if (activeSessionId && !lastSequence && opts.sessions) {
        const existingEvents = opts.sessions.getEvents(activeSessionId)
        const context = existingEvents
          .filter(e => e.type === "text_delta")
          .map(e => e.content)
          .join("")
          .slice(-4000)
        if (context) {
          const contextTask = `[Context from previous turn]\n${context}\n\n[Continue]\n${task}`
          const gen = adapter!.execute(contextTask, ac.signal, activeSessionId)
          for await (const event of gen) {
            seq++
            event.sequence = seq
            if (opts.sessions) opts.sessions.appendEvent(activeSessionId!, event)
            opts.bus?.broadcast("session.event", activeSessionId!, event)
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
          }
          reply.raw.write(`data: ${JSON.stringify({ type: "done", sessionId: activeSessionId })}\n\n`)
          reply.raw.write("data: [DONE]\n\n")
          reply.raw.end()
          return
        }
      }

      if (activeSessionId && lastSequence !== undefined && opts.sessions) {
        const existingEvents = opts.sessions.getEvents(activeSessionId, lastSequence)
        for (const event of existingEvents) {
          opts.bus?.broadcast("session.event", activeSessionId, event)
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
        }
        const lastEvent = existingEvents[existingEvents.length - 1]
        if (lastEvent?.type === "done") {
          reply.raw.write(`data: ${JSON.stringify({ type: "done", sessionId: activeSessionId })}\n\n`)
          reply.raw.write("data: [DONE]\n\n")
          reply.raw.end()
          return
        }
        seq = opts.sessions.getLastSequence(activeSessionId)
      }

      const gen = adapter!.execute(task, ac.signal, activeSessionId)
      for await (const event of gen) {
        seq++
        event.sequence = seq
        if (opts.sessions) opts.sessions.appendEvent(activeSessionId!, event)
        opts.bus?.broadcast("session.event", activeSessionId!, event)
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
      }

      if (messages?.[0]?.content && opts.sessions) {
        const existingMessages = opts.sessions.getMessages(activeSessionId!)
        const hasUserMsg = existingMessages.some(m => m.role === "user" && m.content === messages[0].content)
        if (!hasUserMsg) {
          opts.sessions.addMessage(activeSessionId!, "user", messages[0].content)
        }
      }

      reply.raw.write(`data: ${JSON.stringify({ type: "done", sessionId: activeSessionId })}\n\n`)
      reply.raw.write("data: [DONE]\n\n")
      reply.raw.end()
      return
    }

    const result = await opts.execution.execute(adapter!, task)

    if (activeSessionId && opts.sessions) {
      if (messages?.[0]?.content) {
        opts.sessions.addMessage(activeSessionId, "user", messages[0].content)
      }
      const textEvents = result.events.filter(e => e.type === "text_delta")
      const output = textEvents.map(e => e.content).join("")
      opts.sessions.addMessage(activeSessionId, "assistant", output)
    }

    const textEvents = result.events.filter(e => e.type === "text_delta")
    const output = textEvents.map(e => e.content).join("")

    return {
      id: "amx-" + Date.now(),
      object: "chat.completion",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: output,
        },
        finish_reason: result.success ? "stop" : "error",
      }],
      sessionId: activeSessionId ?? null,
      usage: {
        prompt_tokens: Math.ceil(task.length / 4),
        completion_tokens: Math.ceil(output.length / 4),
        total_tokens: Math.ceil((task.length + output.length) / 4),
      },
    }
  })
}
