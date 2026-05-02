import { RegistryClient } from "@agentmaxxer/registry"
import { DetectionEngine } from "@agentmaxxer/providers"
import { loadConfig } from "@agentmaxxer/config"

export default async function agentsCommand(): Promise<void> {
  const config = loadConfig()
  const client = new RegistryClient(config.registry.url)
  const engine = new DetectionEngine(client)
  const results = await engine.detectAll()

  const detected = results
    .filter(r => r.installed)
    .sort((a, b) => {
      if (a.type === "paid" && b.type !== "paid") return -1
      if (a.type !== "paid" && b.type === "paid") return 1
      return 0
    })

  const rows = detected.map(r => [
    r.binary ?? r.id,
    r.version ?? "",
    r.type === "paid" ? "paid" : "free",
  ])

  if (rows.length === 0) {
    process.stderr.write("No agents installed\n")
    return
  }

  const colWidths = [
    Math.max(5, ...rows.map(r => r[0].length)),
    Math.max(7, ...rows.map(r => r[1].length)),
    Math.max(4, ...rows.map(r => r[2].length)),
  ]

  const boxWidth = 19

  const fmtRow = (cells: string[]) =>
    " " + cells.map((c, i) => c.padEnd(colWidths[i])).join("  ") + " "

  process.stderr.write(" ┌" + "─".repeat(boxWidth) + "┐\n")
  process.stderr.write(" │ Installed agents  │\n")
  process.stderr.write(" └" + "─".repeat(boxWidth) + "┘\n")
  process.stderr.write("\n")
  process.stderr.write(fmtRow(["Agent", "Version", "Type"]) + "\n")
  process.stderr.write(" " + colWidths.map((w, i) =>
    (i === 0 ? "" : "  ") + "─".repeat(w)
  ).join("") + " \n")
  for (const r of rows) {
    process.stderr.write(fmtRow(r) + "\n")
  }
}
