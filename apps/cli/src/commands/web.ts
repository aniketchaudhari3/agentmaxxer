import { get } from "node:http"
import { spawn } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_APP_DIR = resolve(__dirname, "../../../web")
const API_PORT = 4001
const WEB_PORT = 4900

function checkApi(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = get(`http://127.0.0.1:${API_PORT}/health`, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on("error", () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

export default async function webCommand(): Promise<void> {
  const apiRunning = await checkApi()

  if (!apiRunning) {
    console.log("API server not detected on port 4001.")
    console.log("Start it with: amx serve &")
    console.log("Then re-run: amx web\n")
  }

  console.log(`  Starting AgentMaxxer web UI on http://127.0.0.1:${WEB_PORT}...\n`)

  const viteProcess = spawn(
    "npx",
    ["vite", "--port", String(WEB_PORT), "--host", "127.0.0.1"],
    {
      cwd: WEB_APP_DIR,
      stdio: "inherit",
      env: { ...process.env },
    }
  )

  viteProcess.on("exit", (code) => {
    process.exit(code ?? 0)
  })
}
