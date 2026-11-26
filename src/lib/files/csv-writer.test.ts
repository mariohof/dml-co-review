import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FILE_COLUMNS } from "@/lib/data/schema"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { entriesTable, writeEntriesCsv } from "./csv-writer"

const demo = buildDemoDataset()
const phungun = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)

describe("CSV-Schreiber", () => {
  it("schreibt BOM, Kopfzeile mit 37 Spalten in fester Reihenfolge und Semikolon", () => {
    const csv = writeEntriesCsv(phungun)
    expect(csv.startsWith("﻿" + ENTRY_FILE_COLUMNS.join(";") + "\r\n")).toBe(true)
    expect(csv.trim().split("\r\n")).toHaveLength(33)
  })

  it("behält führende Nullen und Umlaute", () => {
    const csv = writeEntriesCsv(phungun)
    expect(csv).toContain(";01;")
    expect(csv).toContain(";001;new;29;09;2026;")
    expect(csv).toContain("Fähigkeitsträger")
  })

  it("Rundlauf: Schreiben → Lesen ergibt dieselben Felder", () => {
    const read = readCheckinCsv(writeEntriesCsv(phungun))
    expect(read.findings).toEqual([])
    const sortedFields = read.candidates.map((c) => c.fields)
    expect(new Set(sortedFields.map((f) => JSON.stringify(f)))).toEqual(new Set(phungun.map((e) => JSON.stringify(e.fields))))
  })
})

describe("Eintrags-Tabelle (gemeinsam für CSV und Excel)", () => {
  it("alle Eintragsfelder als Kopfzeile, Einträge nach DMC sortiert, Werte unverändert ohne CSV-Entschärfung", () => {
    const entries = phungun.map((e, i) => (i === 0 ? { ...e, fields: { ...e.fields, techname: "=1+1" } } : e))
    const table = entriesTable(entries)
    expect(table.header).toEqual([...ENTRY_FILE_COLUMNS])
    expect(table.rows).toHaveLength(phungun.length)
    expect(table.rows.flat()).toContain("=1+1")
    expect(writeEntriesCsv(entries)).toContain("'=1+1")
    const csvRows = writeEntriesCsv(entries).trim().split("\r\n").slice(1)
    // gleiche Reihenfolge wie CSV
    const dmcColumns = ["modelic", "sdc", "chapnum"].map((name) => ENTRY_FILE_COLUMNS.indexOf(name as never))
    expect(table.rows.map((r) => dmcColumns.map((c) => r[c]).join("|"))).toEqual(csvRows.map((line) => dmcColumns.map((c) => line.split(";")[c]).join("|")))
  })
})
