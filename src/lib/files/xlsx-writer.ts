import { strToU8, zipSync } from "fflate"

/**
 * Allgemeiner Excel-Schreiber (PROJ-18 Tech Design G): Kopfzeile + Textzeilen → .xlsx-Datei (Office Open XML).
 *
 * - genau ein Tabellenblatt, alle Zellen als Text (Zahlenformat „@") — Excel wandelt nichts um (führende Nullen, Datumsähnliches)
 * - Textzellen werden nie als Formel ausgewertet; daher kein Apostroph-Schutz wie in der CSV (BUG-QA2-1)
 * - Kopfzeile fett und fixiert, Autofilter über die Kopfzeile, Spaltenbreiten aus dem längsten Inhalt (begrenzt)
 * - in XML unzulässige Steuerzeichen werden entfernt, sonst meldet Excel eine beschädigte Datei
 */

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export const MIN_COLUMN_WIDTH = 8
export const MAX_COLUMN_WIDTH = 60

/** In XML 1.0 unzulässige Zeichen (Steuerzeichen außer Tab/Zeilenumbruch, einzelne Surrogate, U+FFFE/U+FFFF) */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/** Excel liest „_xHHHH_" in Texten als Zeichencode — der Unterstrich davor wird deshalb selbst maskiert (_x005F_) */
const EXCEL_ESCAPE_PATTERN = /_(x[0-9A-Fa-f]{4}_)/g

export const cleanCellText = (value: string): string => value.replace(INVALID_XML_CHARS, "")

const escapeXml = (value: string): string =>
  cleanCellText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(EXCEL_ESCAPE_PATTERN, "_x005F_$1")

/** Spaltenbuchstabe: 0 → A, 25 → Z, 26 → AA */
export function columnLetter(index: number): string {
  let n = index + 1
  let letters = ""
  while (n > 0) {
    const rest = (n - 1) % 26
    letters = String.fromCharCode(65 + rest) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** Breite in Zeichen: längste Zeile des längsten Inhalts + Rand, begrenzt auf MIN…MAX */
export function columnWidth(values: string[]): number {
  const longest = values.reduce((max, value) => Math.max(max, ...cleanCellText(value).split(/\r?\n/).map((line) => line.length)), 0)
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest + 2))
}

const INVALID_SHEET_NAME = /[[\]:*?/\\]/

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// Formatvorlagen: 0 = Standard, 1 = Text, 2 = Text fett (Kopfzeile)
const STYLES =
  XML_HEAD +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>"

const CONTENT_TYPES =
  XML_HEAD +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  "</Types>"

const ROOT_RELS =
  XML_HEAD +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>"

const WORKBOOK_RELS =
  XML_HEAD +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>"

/**
 * Text → Bytes als Uint8Array dieses Realms: `zipSync` erkennt Dateiinhalte per `instanceof Uint8Array`; in jsdom liefert
 * der TextEncoder ein Array aus einem anderen Realm, das sonst als Verzeichnis gedeutet würde (Testumgebung, 2026-11-25)
 */
const bytesOf = (text: string) => new Uint8Array(strToU8(text))

const cell = (ref: string, value: string, style: number) =>
  value === "" ? `<c r="${ref}" s="${style}"/>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`

const row = (values: string[], rowNumber: number, style: number) =>
  `<row r="${rowNumber}">${values.map((value, col) => cell(`${columnLetter(col)}${rowNumber}`, value, style)).join("")}</row>`

/** Erzeugt eine .xlsx-Datei mit einem Blatt; fehlende Zellen einer Zeile werden als leere Textzellen geschrieben */
export function writeXlsx(input: { sheetName: string; header: string[]; rows: string[][] }): Uint8Array {
  const { sheetName, header, rows } = input
  if (header.length === 0) throw new Error("Die Tabelle braucht mindestens eine Spalte.")
  if (sheetName.length === 0 || sheetName.length > 31 || INVALID_SHEET_NAME.test(sheetName)) throw new Error(`Ungültiger Blattname: ${sheetName}`)

  const normalized = rows.map((values) => header.map((_, col) => values[col] ?? ""))
  const lastColumn = columnLetter(header.length - 1)
  const range = `A1:${lastColumn}${normalized.length + 1}`
  const widths = header.map((name, col) => columnWidth([name, ...normalized.map((values) => values[col])]))

  const sheet =
    XML_HEAD +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<dimension ref="${range}"/>` +
    '<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${widths.map((width, col) => `<col min="${col + 1}" max="${col + 1}" width="${width}" style="1" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${row(header, 1, 2)}${normalized.map((values, index) => row(values, index + 2, 1)).join("")}</sheetData>` +
    `<autoFilter ref="${range}"/>` +
    '<pageMargins left="0.7" right="0.7" top="0.78740157499999996" bottom="0.78740157499999996" header="0.3" footer="0.3"/>' +
    "</worksheet>"

  const quotedName = `'${escapeXml(sheetName).replace(/'/g, "''")}'`
  const workbook =
    XML_HEAD +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${quotedName}!$A$1:$${lastColumn}$${normalized.length + 1}</definedName></definedNames>` +
    "</workbook>"

  return zipSync({
    "[Content_Types].xml": bytesOf(CONTENT_TYPES),
    "_rels/.rels": bytesOf(ROOT_RELS),
    "xl/workbook.xml": bytesOf(workbook),
    "xl/_rels/workbook.xml.rels": bytesOf(WORKBOOK_RELS),
    "xl/styles.xml": bytesOf(STYLES),
    "xl/worksheets/sheet1.xml": bytesOf(sheet),
  })
}
