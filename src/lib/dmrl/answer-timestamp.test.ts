import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { writeDml } from "@/lib/data/dml-writer"
import { datasetSchema, ENTRY_FIELD_NAMES, type DmlHeader } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { formatAnswerTimestamp, toAnswerTimestamp } from "./answer-timestamp"

/** answer_timestamp (PROJ-13, Refinement 2026-11-21) */
describe("answer_timestamp", () => {
  it("ISO-Zeitpunkt → Ortszeit JJJJ-MM-TTThh:mm:ss (unabhängig von der Zeitzone der Testumgebung)", () => {
    const local = new Date(2026, 10, 21, 14, 30, 5) // 21.11.2026 14:30:05 Ortszeit
    expect(toAnswerTimestamp(local.toISOString())).toBe("2026-11-21T14:30:05")
    expect(toAnswerTimestamp("kein Datum")).toBe("")
  })

  it("Anzeige „21.11.2026 14:30“; leer bleibt leer", () => {
    expect(formatAnswerTimestamp("2026-11-21T14:30:05")).toBe("21.11.2026 14:30")
    expect(formatAnswerTimestamp("")).toBe("")
    expect(formatAnswerTimestamp("irgendwas")).toBe("irgendwas")
  })

  it("ist die 28. CSV-Spalte direkt nach answer_comment und wird geschrieben", () => {
    expect(ENTRY_FIELD_NAMES).toHaveLength(28)
    expect(ENTRY_FIELD_NAMES.indexOf("answer_timestamp")).toBe(ENTRY_FIELD_NAMES.indexOf("answer_comment") + 1)
    const demo = buildDemoDataset()
    const entries = demo.entries
      .filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)
      .map((e) => ({ ...e, fields: { ...e.fields, answer: "y", answer_timestamp: "2026-11-21T14:30:05" } }))
    const lines = writeEntriesCsv(entries).replace(/^﻿/, "").split("\r\n")
    const header = lines[0].split(";")
    expect(header).toHaveLength(28)
    expect(lines[1].split(";")[header.indexOf("answer_timestamp")]).toBe("2026-11-21T14:30:05")
  })

  it("steht nie im XML (2.3 / 4.2 / 5.0)", () => {
    const demo = buildDemoDataset()
    const fields = demo.entries
      .filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)
      .map((e) => ({ ...e.fields, answer: "y", answer_timestamp: "2026-11-21T14:30:05" }))
    const header: DmlHeader = {
      direction: "send",
      dmlc: { modelic: "GTFDEMO", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00001" },
      issno: { issno: "001", inwork: "00", type: "new" },
      issdate: { year: "2026", month: "11", day: "21" },
      security: "01",
      dmlref: null,
      remarks: "",
    }
    for (const issue of ["2.3", "4.2", "5.0"] as const) {
      const xml = writeDml({ header, entries: fields }, issue, { answers: true })
      expect(xml).not.toContain("answer_timestamp")
      expect(xml).not.toContain("14:30:05")
    }
  })

  it("gespeicherte Daten ohne answer_timestamp bleiben gültig und erhalten ein leeres Feld", () => {
    const demo = buildDemoDataset()
    const legacy = JSON.parse(JSON.stringify(demo))
    for (const entry of legacy.entries) delete entry.fields.answer_timestamp
    const parsed = datasetSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.entries.every((e) => e.fields.answer_timestamp === "")).toBe(true)
  })
})
