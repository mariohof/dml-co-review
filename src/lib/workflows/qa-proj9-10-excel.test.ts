import { strToU8, unzipSync, zipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { entriesTable } from "@/lib/files/csv-writer"
import { ENTRIES_SHEET_NAME, writeEntriesXlsx } from "@/lib/files/entries-xlsx"
import { readXlsxSheet } from "@/lib/files/xlsx-reader"
import { writeXlsx } from "@/lib/files/xlsx-writer"
import { runCheckinCheck } from "@/lib/rules/check/checkin"
import { errorCount } from "@/lib/rules/check/types"
import { checkCheckinFile, readCheckinFile } from "./check-in"
import { executeCheckOut, lockXlsx } from "./check-out"

/** QA PROJ-9/PROJ-10 Refinement 2026-11-25 — Excel-Check-out/-Check-in: Kriterien und Grenzfälle ohne eigenen Test */

const AT = "2026-11-25T12:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const bytesOf = (text: string) => new Uint8Array(strToU8(text))

function checkedOut(id: string = DEMO_IDS.dmrlVehicle, base = buildDemoDataset()): Dataset {
  const result = executeCheckOut(base, id, user(base, DEMO_IDS.admin), AT)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

function table(bytes: Uint8Array) {
  const sheet = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
  if (!sheet.ok) throw new Error(sheet.reason)
  return { source: "xlsx" as const, rows: sheet.rows }
}

describe("PROJ-9 — Inhalt der Excel-Datei", () => {
  it("Werte mit ;, \" und Zeilenumbruch: Check-out → unverändert einchecken → Wert unverändert, keine Änderung", () => {
    const base = buildDemoDataset()
    const special = 'A; "B"\nC'
    base.entries = base.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle && e.fields.remarks === "" ? { ...e, fields: { ...e.fields, remarks: special } } : e))
    const data = checkedOut(DEMO_IDS.dmrlVehicle, base)
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), table(lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!))
    expect(errorCount(result.report)).toBe(0)
    expect(result.summary).toMatchObject({ neu: 0, geaendert: 0 })
    expect(result.candidates.every((c) => c.fields.remarks === special)).toBe(true)
  })

  it("alle 37 Spalten sind als Text formatiert — auch leere Zellen neuer Zeilen (Spaltenformat)", () => {
    const data = checkedOut()
    const xml = new TextDecoder().decode(unzipSync(lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!)["xl/worksheets/sheet1.xml"])
    const cols = [...xml.matchAll(/<col min="(\d+)" max="\d+" width="[\d.]+" style="1"/g)].map(([, n]) => Number(n))
    expect(cols).toEqual(Array.from({ length: 37 }, (_, i) => i + 1))
  })

  it("Check-out von 1.000 Einträgen erzeugt die Excel-Datei in unter einer Sekunde; Lesen + Prüfen in wenigen Sekunden", () => {
    const template = buildDemoDataset().entries.find((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)!
    const entries: EntrySnapshot[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `e${i}`,
      status: "in_bearbeitung",
      fields: { ...template.fields, dmentryType: "n", type: "new", itemloc: "A", incode: String(100 + (i % 900)).padStart(3, "0"), discode: String(i % 100).padStart(2, "0") + "A" },
    }))
    const t0 = performance.now()
    const bytes = writeEntriesXlsx(entries)
    const write = performance.now() - t0
    const t1 = performance.now()
    const result = runCheckinCheck(table(bytes), { systemModelic: "GTFDEMO", snapshot: entries })
    const check = performance.now() - t1
    expect(result.candidates).toHaveLength(1000)
    expect(write).toBeLessThan(1000)
    expect(check).toBeLessThan(5000)
  })
})

describe("PROJ-10 — Excel-Check-in, Grenzfälle", () => {
  it("Excel-Datei einer anderen DMRL fällt durch die Prüfung (MI, fehlende Einträge)", () => {
    const data = checkedOut()
    const other = checkedOut(DEMO_IDS.dmrlAircraft, data)
    const result = checkCheckinFile(other, dmrl(other, DEMO_IDS.dmrlVehicle), table(lockXlsx(dmrl(other, DEMO_IDS.dmrlAircraft))!))
    expect(errorCount(result.report)).toBeGreaterThan(0)
    expect(result.report.findings.some((f) => f.group === "D")).toBe(true)
    expect(result.report.findings.some((f) => f.group === "F" && /fehlt/.test(f.message))).toBe(true)
  })

  it("Spalten in Excel umsortiert → Fehler Gruppe S, nichts weiter geprüft", () => {
    const data = checkedOut()
    const { header, rows } = entriesTable(dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries)
    const swap = (cells: string[]) => [cells[1], cells[0], ...cells.slice(2)]
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), table(writeXlsx({ sheetName: "Einträge", header: swap(header), rows: rows.map(swap) })))
    expect(result.report.findings.map((f) => f.group)).toEqual(["S"])
    expect(result.report.findings[0].message).toMatch(/^Spalten in falscher Reihenfolge/)
  })

  it("ausgeblendete (gefilterte) Zeilen werden trotzdem gelesen", () => {
    const sheetXml =
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      '<row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c></row><row r="2" hidden="1"><c r="A2" t="inlineStr"><is><t>versteckt</t></is></c></row>' +
      "</sheetData></worksheet>"
    const bytes = zipSync({
      "xl/workbook.xml": bytesOf('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Einträge" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": bytesOf('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
      "xl/worksheets/sheet1.xml": bytesOf(sheetXml),
    })
    expect(table(bytes).rows.map((r) => r.cells[0])).toEqual(["a", "versteckt"])
  })

  it("ZIP mit gefälschter (zu kleiner) Größenangabe → „Excel-Datei kann nicht gelesen werden.“", async () => {
    const zip = new Uint8Array(writeEntriesXlsx(dmrl(checkedOut(), DEMO_IDS.dmrlVehicle).lock!.entries))
    const view = new DataView(zip.buffer)
    for (let i = 0; i < zip.length - 4; i++) {
      if (view.getUint32(i, true) === 0x04034b50) view.setUint32(i + 22, 10, true)
      if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 10, true)
    }
    expect(await readCheckinFile(new File([zip as BlobPart], "x.xlsx"))).toEqual({ ok: false, message: "Excel-Datei kann nicht gelesen werden." })
  })

  it("CSV-Datei mit Endung .csv, die in Wahrheit eine .xlsx ist → „nicht UTF-8-kodiert“ (keine Fehldeutung)", async () => {
    const bytes = writeEntriesXlsx(dmrl(checkedOut(), DEMO_IDS.dmrlVehicle).lock!.entries)
    expect(await readCheckinFile(new File([bytes as BlobPart], "x.csv"))).toEqual({ ok: false, message: "Datei ist nicht UTF-8-kodiert." })
  })
})
