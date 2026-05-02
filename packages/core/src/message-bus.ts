export const Channels = {
  SessionEvent: "session.event",
  SessionRefresh: "session.refresh",
  ProviderStatus: "provider.status",
} as const

export type Channel = (typeof Channels)[keyof typeof Channels]

export interface BusFrame {
  channel: Channel
  threadId: string
  seq: number
  data: unknown
}

export interface BusSubscriber {
  send(frame: BusFrame): void
}

export class MessageBus {
  private counter = 0
  private subscriptions = new Map<string, Set<BusSubscriber>>()

  subscribe(peer: BusSubscriber, threadId: string): void {
    if (!this.subscriptions.has(threadId)) {
      this.subscriptions.set(threadId, new Set())
    }
    this.subscriptions.get(threadId)!.add(peer)
  }

  unsubscribe(peer: BusSubscriber, threadId: string): void {
    this.subscriptions.get(threadId)?.delete(peer)
  }

  broadcast(channel: Channel, threadId: string, payload: unknown): void {
    const frame: BusFrame = {
      channel,
      threadId,
      seq: ++this.counter,
      data: payload,
    }
    const subscribers = this.subscriptions.get(threadId)
    if (subscribers) {
      for (const peer of subscribers) {
        peer.send(frame)
      }
    }
  }
}
