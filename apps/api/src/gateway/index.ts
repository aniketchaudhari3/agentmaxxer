import type { Server } from "node:http"
import { MessageBus } from "@agentmaxxer/core"
import { WsTransport } from "./ws.js"

export { WsTransport } from "./ws.js"

export function createGateway(httpServer: Server): { bus: MessageBus; ws: WsTransport } {
  const bus = new MessageBus()
  const ws = new WsTransport(httpServer, bus)
  return { bus, ws }
}
