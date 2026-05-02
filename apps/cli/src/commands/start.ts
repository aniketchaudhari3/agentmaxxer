import { spawn } from "node:child_process"
import { get } from "node:http"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { loadConfig } from "@agentmaxxer/config"

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_APP_DIR = resolve(__dirname, "../../../web")
const API_PORT = 4001
const WEB_PORT = 4900

function waitForApi(port: number, retries = 15): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = (attempt: number) => {
      if (attempt >= retries) { reject(new Error("API server did not start")); return }
      const req = get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode === 200) resolve()
        else setTimeout(() => check(attempt + 1), 500)
      })
      req.on("error", () => setTimeout(() => check(attempt + 1), 500))
      req.setTimeout(2000, () => { req.destroy(); setTimeout(() => check(attempt + 1), 500) })
    }
    check(0)
  })
}

function openBrowser(url: string): void {
  const platform = process.platform
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open"
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref()
}

export default async function startCommand(): Promise<void> {
  const config = loadConfig()
  const apiPort = config.server.port

  console.log(`\n  Starting AgentMaxxer\n`)

  const apiProcess = spawn(process.execPath, [resolve(__dirname, "../index.js"), "serve", "--port", String(apiPort)], {
    stdio: "inherit",
    env: { ...process.env },
  })

  apiProcess.on("exit", (code) => {
    if (code && code !== 0) process.exit(code)
  })

  console.log(`  API server starting on port ${apiPort}...`)
  await waitForApi(apiPort)
  console.log(`  API server ready on http://127.0.0.1:${apiPort}`)

  console.log(`  Starting web UI on http://127.0.0.1:${WEB_PORT}...`)

  const viteProcess = spawn("npx", ["vite", "--port", String(WEB_PORT), "--host", "127.0.0.1"], {
    cwd: WEB_APP_DIR,
    stdio: "inherit",
    env: { ...process.env },
  })

  viteProcess.on("exit", (code) => {
    apiProcess.kill()
    process.exit(code ?? 0)
  })

  openBrowser(`http://127.0.0.1:${WEB_PORT}`)

  process.on("SIGINT", () => {
    apiProcess.kill()
    viteProcess.kill()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    apiProcess.kill()
    viteProcess.kill()
    process.exit(0)
  })
}
