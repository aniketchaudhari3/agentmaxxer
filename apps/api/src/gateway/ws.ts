import { WebSocketServer, WebSocket } from "ws"
import type { IncomingMessage } from "node:http"
import type { Server } from "node:http"
import { MessageBus, Channels } from "@agentmaxxer/core"
import type { BusFrame, Channel } from "@agentmaxxer/core"

interface WsPeer {
  ws: WebSocket
  threadId: string | null
}

export class WsTransport {
  private wss: WebSocketServer
  private bus: MessageBus
  private peers = new Set<WsPeer>()

  constructor(server: Server, bus: MessageBus) {
    this.bus = bus
    this.wss = new WebSocketServer({ server, path: "/ws" })

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
      const threadId = url.searchParams.get("threadId")

      const peer: WsPeer = { ws, threadId }
      this.peers.add(peer)

      if (threadId) {
        this.bus.subscribe(
          { send: (frame: BusFrame) => peer.ws.send(JSON.stringify(frame)) },
          threadId
        )
      }

      ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === "subscribe" && msg.threadId) {
            if (peer.threadId) {
              this.bus.unsubscribe(
                { send: (frame: BusFrame) => peer.ws.send(JSON.stringify(frame)) },
                peer.threadId
              )
            }
            peer.threadId = msg.threadId
            this.bus.subscribe(
              { send: (frame: BusFrame) => peer.ws.send(JSON.stringify(frame)) },
              msg.threadId
            )
          }
        } catch { /* ignore bad messages */ }
      })

      ws.on("close", () => {
        this.peers.delete(peer)
        if (peer.threadId) {
          this.bus.unsubscribe(
            { send: (frame: BusFrame) => peer.ws.send(JSON.stringify(frame)) },
            peer.threadId
          )
        }
      })

      ws.send(JSON.stringify({ type: "connected", ts: new Date().toISOString() }))
    })
  }

  broadcast(channel: Channel, threadId: string, payload: unknown): void {
    this.bus.broadcast(channel, threadId, payload)
  }
}
