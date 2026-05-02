#!/usr/bin/env node

import { Command } from "commander"

const knownCommands = ["start", "run", "agents", "status", "serve", "install", "web", "help"]
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log("Usage: amx <command> [options]")
  console.log("")
  console.log("Commands:")
  console.log("  start       Start API server + web UI + open browser")
  console.log("  run         Execute a task")
  console.log("  agents      List installed agents")
  console.log("  status      Show current state")
  console.log("  serve       Start API server")
  console.log("  install     Install a provider")
  console.log("  web         Start web UI")
  console.log("")
  console.log("Run 'amx <command> --help' for more info")
  process.exit(0)
}

if (args.length > 0 && !knownCommands.includes(args[0]) && !args[0].startsWith("-")) {
  process.argv.splice(2, 0, "run")
}

const program = new Command()
  .name("amx")
  .description("AgentMaxxer - gateway for coding agents")
  .version("0.1.0")

program
  .command("run")
  .description("Execute a task")
  .argument("<task>", "Task description")
  .option("--agent <id>", "Run with a specific agent")
  .option("--provider <id>", "Run with a specific provider")
  .option("--timeout <ms>", "Task timeout in milliseconds")
  .option("--cwd <path>", "Working directory")
  .option("--no-failover", "Disable automatic failover")
  .action(async (task, options) => {
    const { default: run } = await import("./commands/run.js")
    await run(task, { ...options, provider: options.agent ?? options.provider })
  })

program
  .command("agents")
  .description("List installed agents")
  .action(async () => {
    const { default: agents } = await import("./commands/agents.js")
    await agents()
  })

program
  .command("status")
  .description("Show current state")
  .action(async () => {
    const { default: status } = await import("./commands/status.js")
    await status()
  })

program
  .command("serve")
  .description("Start API server")
  .option("--port <port>", "Port number")
  .action(async (options) => {
    const { default: serve } = await import("./commands/serve.js")
    await serve(options)
  })

program
  .command("install")
  .description("Install a provider")
  .argument("<provider>", "Provider ID")
  .action(async (provider) => {
    const { default: install } = await import("./commands/install.js")
    await install(provider)
  })

program
  .command("start")
  .description("Start API server + web UI + open browser")
  .action(async () => {
    const { default: start } = await import("./commands/start.js")
    await start()
  })

program
  .command("web")
  .description("Start web UI")
  .action(async () => {
    const { default: web } = await import("./commands/web.js")
    await web()
  })

program.parse()
