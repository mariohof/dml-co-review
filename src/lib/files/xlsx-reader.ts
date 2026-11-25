import { unzipSync } from "fflate"

/**
 * Excel-Leser für den Check-in (PROJ-10 Tech Design J): .xlsx (ZIP mit XML) → Tabelle aus Textzellen.
 *
 * - Blattwahl: bevorzugtes Blatt (z. B. „Einträge"); fehlt es und hat die Mappe genau ein Blatt → dieses
 * - Zellen über ihre Adresse (Excel lässt leere Zellen weg), Werte als gespeicherter Wert:
 *   Text/gemeinsame Textliste unverändert, Zahl wie gespeichert, Formel → gespeichertes Ergebnis (fehlt es → leer)
 * - XML über den XML-Leser des Browsers (lädt keine externen Inhalte); entpackte Größe begrenzt (Zip-Bomben)
 */

export interface SheetRow {
  /** Zeilennummer im Blatt bzw. in der Datei (1-basiert) */
  line: number
  cells: string[]
}

export type XlsxReadResult =
  | { ok: true; sheetName: string; rows: SheetRow[] }
  | { ok: false; reason: "unreadable" | "sheet_missing" }

/** Obergrenze der entpackten Größe der benötigten Teile */
export const MAX_XLSX_UNPACKED_BYTES = 50 * 1024 * 1024

const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

class Unreadable extends Error {}

function parseXml(bytes: Uint8Array | undefined): Document {
  if (!bytes) throw new Unreadable("Teil fehlt")
  const doc = new DOMParser().parseFromString(new TextDecoder("utf-8").decode(bytes), "application/xml")
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Unreadable("XML fehlerhaft")
  return doc
}

const byName = (parent: Document | Element, localName: string): Element[] => Array.from(parent.getElementsByTagNameNS("*", localName))
const children = (parent: Element, localName: string): Element[] => Array.from(parent.children).filter((c) => c.localName === localName)

/** Text einer Zelle/eines Eintrags der Textliste: alle <t> außer Lautschrift (<rPh>) */
function richText(element: Element): string {
  return byName(element, "t")
    .filter((t) => t.parentElement?.localName !== "rPh")
    .map((t) => t.textContent ?? "")
    .join("")
}

/** Pfad eines Beziehungsziels relativ zu xl/ (absolute Ziele beginnen mit „/") */
const resolveTarget = (target: string) => (target.startsWith("/") ? target.slice(1) : `xl/${target}`).replace(/\/\.\//g, "/")

/** Spaltenindex aus Zelladresse (C5 → 2); null bei ungültiger Adresse */
export function columnIndex(ref: string): number | null {
  const letters = /^([A-Z]+)\d*$/i.exec(ref)?.[1]
  if (!letters) return null
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function cellValue(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute("t") ?? "n"
  if (type === "inlineStr") {
    const inline = children(cell, "is")[0]
    return inline ? richText(inline) : ""
  }
  const v = children(cell, "v")[0]?.textContent ?? ""
  if (type === "s") return v === "" ? "" : (sharedStrings[Number(v)] ?? "")
  // n (Zahl, auch Datum als Seriennummer), str (Formel mit Text), b (Wahrheitswert), e (Fehlerwert), d (ISO-Datum)
  return v
}

export function readXlsxSheet(bytes: Uint8Array, preferredSheet: string): XlsxReadResult {
  try {
    let unpacked = 0
    const wanted = (name: string) => name === "xl/workbook.xml" || name.startsWith("xl/_rels/") || name === "xl/sharedStrings.xml" || name.startsWith("xl/worksheets/")
    const files = unzipSync(bytes, {
      filter: (file) => {
        if (!wanted(file.name)) return false
        unpacked += file.originalSize
        if (unpacked > MAX_XLSX_UNPACKED_BYTES) throw new Unreadable("zu groß")
        return true
      },
    })

    const workbook = parseXml(files["xl/workbook.xml"])
    const sheets = byName(workbook, "sheet").map((sheet) => ({
      name: sheet.getAttribute("name") ?? "",
      relId: sheet.getAttributeNS(REL_NS, "id") ?? sheet.getAttribute("r:id") ?? "",
    }))
    const sheet = sheets.find((s) => s.name === preferredSheet) ?? (sheets.length === 1 ? sheets[0] : undefined)
    if (!sheet) return { ok: false, reason: sheets.length === 0 ? "unreadable" : "sheet_missing" }

    const rels = parseXml(files["xl/_rels/workbook.xml.rels"])
    const relationships = byName(rels, "Relationship")
    const target = relationships.find((r) => r.getAttribute("Id") === sheet.relId)?.getAttribute("Target")
    if (!target) throw new Unreadable("Blattziel fehlt")
    const sheetDoc = parseXml(files[resolveTarget(target)])

    const sharedTarget = relationships.find((r) => (r.getAttribute("Type") ?? "").endsWith("/sharedStrings"))?.getAttribute("Target")
    const sharedPath = sharedTarget ? resolveTarget(sharedTarget) : "xl/sharedStrings.xml"
    const sharedStrings = files[sharedPath] ? byName(parseXml(files[sharedPath]), "si").map(richText) : []

    const rows: SheetRow[] = []
    let previousLine = 0
    for (const rowElement of byName(sheetDoc, "row")) {
      const line = Number(rowElement.getAttribute("r")) || previousLine + 1
      previousLine = line
      const cells: string[] = []
      let previousColumn = -1
      for (const cell of children(rowElement, "c")) {
        const ref = cell.getAttribute("r")
        const column = ref ? columnIndex(ref) : previousColumn + 1
        if (column === null) throw new Unreadable("Zelladresse ungültig")
        previousColumn = column
        const value = cellValue(cell, sharedStrings)
        if (value !== "") cells[column] = value
      }
      rows.push({ line, cells: Array.from(cells, (value) => value ?? "") })
    }
    return { ok: true, sheetName: sheet.name, rows }
  } catch {
    return { ok: false, reason: "unreadable" }
  }
}
