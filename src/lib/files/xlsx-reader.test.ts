import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { strToU8, zipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { ENTRY_FIELD_NAMES } from "@/lib/data/schema"

import { ENTRIES_SHEET_NAME, writeEntriesXlsx } from "./entries-xlsx"
import { columnIndex, MAX_XLSX_UNPACKED_BYTES, readXlsxSheet } from "./xlsx-reader"
import { writeXlsx } from "./xlsx-writer"

/** PROJ-10 Tech Design J — Excel-Leser */

const bytesOf = (text: string) => new Uint8Array(strToU8(text))
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

/** Minimale Mappe wie von MS Excel: mehrere Blätter, gemeinsame Textliste, beliebige Zellen */
function buildXlsx(input: { sheets: { name: string; rows: string }[]; sharedStrings?: string[]; absoluteTargets?: boolean }): Uint8Array {
  const target = (n: number) => (input.absoluteTargets ? `/xl/worksheets/sheet${n}.xml` : `worksheets/sheet${n}.xml`)
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": bytesOf('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    "xl/workbook.xml": bytesOf(
      `<?xml version="1.0"?><workbook ${NS}><sheets>${input.sheets
        .map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("")}</sheets></workbook>`
    ),
    "xl/_rels/workbook.xml.rels": bytesOf(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${input.sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${target(i + 1)}"/>`)
        .join("")}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`
    ),
  }
  input.sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = bytesOf(`<?xml version="1.0"?><worksheet ${NS}><sheetData>${s.rows}</sheetData></worksheet>`)
  })
  if (input.sharedStrings) {
    files["xl/sharedStrings.xml"] = bytesOf(`<?xml version="1.0"?><sst ${NS}>${input.sharedStrings.join("")}</sst>`)
  }
  return zipSync(files)
}

const rowsOf = (result: ReturnType<typeof readXlsxSheet>) => {
  if (!result.ok) throw new Error(`nicht lesbar: ${result.reason}`)
  return result.rows
}

describe("Excel-Leser", () => {
  it("liest die eigene Excel-Datei verlustfrei (Rundlauf Schreiber → Leser)", () => {
    const bytes = writeXlsx({ sheetName: "Einträge", header: ["a", "b", "c"], rows: [["01", "=SUMME(A1)", "Ä ö ß"], ["", "x", ""], ["2026-11-25", "", "Zeile\nzwei"]] })
    const result = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
    expect(result.ok && result.sheetName).toBe("Einträge")
    expect(rowsOf(result)).toEqual([
      { line: 1, cells: ["a", "b", "c"] },
      { line: 2, cells: ["01", "=SUMME(A1)", "Ä ö ß"] },
      { line: 3, cells: ["", "x"] },
      { line: 4, cells: ["2026-11-25", "", "Zeile\nzwei"] },
    ])
  })

  it("Check-out-Datei ohne Einträge: nur Kopfzeile", () => {
    expect(rowsOf(readXlsxSheet(writeEntriesXlsx([]), ENTRIES_SHEET_NAME))).toEqual([{ line: 1, cells: [...ENTRY_FIELD_NAMES] }])
  })

  it("liest nur das Blatt „Einträge“, auch wenn es nicht vorn steht", () => {
    const bytes = buildXlsx({
      sheets: [
        { name: "Hilfsblatt", rows: '<row r="1"><c r="A1" t="inlineStr"><is><t>falsch</t></is></c></row>' },
        { name: "Einträge", rows: '<row r="1"><c r="A1" t="inlineStr"><is><t>richtig</t></is></c></row>' },
      ],
    })
    const result = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
    expect(result.ok && result.sheetName).toBe("Einträge")
    expect(rowsOf(result)).toEqual([{ line: 1, cells: ["richtig"] }])
  })

  it("einziges Blatt mit anderem Namen wird gelesen (CSV in Excel als .xlsx gespeichert)", () => {
    const bytes = buildXlsx({ sheets: [{ name: "DML-PHUNGUN-D0815-C-Export-2026", rows: '<row r="1"><c r="A1" t="inlineStr"><is><t>x</t></is></c></row>' }] })
    const result = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
    expect(result.ok && result.sheetName).toBe("DML-PHUNGUN-D0815-C-Export-2026")
  })

  it("mehrere Blätter ohne „Einträge“ → Blatt fehlt", () => {
    const bytes = buildXlsx({ sheets: [{ name: "Tabelle1", rows: "" }, { name: "Tabelle2", rows: "" }] })
    expect(readXlsxSheet(bytes, ENTRIES_SHEET_NAME)).toEqual({ ok: false, reason: "sheet_missing" })
  })

  it("keine ZIP-Datei, ZIP ohne Mappe oder fehlerhaftes XML → nicht lesbar", () => {
    expect(readXlsxSheet(bytesOf("kein zip"), ENTRIES_SHEET_NAME)).toEqual({ ok: false, reason: "unreadable" })
    expect(readXlsxSheet(zipSync({ "a.txt": bytesOf("x") }), ENTRIES_SHEET_NAME)).toEqual({ ok: false, reason: "unreadable" })
    expect(readXlsxSheet(zipSync({ "xl/workbook.xml": bytesOf("<workbook><sheets>") }), ENTRIES_SHEET_NAME)).toEqual({ ok: false, reason: "unreadable" })
  })

  it("begrenzt die entpackte Größe (Zip-Bombe)", () => {
    const bytes = buildXlsx({ sheets: [{ name: "Einträge", rows: "" }] })
    const bomb = zipSync({ "xl/worksheets/sheet9.xml": new Uint8Array(MAX_XLSX_UNPACKED_BYTES + 1) })
    expect(readXlsxSheet(bytes, ENTRIES_SHEET_NAME).ok).toBe(true)
    expect(readXlsxSheet(bomb, ENTRIES_SHEET_NAME)).toEqual({ ok: false, reason: "unreadable" })
  })

  it("ordnet Zellen über ihre Adresse zu — ausgelassene leere Zellen verschieben nichts", () => {
    const bytes = buildXlsx({
      sheets: [{ name: "Einträge", rows: '<row r="3"><c r="A3" t="inlineStr"><is><t>a</t></is></c><c r="D3" t="inlineStr"><is><t>d</t></is></c></row>' }],
    })
    expect(rowsOf(readXlsxSheet(bytes, ENTRIES_SHEET_NAME))).toEqual([{ line: 3, cells: ["a", "", "", "d"] }])
  })

  it("Zellwerte als gespeicherter Wert: Textliste (auch formatiert, ohne Lautschrift), Zahl, Formel, Wahrheitswert, Fehlerwert", () => {
    const bytes = buildXlsx({
      sharedStrings: ["<si><t>01</t></si>", '<si><r><t>Fett</t></r><r><t xml:space="preserve"> und normal</t></r><rPh><t>LAUT</t></rPh></si>'],
      absoluteTargets: true,
      sheets: [
        {
          name: "Einträge",
          rows:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1"><v>1</v></c><c r="D1" s="3"><v>46351</v></c>' +
            '<c r="E1" t="str"><f>A1</f><v>01</v></c><c r="F1"><f>1+1</f></c><c r="G1" t="b"><v>1</v></c><c r="H1" t="e"><v>#N/A</v></c><c r="I1"><v>0.5</v></c></row>',
        },
      ],
    })
    expect(rowsOf(readXlsxSheet(bytes, ENTRIES_SHEET_NAME))[0].cells).toEqual(["01", "Fett und normal", "1", "46351", "01", "", "1", "#N/A", "0.5"])
  })

  it("Spaltenindex aus Zelladresse", () => {
    expect([columnIndex("A1"), columnIndex("Z9"), columnIndex("AA10"), columnIndex("AB33"), columnIndex("1A")]).toEqual([0, 25, 26, 27, null])
  })

  it("Testdatei aus MS Excel (Export-CSV als .xlsx gespeichert): einziges Blatt, gemeinsame Textliste, Zahlzellen", () => {
    const bytes = new Uint8Array(readFileSync(resolve(__dirname, "../../../tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx")))
    const result = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
    expect(result.ok && result.sheetName).toBe("DML-PHUNGUN-D0815-C-Export-2026")
    const rows = rowsOf(result)
    expect(rows).toHaveLength(33)
    expect(rows[0].cells).toEqual([...ENTRY_FIELD_NAMES])
    const field = (row: number, name: string) => rows[row].cells[ENTRY_FIELD_NAMES.indexOf(name as never)]
    // Zahlzellen kommen als Text, Textzellen mit führender Null bleiben erhalten
    expect([field(1, "section"), field(1, "subject"), field(1, "day"), field(1, "year")]).toEqual(["0", "1000", "29", "2026"])
    expect([field(1, "security"), field(1, "issno"), field(1, "month"), field(1, "discode")]).toEqual(["01", "001", "09", "00"])
    expect(field(1, "techname")).toBe("Fristenarbeiten Fähigkeitsträger1 F1, monatlich")
  })
})
