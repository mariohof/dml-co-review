import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { guardCsvCell, unguardCsvCell } from "./csv-formula"
import { writeEntriesCsv, writeTableCsv } from "./csv-writer"

/** BUG-QA2-1: CSV-Formel-Injection */

const DANGEROUS = ['=HYPERLINK("http://angreifer.example";"Details")', "+1+1", "-2+3", "@SUM(A1)", "\t=1", "\r=1", "=cmd|' /C calc'!A0"]
const HARMLESS = ["", "Normaler Text", "A00", "01", "'Zitat", "Text mit = in der Mitte", "Bremse - vorne"]

describe("guardCsvCell / unguardCsvCell", () => {
  it("entschärft Formelanfänge mit Apostroph, lässt übrige Werte unverändert", () => {
    for (const value of DANGEROUS) expect(guardCsvCell(value)).toBe(`'${value}`)
    for (const value of HARMLESS) expect(guardCsvCell(value)).toBe(value)
  })

  it("Rundlauf ist für alle Werte verlustfrei — auch für Werte, die schon mit Apostroph beginnen", () => {
    for (const value of [...DANGEROUS, ...HARMLESS, "'=bereits", "''=zwei", "'-x"]) {
      expect(unguardCsvCell(guardCsvCell(value))).toBe(value)
    }
  })

  it("Werte ohne Schutz (z. B. in Excel neu eingegeben) bleiben beim Lesen unverändert", () => {
    expect(unguardCsvCell("=1+1")).toBe("=1+1")
    expect(unguardCsvCell("'Zitat")).toBe("'Zitat")
  })
})

describe("CSV-Dateien", () => {
  const demo = buildDemoDataset()
  const entries = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun).slice(0, 2)
  const payload = '=HYPERLINK("http://angreifer.example";"Details")'
  const attacked = [{ ...entries[0], fields: { ...entries[0].fields, answer_comment: payload, remarks: "-2+3" } }, entries[1]]

  it("keine Zelle der Eintrags-CSV beginnt mit einem Formelzeichen", () => {
    const csv = writeEntriesCsv(attacked)
    const cells = csv.replace(/^﻿/, "").trim().split("\r\n").slice(1).flatMap((line) => line.split(";"))
    expect(cells.some((cell) => /^"?[=+\-@]/.test(cell))).toBe(false)
    expect(csv).toContain(`"'=HYPERLINK(""http://angreifer.example"";""Details"")"`)
  })

  it("Check-in liest die entschärften Werte unverändert zurück (Rundlauf Check-out → Check-in)", () => {
    const read = readCheckinCsv(writeEntriesCsv(attacked))
    const first = read.candidates.find((c) => c.fields.answer_comment !== "")!
    expect(first.fields.answer_comment).toBe(payload)
    expect(first.fields.remarks).toBe("-2+3")
  })

  it("Prüfbericht-CSV ist ebenfalls entschärft", () => {
    expect(writeTableCsv(["Meldung"], [["=1+1"]])).toContain("'=1+1")
  })
})
