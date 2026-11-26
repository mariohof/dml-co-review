import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FILE_COLUMNS, INFO_FIELD_NAMES, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { ENTRIES_SHEET_NAME, writeEntriesXlsx } from "@/lib/files/entries-xlsx"
import { readXlsxSheet } from "@/lib/files/xlsx-reader"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { errorCount } from "@/lib/rules/check/types"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCheckOut } from "./check-out"
import { exportCsv, exportXlsx } from "./export"
import { releaseCsv } from "./release"

/** QA-Lauf 13 — PROJ-9/10 Refinement 2026-11-26 (`dmc` und Informationsfelder) */

const AT = "2026-11-26T11:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const vehicle = (data: Dataset) => data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)
const col = (name: string) => ENTRY_FILE_COLUMNS.indexOf(name as never)

function checkOut(base: Dataset): Dataset {
  const r = executeCheckOut(base, DEMO_IDS.dmrlVehicle, user(base, DEMO_IDS.editorBen), AT)
  if (!r.ok) throw new Error(r.message)
  return r.data
}
const lockRows = (data: Dataset) => structuredClone(dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries)
function checkIn(data: Dataset, input: Parameters<typeof checkCheckinFile>[2], takeAnswers = false) {
  const checked = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), input)
  return { checked, result: executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT, takeAnswers) }
}
const setInfo = (rows: EntrySnapshot[], values: Partial<Record<(typeof INFO_FIELD_NAMES)[number], string>>, index = 0) =>
  rows.map((e, i) => (i === index ? { ...e, fields: { ...e.fields, ...values } } : e))

/** Bestand mit gespeicherten Informationsfeldern bei allen Fahrzeug-Einträgen */
function withStoredInfo(): Dataset {
  const demo = buildDemoDataset()
  return {
    ...demo,
    entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, fields: { ...e.fields, orig: "D0815", spec: "S1000D-4.2" } } : e)),
  }
}

describe("Rundlauf der Informationsfelder", () => {
  it("Sonderzeichen (; \" Zeilenumbruch, Apostroph, Formel, Umlaute) überstehen CSV und Excel unverändert", () => {
    const values = { orig: "'=1+1", applic_type: 'a;b"c', applic_model: "Zeile1\nZeile2", rfu: "@x", "dtd-schema": "+1", spec: "-2", "io-pm": "Größe ä" }
    for (const kind of ["csv", "xlsx"] as const) {
      const data = checkOut(buildDemoDataset())
      const rows = setInfo(lockRows(data), values)
      const input =
        kind === "csv"
          ? writeEntriesCsv(rows)
          : (() => {
              const sheet = readXlsxSheet(writeEntriesXlsx(rows), ENTRIES_SHEET_NAME)
              if (!sheet.ok) throw new Error("nicht lesbar")
              return { source: "xlsx" as const, rows: sheet.rows }
            })()
      const { checked, result } = checkIn(data, input)
      expect(errorCount(checked.report), kind).toBe(0)
      if (!result.ok) throw new Error(result.message)
      const stored = vehicle(result.data).find((e) => e.fields.rfu === "@x")
      expect(stored?.fields, kind).toMatchObject(values)
    }
  })

  it("Excel lässt leere Zellen am Zeilenende weg: Informationsfelder gelten dann als leer, kein Spaltenfehler", () => {
    const data = checkOut(buildDemoDataset())
    const sheet = readXlsxSheet(writeEntriesXlsx(lockRows(data)), ENTRIES_SHEET_NAME)
    if (!sheet.ok) throw new Error("nicht lesbar")
    const rows = sheet.rows.map((r, i) => (i === 0 ? r : { ...r, cells: r.cells.slice(0, 28) }))
    const { checked } = checkIn(data, { source: "xlsx", rows })
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary.informationsfelder).toBe(0)
  })

  it("Eintrag „zu überarbeiten“ mit nur Informationsfeld-Änderung behält seinen Status", () => {
    const demo = buildDemoDataset()
    const first = vehicle(demo)[0].id
    const base: Dataset = { ...demo, entries: demo.entries.map((e) => (e.id === first ? { ...e, status: "zu_ueberarbeiten" } : e)) }
    const data = checkOut(base)
    const rows = lockRows(data)
    const index = rows.findIndex((e) => e.id === first)
    const { result } = checkIn(data, writeEntriesCsv(setInfo(rows, { applic_version: "2" }, index)))
    if (!result.ok) throw new Error(result.message)
    const entry = result.data.entries.find((e) => e.id === first)!
    expect(entry.status).toBe("zu_ueberarbeiten")
    expect(entry.fields.applic_version).toBe("2")
  })

  it("neuer Eintrag aus 37-Spalten-Datei übernimmt seine Informationsfelder; aus 28-Spalten-Datei leer", () => {
    const data = checkOut(buildDemoDataset())
    const rows = lockRows(data)
    const extra: EntrySnapshot = { ...structuredClone(rows[0]), id: "neu", fields: { ...rows[0].fields, itemloc: "Z", dmentryType: "n", type: "new", orig: "NEU01" } }
    const { result } = checkIn(data, writeEntriesCsv([...rows, extra]))
    if (!result.ok) throw new Error(result.message)
    expect(vehicle(result.data).filter((e) => e.fields.orig === "NEU01")).toHaveLength(1)

    const data2 = checkOut(buildDemoDataset())
    const csv28 = writeEntriesCsv([...lockRows(data2), extra])
      .split("\r\n")
      .map((l) => (l === "" ? l : l.split(";").slice(0, 28).join(";")))
      .join("\r\n")
    const second = checkIn(data2, csv28)
    if (!second.result.ok) throw new Error(second.result.message)
    expect(vehicle(second.result.data).every((e) => e.fields.orig === "")).toBe(true)
  })

  it("Antwortübernahme und Informationsfelder zusammen: beide übernommen", () => {
    const demo = buildDemoDataset()
    const data = checkOut({ ...demo, entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, fields: { ...e.fields, dmentryType: "n" } } : e)) })
    const rows = setInfo(lockRows(data), { orig: "X1" }).map((e, i) => (i === 0 ? { ...e, fields: { ...e.fields, answer: "y" } } : e))
    const { checked, result } = checkIn(data, writeEntriesCsv(rows), true)
    expect(checked.summary.informationsfelder).toBe(1)
    if (!result.ok) throw new Error(result.message)
    const entry = vehicle(result.data).find((e) => e.fields.orig === "X1")!
    expect(entry.fields.answer).toBe("y")
  })
})

describe("Spaltenaufbau (Gruppe S)", () => {
  it("nur `dmc` ohne Informationsfelder → Fehler; vertauschte neue Spalten → Reihenfolge-Fehler; Großschreibung DMC → unbekannte Spalte", () => {
    const base = [...ENTRY_FILE_COLUMNS]
    expect(readCheckinCsv(base.slice(0, 29).join(";")).findings[0].message).toBe("Spalte ‚orig' fehlt.")
    const swapped = [...base]
    ;[swapped[col("orig")], swapped[col("spec")]] = [swapped[col("spec")], swapped[col("orig")]]
    expect(readCheckinCsv(swapped.join(";")).findings[0].message).toContain("falscher Reihenfolge")
    const upper = base.map((n) => (n === "dmc" ? "DMC" : n))
    expect(readCheckinCsv(upper.join(";")).findings.map((f) => f.message)).toContain("Unbekannte Spalte ‚DMC'.")
  })
})

describe("Dateien mit Eintragstabelle", () => {
  it("Export CSV/Excel und Freigabestand-CSV enthalten dmc und gespeicherte Informationsfelder", () => {
    const data = withStoredInfo()
    const d = dmrl(data, DEMO_IDS.dmrlVehicle)
    const csvLines = exportCsv(data, d, AT).content.replace(/^﻿/, "").split("\r\n")
    expect(csvLines[0].split(";")).toEqual([...ENTRY_FILE_COLUMNS])
    expect(csvLines[1].split(";")[col("orig")]).toBe("D0815")
    expect(csvLines[1].split(";")[col("dmc")]).toMatch(/^GTFDEMO-/)
    const xlsx = readXlsxSheet(exportXlsx(data, d, AT).bytes, ENTRIES_SHEET_NAME)
    if (!xlsx.ok) throw new Error("nicht lesbar")
    expect(xlsx.rows[1].cells[col("spec")]).toBe("S1000D-4.2")
    const snapshot = { id: "r1", dmrlId: d.id, createdAt: AT, replyArchiveId: null, userId: DEMO_IDS.editorBen, entries: vehicle(data) }
    expect(releaseCsv(data, d, snapshot).content.split("\r\n")[1].split(";")[col("orig")]).toBe("D0815")
  })
})

describe("Explorativ: CSV aus der XML-Prüfung (PROJ-20) einchecken", () => {
  it("leert gespeicherte Informationsfelder aller Einträge (Datei hat 37 Spalten, Informationsfelder leer)", () => {
    const data = checkOut(withStoredInfo())
    // PROJ-20 schreibt dieselbe 37-Spalten-CSV, Informationsfelder leer (Empfänger-XML kennt sie nicht)
    const proj20Like = lockRows(data).map((e) => ({ ...e, fields: { ...e.fields, ...Object.fromEntries(INFO_FIELD_NAMES.map((n) => [n, ""])) } }))
    const { checked, result } = checkIn(data, writeEntriesCsv(proj20Like))
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary.informationsfelder).toBe(10)
    if (!result.ok) throw new Error(result.message)
    // Befund: alle gespeicherten Werte sind weg — nur der Zähler im Dialog weist darauf hin (BUG-QA13-1)
    expect(vehicle(result.data).every((e) => e.fields.orig === "" && e.fields.spec === "")).toBe(true)
  })
})
