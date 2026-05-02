export function renderTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? "").length))
  )

  const sep = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+"

  const formatRow = (cells: string[]) =>
    "| " + cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |"

  return [
    sep,
    formatRow(headers),
    sep,
    ...rows.map(r => formatRow(r)),
    sep
  ].join("\n")
}
