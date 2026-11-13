import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FIELD_NAMES } from "@/lib/data/schema"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { writeEntriesCsv } from "./csv-writer"

const demo = buildDemoDataset()
const phungun = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)

describe("CSV-Schreiber", () => {
  it("schreibt BOM, Kopfzeile mit 27 Feldern in fester Reihenfolge und Semikolon", () => {
    const csv = writeEntriesCsv(phungun)
    expect(csv.startsWith("﻿" + ENTRY_FIELD_NAMES.join(";") + "\r\n")).toBe(true)
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
