import type { FastifyRequest, FastifyReply } from "fastify"

export async function localOnly(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const addr = request.ip
  if (addr !== "127.0.0.1" && addr !== "::1" && addr !== "::ffff:127.0.0.1") {
    reply.code(403).send({ error: "Local access only" })
  }
}
