import { z } from "zod"

const Base = z.object({
  id: z.string(),
  provider: z.string(),
  threadId: z.string(),
  turnId: z.string().optional(),
  itemId: z.string().optional(),
  ts: z.string().datetime(),
  seq: z.number().int().nonnegative(),
})

const SessionOpened = Base.extend({
  type: z.literal("session.opened"),
  resumeToken: z.string().optional(),
})
const SessionClosed = Base.extend({
  type: z.literal("session.closed"),
})

const TurnStarted = Base.extend({
  type: z.literal("turn.started"),
})
const TurnFinished = Base.extend({
  type: z.literal("turn.finished"),
  status: z.enum(["ok", "failed", "cut"]),
})

const TextChunk = Base.extend({
  type: z.literal("text.chunk"),
  kind: z.enum(["reply", "think", "cmd_output", "file_edit"]),
  text: z.string(),
  chunkIndex: z.number().int().nonnegative().optional(),
})

const TextComplete = Base.extend({
  type: z.literal("text.complete"),
  kind: TextChunk.shape.kind,
  text: z.string(),
})

const ToolInvoke = Base.extend({
  type: z.literal("tool.invoke"),
  name: z.string(),
  args: z.unknown(),
})

const ToolResult = Base.extend({
  type: z.literal("tool.result"),
  name: z.string(),
  output: z.string(),
  failed: z.boolean().default(false),
})

const ApprovalPrompt = Base.extend({
  type: z.literal("approval.prompt"),
  kind: z.enum(["cmd", "write", "read"]),
  detail: z.string(),
})

const OutputError = Base.extend({
  type: z.literal("output.error"),
  code: z.string(),
  message: z.string(),
  fatal: z.boolean().default(false),
})

export const AgentOutput = z.discriminatedUnion("type", [
  SessionOpened, SessionClosed,
  TurnStarted, TurnFinished,
  TextChunk, TextComplete,
  ToolInvoke, ToolResult,
  ApprovalPrompt,
  OutputError,
])
export type AgentOutput = z.infer<typeof AgentOutput>
