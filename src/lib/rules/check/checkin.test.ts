import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FIELD_NAMES, type EntrySnapshot } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { runCheckinCheck, type CheckinContext } from "./checkin"
import { readCheckinCsv } from "./csv-reader"
import { errorCount } from "./types"

const demo = buildDemoDataset()
const snapshotOf = (dmrlId: string): EntrySnapshot[] =>
  demo.entries.filter((e) => e.dmrlId === dmrlId).map(({ id, status, fields }) => ({ id, status, fields }))

const vehicle = snapshotOf(DEMO_IDS.dmrlVehicle)
const vehicleContext: CheckinContext = { systemModelic: "GTFDEMO", snapshot: vehicle }
const HEADER = ENTRY_FIELD_NAMES.join(";")

/** CSV der Fahrzeug-DMRL mit Änderung an einem Eintrag */
function vehicleCsv(change?: (rows: EntrySnapshot[]) => EntrySnapshot[]) {
  return writeEntriesCsv(change ? change(structuredClone(vehicle)) : vehicle)
}

const messages = (csv: string, context = vehicleContext) => runCheckinCheck(csv, context).report.findings.map((f) => `${f.group}: ${f.message}`)

describe("Gruppe S — Dateistruktur", () => {
  it("akzeptiert die Kopfzeile in fester Reihenfolge (mit BOM)", () => {
    expect(readCheckinCsv(vehicleCsv()).aborted).toBe(false)
  })

  it("meldet fehlende, unbekannte, doppelte und vertauschte Spalten und bricht ab", () => {
    const names = [...ENTRY_FIELD_NAMES]
    expect(readCheckinCsv(names.slice(1).join(";")).findings[0].message).toBe("Spalte ‚dmentryType' fehlt.")
    expect(readCheckinCsv([...names, "extra"].join(";")).findings[0].message).toBe("Unbekannte Spalte ‚extra'.")
    expect(readCheckinCsv([...names, "remarks"].join(";")).findings[0].message).toBe("Spalte ‚remarks' kommt mehrfach vor.")
    const swapped = [...names]
    ;[swapped[1], swapped[2]] = [swapped[2], swapped[1]]
    const result = readCheckinCsv(swapped.join(";"))
    expect(result.aborted).toBe(true)
    expect(result.findings[0].message).toContain("falscher Reihenfolge")
  })

  it("überspringt leere Zeilen und meldet eine Datei nur mit Kopfzeile", () => {
    expect(readCheckinCsv(`${HEADER}\r\n\r\n`).findings[0].message).toBe("Die Datei enthält keine Einträge.")
    const withBlank = vehicleCsv().replace("\r\n", "\r\n;;;;;;;;;;;;;;;;;;;;;;;;;;\r\n\r\n")
    expect(readCheckinCsv(withBlank).candidates).toHaveLength(10)
  })

  it("liest Werte mit Semikolon und Anführungszeichen unverändert", () => {
    const csv = vehicleCsv((rows) => {
      rows[0].fields.remarks = 'Hinweis; mit "Zitat"'
      return rows
    })
    expect(readCheckinCsv(csv).candidates.some((c) => c.fields.remarks === 'Hinweis; mit "Zitat"')).toBe(true)
  })
})

describe("Unveränderter Check-in (Demo)", () => {
  it.each([
    ["Fahrzeug", DEMO_IDS.dmrlVehicle, "GTFDEMO"],
    ["Fluggerät", DEMO_IDS.dmrlAircraft, "THSDEMO"],
    ["PHUNGUN", DEMO_IDS.dmrlPhungun, "PHUNGUN"],
  ])("%s: fehlerfrei, alle Einträge unverändert", (_name, dmrlId, modelic) => {
    const snapshot = snapshotOf(dmrlId)
    const result = runCheckinCheck(writeEntriesCsv(snapshot), { systemModelic: modelic, snapshot })
    expect(result.report.findings).toEqual([])
    expect(result.summary).toMatchObject({ geprueft: snapshot.length, neu: 0, geaendert: 0, unveraendert: snapshot.length })
  })
})

describe("Gruppe A — Feldformat und führende Nullen", () => {
  it("füllt führende Nullen bei security/issno/day/month auf und meldet Hinweise, keine Fehler", () => {
    const csv = vehicleCsv((rows) => {
      Object.assign(rows[0].fields, { security: "1", issno: "1", day: "1" })
      return rows
    })
    const result = runCheckinCheck(csv, vehicleContext)
    expect(errorCount(result.report)).toBe(0)
    expect(result.report.findings.filter((f) => f.severity === "hinweis").map((f) => f.message)).toEqual([
      "Führende Nullen ergänzt: ‚1' → ‚01'.",
      "Führende Nullen ergänzt: ‚1' → ‚001'.",
      "Führende Nullen ergänzt: ‚1' → ‚01'.",
    ])
    expect(result.summary.unveraendert).toBe(10)
  })

  it.each([
    ["chapnum", "A5B7", "2–3 Stellen alphanumerisch, gefunden ‚A5B7'"],
    ["security", "A1", "01–20"],
    ["security", "00", "01–20"],
    ["security", "21", "01–20"],
    ["dmentryType", "x", "leer, n, c oder d"],
    ["type", "change", "new, changed, revised oder deleted"],
    ["language", "xx", "ISO 639-1"],
    ["language", "DE", "ISO 639-1"],
    ["country", "XX", "ISO 3166"],
    ["country", "de", "ISO 3166"],
  ])("meldet %s = ‚%s'", (field, value, message) => {
    const csv = vehicleCsv((rows) => {
      ;(rows[3].fields as Record<string, string>)[field] = value
      rows[3].fields.dmentryType = field === "dmentryType" ? value : "c"
      return rows
    })
    const finding = runCheckinCheck(csv, vehicleContext).report.findings.find((f) => f.group === "A" && f.field === field)
    expect(finding?.message).toContain(message)
    expect(finding?.line).toBeGreaterThan(1) // Zeilennummer in der Datei (Kopfzeile = 1)
  })

  it("meldet ein ungültiges Datum", () => {
    const csv = vehicleCsv((rows) => {
      Object.assign(rows[0].fields, { day: "31", month: "02", dmentryType: "c" })
      return rows
    })
    expect(messages(csv)).toContain("A: Ungültiges Datum 31.02.2026.")
  })
})

describe("Gruppe B — Pflichtfelder", () => {
  it("meldet leere Pflichtfelder (infoname, rpc, issno); rpcname/remarks dürfen leer sein", () => {
    const csv = vehicleCsv((rows) => {
      Object.assign(rows[0].fields, { infoname: "", rpc: "", issno: "", rpcname: "", remarks: "", dmentryType: "c" })
      return rows
    })
    const b = runCheckinCheck(csv, vehicleContext).report.findings.filter((f) => f.group === "B").map((f) => f.field)
    expect(b).toEqual(["infoname", "rpc", "issno"])
  })
})

describe("Gruppen C, D, E, I", () => {
  it("meldet doppelte DMC", () => {
    const csv = vehicleCsv((rows) => [...rows, { ...rows[0], id: "x" }])
    expect(runCheckinCheck(csv, vehicleContext).report.findings.filter((f) => f.group === "C")).toHaveLength(2)
  })

  it("meldet einen fremden Model Ident Code", () => {
    expect(messages(vehicleCsv(), { ...vehicleContext, systemModelic: "ANDERES" })).toContain(
      "D: MI ‚GTFDEMO' passt nicht zum System ‚ANDERES'."
    )
  })

  it("meldet unterschiedliche Tech Names bei gleicher SNS, erlaubt gleiche Tech Names bei verschiedener SNS", () => {
    const csv = vehicleCsv((rows) => {
      // Einträge 7 und 8 (24-3-0-00-00) haben dieselbe SNS
      rows[6].fields.techname = "Starterbatterie"
      rows[6].fields.dmentryType = "c"
      // eigene SNS (06-0-0-00-00) mit Tech Name eines anderen Eintrags → erlaubt
      rows[3].fields.techname = "Fahrwerk"
      rows[3].fields.dmentryType = "c"
      return rows
    })
    const e = runCheckinCheck(csv, vehicleContext).report.findings.filter((f) => f.group === "E")
    expect(e).toHaveLength(2)
    expect(e[0].message).toContain("‚Starterbatterie', ‚Fahrzeugbatterie'")
  })

  it("meldet unterschiedliche Info Names bei gleichem Infocode", () => {
    const csv = vehicleCsv((rows) => {
      rows[3].fields.infoname = "Funktion"
      rows[3].fields.dmentryType = "c"
      return rows
    })
    expect(runCheckinCheck(csv, vehicleContext).report.findings.filter((f) => f.group === "I").length).toBeGreaterThanOrEqual(2)
  })
})

describe("Gruppe F — Eintragstyp gegen den bisherigen Stand", () => {
  const newEntry = (rows: EntrySnapshot[], type: string) => [
    ...rows,
    { id: "neu", status: "in_bearbeitung" as const, fields: { ...rows[9].fields, itemloc: "B", dmentryType: type } },
  ]

  it("verlangt bei neuen Einträgen Eintragstyp n", () => {
    expect(messages(vehicleCsv((rows) => newEntry(rows, "c")))).toContain("F: Neuer Eintrag muss Eintragstyp ‚n' haben.")
    const ok = runCheckinCheck(vehicleCsv((rows) => newEntry(rows, "n")), vehicleContext)
    expect(errorCount(ok.report)).toBe(0)
    expect(ok.summary).toMatchObject({ neu: 1, unveraendert: 10 })
  })

  it("verlangt bei geänderten fachlichen Feldern einen Eintragstyp", () => {
    const csv = vehicleCsv((rows) => {
      rows[2].fields.techname = "Geändert"
      rows[2].fields.dmentryType = ""
      rows[1].fields.techname = "Geändert"
      rows[0].fields.techname = "Geändert"
      return rows
    })
    expect(messages(csv)).toContain("F: Geänderter Eintrag ohne Eintragstyp (n, c oder d setzen).")
  })

  it("meldet fehlende bisherige Einträge", () => {
    const csv = vehicleCsv((rows) => rows.slice(1))
    expect(messages(csv).some((m) => m.startsWith("F: Eintrag GTFDEMO-A-00-00-00-00A-001A-A fehlt"))).toBe(true)
  })

  it("erlaubt unveränderte Einträge mit c/d sowie bestehende Einträge mit n", () => {
    const csv = vehicleCsv((rows) => {
      rows[0].fields.dmentryType = "c"
      rows[1].fields.dmentryType = "d"
      return rows
    })
    const result = runCheckinCheck(csv, vehicleContext)
    expect(errorCount(result.report)).toBe(0)
    expect(result.summary.geaendert).toBe(2)
  })
})

describe("Gruppe K — Antwortfelder", () => {
  it("meldet veränderte answer/answer_comment und Antworten bei neuen Einträgen", () => {
    const csv = vehicleCsv((rows) => {
      rows[0].fields.answer = "y"
      return [...rows, { id: "neu", status: "in_bearbeitung", fields: { ...rows[9].fields, itemloc: "B", dmentryType: "n", answer: "", answer_comment: "x" } }]
    })
    const k = runCheckinCheck(csv, vehicleContext).report.findings.filter((f) => f.group === "K").map((f) => f.message)
    expect(k).toEqual(["answer darf nur durch REPLY gesetzt werden.", "answer_comment darf nur durch REPLY gesetzt werden."])
  })
})
