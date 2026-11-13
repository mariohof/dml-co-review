import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { emptyEntryFields, type EntrySnapshot } from "@/lib/data/schema"
import { countByStatus, EMPTY_FILTER, filterEntries, formatDmc, isDmDeleted, isFilterActive } from "./entries"

const demo = buildDemoDataset()
const phungun = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)

const entry = (overrides: Partial<EntrySnapshot["fields"]>, status: EntrySnapshot["status"] = "in_bearbeitung"): EntrySnapshot => ({
  id: Math.random().toString(36),
  status,
  fields: { ...emptyEntryFields(), ...overrides },
})

describe("DMC-Darstellung", () => {
  it("setzt den DMC laut Spec zusammen", () => {
    expect(
      formatDmc({ modelic: "PHUNGUN", sdc: "A", chapnum: "A05", section: "4", subsect: "0", subject: "0000", discode: "01", discodev: "A", incode: "000", incodev: "A", itemloc: "A" })
    ).toBe("PHUNGUN-A-A05-40-0000-01A-000A-A")
  })

  it("stürzt bei leeren Teilfeldern nicht ab", () => {
    expect(formatDmc(emptyEntryFields())).toBe("-------")
  })
})

describe("Filter, Suche, Sortierung", () => {
  it("sortiert nach DMC", () => {
    const sorted = filterEntries(phungun, EMPTY_FILTER).map((e) => formatDmc(e.fields))
    expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b, "de")))
    expect(sorted).toHaveLength(32)
  })

  it("filtert nach Eintragstyp (Demo PHUNGUN: 11 Löschungen, 21 neu, 0 ohne Typ)", () => {
    expect(filterEntries(phungun, { ...EMPTY_FILTER, type: "d" })).toHaveLength(11)
    expect(filterEntries(phungun, { ...EMPTY_FILTER, type: "n" })).toHaveLength(21)
    expect(filterEntries(phungun, { ...EMPTY_FILTER, type: "ohne" })).toHaveLength(0)
  })

  it("filtert nach Eintragsstatus", () => {
    const list = [entry({}, "freigegeben"), entry({}, "zu_ueberarbeiten"), entry({}, "zu_ueberarbeiten")]
    expect(filterEntries(list, { ...EMPTY_FILTER, status: "zu_ueberarbeiten" })).toHaveLength(2)
  })

  it("sucht in DMC, Tech Name und Info Name ohne Groß-/Kleinschreibung", () => {
    const list = [
      entry({ modelic: "ABC", techname: "Bordnetz", infoname: "Beschreibung" }),
      entry({ modelic: "XYZ", techname: "Fahrwerk", infoname: "Prüfung" }),
    ]
    expect(filterEntries(list, { ...EMPTY_FILTER, search: "abc-" })).toHaveLength(1)
    expect(filterEntries(list, { ...EMPTY_FILTER, search: "FAHRWERK" })).toHaveLength(1)
    expect(filterEntries(list, { ...EMPTY_FILTER, search: "prüf" })).toHaveLength(1)
    expect(filterEntries(list, { ...EMPTY_FILTER, search: "nichts" })).toHaveLength(0)
  })

  it("erkennt aktive Filter", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive({ ...EMPTY_FILTER, search: " x " })).toBe(true)
  })
})

describe("Zähler und Kennzeichen", () => {
  it("zählt je Eintragsstatus (Demo PHUNGUN: 32 gesendet)", () => {
    expect(countByStatus(phungun)).toEqual({ in_bearbeitung: 0, gesendet: 32, freigegeben: 0, zu_ueberarbeiten: 0, gesamt: 32 })
  })

  it("erkennt den DM-Ausgabetyp deleted", () => {
    expect(isDmDeleted({ ...emptyEntryFields(), type: "deleted" })).toBe(true)
    expect(isDmDeleted({ ...emptyEntryFields(), type: "new" })).toBe(false)
  })
})
