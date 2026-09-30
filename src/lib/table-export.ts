/**
 * Table exports, kept free of dependencies.
 *
 * CSV downloads straight from the browser. PDF hands a print-ready document to
 * the browser's own print dialog ("Save as PDF"), which is the only way to reach
 * a PDF without pulling in a renderer. Swap in a server-side export later.
 */

/** A column the export should carry: a heading and how to read it off a row */
export type ExportColumn<T> = { header: string; value: (row: T) => string }

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Quotes anything a spreadsheet would otherwise split or reinterpret */
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((c) => cell(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(",")),
  ]
  // The BOM is what makes Excel read UTF-8 rather than mangle it
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${filename}.csv`)
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

export function exportPdf<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const win = window.open("", "_blank", "width=1100,height=800")
  if (!win) return // pop-up blocked; nothing to do but let the caller carry on

  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("")
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(r))}</td>`).join("")}</tr>`)
    .join("")

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
  @page { size: A4 landscape; margin: 12mm }
  body { font: 11px/1.4 ui-sans-serif, system-ui, sans-serif; color: #0f172a; margin: 0 }
  h1 { font-size: 15px; margin: 0 0 2px }
  p { margin: 0 0 12px; font-size: 10px; color: #64748b }
  table { width: 100%; border-collapse: collapse }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top }
  th { background: #f1f5f9; font-size: 9px; letter-spacing: .04em; text-transform: uppercase }
  thead { display: table-header-group }
  tr { break-inside: avoid }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <p>${rows.length} row${rows.length === 1 ? "" : "s"} · exported ${new Date().toLocaleString()}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`)
  win.document.close()
  win.focus()
  // Give the document a tick to lay out before the dialog measures it
  win.setTimeout(() => win.print(), 250)
}
