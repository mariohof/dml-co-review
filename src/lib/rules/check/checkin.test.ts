import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FILE_COLUMNS, type EntrySnapshot } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { answerDeviations, answerTakeoverBlockers, checkinSummary, runCheckinCheck, type CheckinContext } from "./checkin"
import { readCheckinCsv } from "./csv-reader"
import { errorCount } from "./types"

const demo = buildDemoDataset()
const snapshotOf = (dmrlId: string): EntrySnapshot[] =>
  demo.entries.filter((e) => e.dmrlId === dmrlId).map(({ id, status, fields }) => ({ id, status, fields }))

const vehicle = snapshotOf(DEMO_IDS.dmrlVehicle)
const vehicleContext: CheckinContext = { systemModelic: "GTFDEMO", snapshot: vehicle }
const HEADER = ENTRY_FILE_COLUMNS.join(";")

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
    const names = [...ENTRY_FILE_COLUMNS]
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

  it("leeres security ist kein Fehler — weder Pflichtfeld noch Format (Refinement 2026-11-26)", () => {
    const csv = vehicleCsv((rows) => {
      for (const row of rows) row.fields.security = ""
      return rows
    })
    const result = runCheckinCheck(csv, vehicleContext)
    expect(result.report.findings.filter((f) => f.field === "security")).toEqual([])
    expect(errorCount(result.report)).toBe(0)
    // Feldänderung gegenüber dem Stand der Anwendung (Einträge haben Eintragstyp n)
    expect(result.summary.geaendert).toBe(10)
  })

  it.each([
    ["chapnum", "A5B7", "2–3 Stellen alphanumerisch, gefunden ‚A5B7'"],
    ["security", "A1", "01–20"],
    ["security", "00", "01–20"],
    ["security", "21", "01–20"],
    ["dmentryType", "x", "leer, n, c oder d"],
    ["type", "change", "new, changed, revised, deleted oder status"],
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
  const ISSUE_TYPE_FOR: Record<string, string> = { n: "new", c: "changed", d: "deleted", "": "new" }
  const newEntry = (rows: EntrySnapshot[], type: string) => [
    ...rows,
    {
      id: "neu",
      status: "in_bearbeitung" as const,
      fields: { ...rows[9].fields, itemloc: "B", dmentryType: type, type: ISSUE_TYPE_FOR[type] },
    },
  ]

  it("erlaubt bei neuen Einträgen jeden Eintragstyp — auch keinen (Refinement 2026-11-18, Bestand übernehmen)", () => {
    for (const type of ["n", "c", "d", ""]) {
      const result = runCheckinCheck(vehicleCsv((rows) => newEntry(rows, type)), vehicleContext)
      expect(result.report.findings.filter((f) => f.severity === "fehler"), `Eintragstyp ‚${type}'`).toEqual([])
      expect(result.summary).toMatchObject({ neu: 1, unveraendert: 10, alsFreigegeben: type === "" ? 1 : 0 })
    }
    expect(messages(vehicleCsv((rows) => newEntry(rows, "c")))).not.toContain("F: Neuer Eintrag muss Eintragstyp ‚n' haben.")
  })

  it("prüft bei neuen Einträgen mit Eintragstyp weiterhin den DM-Ausgabetyp", () => {
    const csv = vehicleCsv((rows) => {
      const added = newEntry(rows, "c")
      added[added.length - 1].fields.type = "new"
      return added
    })
    expect(messages(csv)).toContain("F: Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚new‘")
  })

  it("prüft bei neuen Einträgen ohne Eintragstyp den DM-Ausgabetyp nicht", () => {
    const csv = vehicleCsv((rows) => {
      const added = newEntry(rows, "")
      added[added.length - 1].fields.type = "deleted"
      return added
    })
    expect(errorCount(runCheckinCheck(csv, vehicleContext).report)).toBe(0)
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

  describe("kein Eintrag „in Bearbeitung“ ohne Eintragstyp (BUG-QA4-1)", () => {
    const IN_PROGRESS = "F: Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden."

    it("meldet einen nur entfernten Eintragstyp (n → leer)", () => {
      const csv = vehicleCsv((rows) => {
        rows[0].fields.dmentryType = ""
        return rows
      })
      expect(messages(csv)).toEqual([IN_PROGRESS])
    })

    it("meldet Altbestand, der bereits „in Bearbeitung“ ohne Eintragstyp ist, auch wenn er unverändert bleibt", () => {
      const snapshot = structuredClone(vehicle)
      snapshot[0].fields.dmentryType = "" // in Bearbeitung, ohne Typ (vor der Korrektur entstanden)
      expect(messages(writeEntriesCsv(snapshot), { ...vehicleContext, snapshot })).toEqual([IN_PROGRESS])
    })

    it("erlaubt unveränderte freigegebene Einträge ohne Eintragstyp", () => {
      const snapshot = structuredClone(vehicle)
      snapshot[0] = { ...snapshot[0], status: "freigegeben", fields: { ...snapshot[0].fields, dmentryType: "" } }
      expect(messages(writeEntriesCsv(snapshot), { ...vehicleContext, snapshot })).toEqual([])
    })

    it("fachliche Änderung ohne Eintragstyp behält die bisherige Meldung (keine doppelte Meldung)", () => {
      const csv = vehicleCsv((rows) => {
        Object.assign(rows[0].fields, { remarks: "Geändert", dmentryType: "" })
        return rows
      })
      expect(messages(csv)).toEqual(["F: Geänderter Eintrag ohne Eintragstyp (n, c oder d setzen)."])
    })
  })

  it("erlaubt unveränderte Einträge mit c/d sowie bestehende Einträge mit n", () => {
    const csv = vehicleCsv((rows) => {
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" })
      Object.assign(rows[1].fields, { dmentryType: "d", type: "deleted" })
      return rows
    })
    const result = runCheckinCheck(csv, vehicleContext)
    expect(errorCount(result.report)).toBe(0)
    expect(result.summary.geaendert).toBe(2)
  })
})

describe("Gruppe F — Eintragstyp ↔ DM-Ausgabetyp (Refinement 2026-11-16)", () => {
  /** setzt Eintragstyp und Ausgabetyp beim ersten Fahrzeug-Eintrag und liefert die Meldungen */
  const withTypes = (dmentryType: string, type: string) =>
    messages(
      vehicleCsv((rows) => {
        Object.assign(rows[0].fields, { dmentryType, type })
        return rows
      }),
    )

  it.each([
    ["n", "new"],
    ["c", "changed"],
    ["c", "revised"],
    ["c", "status"],
    ["d", "deleted"],
  ])("erlaubt Eintragstyp %s mit Ausgabetyp %s", (entryType, issueType) => {
    expect(withTypes(entryType, issueType)).toEqual([])
  })

  it.each([
    ["n", "changed", "F: Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚changed‘"],
    ["n", "deleted", "F: Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚deleted‘"],
    ["c", "new", "F: Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚new‘"],
    ["c", "deleted", "F: Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚deleted‘"],
    ["d", "new", "F: Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘"],
    ["d", "status", "F: Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚status‘"],
  ])("meldet Eintragstyp %s mit Ausgabetyp %s", (entryType, issueType, message) => {
    expect(withTypes(entryType, issueType)).toEqual([message])
  })

  it("Meldung nennt Zeile, DMC und Feld", () => {
    const csv = vehicleCsv((rows) => {
      rows[0].fields.type = "changed"
      return rows
    })
    const finding = runCheckinCheck(csv, vehicleContext).report.findings[0]
    expect(finding).toMatchObject({ group: "F", line: 2, field: "type", dmc: formatDmc(vehicle[0].fields) })
  })

  it("prüft Einträge ohne Eintragstyp nicht (freigegeben, jeder gültige Ausgabetyp)", () => {
    const snapshot = structuredClone(vehicle)
    snapshot[0] = { ...snapshot[0], status: "freigegeben", fields: { ...snapshot[0].fields, dmentryType: "", type: "deleted" } }
    expect(messages(writeEntriesCsv(snapshot), { ...vehicleContext, snapshot })).toEqual([])
  })

  it("meldet auch unveränderten Altbestand (d + new)", () => {
    const snapshot = structuredClone(vehicle)
    Object.assign(snapshot[0].fields, { dmentryType: "d", type: "new" })
    expect(messages(writeEntriesCsv(snapshot), { ...vehicleContext, snapshot })).toEqual([
      "F: Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘",
    ])
  })

  it("korrigierter Ausgabetyp ist eine Änderung (Eintrag wird „in Bearbeitung“)", () => {
    const snapshot = structuredClone(vehicle)
    Object.assign(snapshot[0].fields, { dmentryType: "d", type: "new" })
    const fixed = structuredClone(snapshot)
    fixed[0].fields.type = "deleted"
    const result = runCheckinCheck(writeEntriesCsv(fixed), { ...vehicleContext, snapshot })
    expect(errorCount(result.report)).toBe(0)
    expect(result.comparison?.entries[0]).toMatchObject({ classification: "geaendert", changedFields: ["type"] })
  })

  it("prüft auch neue Einträge (n + changed)", () => {
    const csv = vehicleCsv((rows) => [...rows, { ...rows[9], id: "neu", fields: { ...rows[9].fields, itemloc: "B", type: "changed" } }])
    expect(messages(csv)).toEqual(["F: Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚changed‘"])
  })

  it.each([
    ["change", "A: "],
    ["Deleted", "A: "],
    ["rinstate-changed", "A: "],
  ])("ungültiger Ausgabetyp %s: nur Formatfehler (Regel A), keine Typ-Meldung", (issueType, prefix) => {
    const found = withTypes("c", issueType)
    expect(found).toHaveLength(1)
    expect(found[0].startsWith(prefix)).toBe(true)
    expect(found[0]).toContain("new, changed, revised, deleted oder status")
  })

  it("leerer Ausgabetyp: nur Pflichtfeldfehler (Regel B), keine Typ-Meldung", () => {
    const found = withTypes("d", "")
    expect(found).toHaveLength(1)
    expect(found[0].startsWith("B: ")).toBe(true)
  })

  it("Demo PHUNGUN: Einträge mit d haben deleted, mit n haben new", () => {
    const phungun = snapshotOf(DEMO_IDS.dmrlPhungun)
    expect(phungun.filter((e) => e.fields.dmentryType === "d").every((e) => e.fields.type === "deleted")).toBe(true)
    expect(phungun.filter((e) => e.fields.dmentryType === "n").every((e) => e.fields.type === "new")).toBe(true)
  })
})

describe("Gruppe K — abweichende Empfängerantworten (Refinement 2026-11-14)", () => {
  // Ausgangsstand: erster Eintrag freigegeben (ohne Eintragstyp), übrige wie im Demo-Bestand
  const base = structuredClone(vehicle)
  base[0] = { ...base[0], status: "freigegeben", fields: { ...base[0].fields, dmentryType: "" } }
  const context: CheckinContext = { ...vehicleContext, snapshot: base }
  const dmcOf = (i: number) => formatDmc(base[i].fields)
  const NEW_DMC = formatDmc({ ...base[9].fields, itemloc: "B" })

  const withAnswers = () => {
    const rows = structuredClone(base)
    rows[0].fields.answer = "y" // nur Antwort geändert, ohne Eintragstyp → sperrt die Übernahme
    rows[1].fields.answer_comment = "Begründung" // nur Antwort geändert, Eintragstyp n → keine Sperre
    Object.assign(rows[2].fields, { remarks: "Geändert", dmentryType: "c", type: "changed", answer: "n" }) // fachlich geändert und Antwort
    rows.push({ id: "neu", status: "in_bearbeitung", fields: { ...rows[9].fields, itemloc: "B", dmentryType: "n", answer: "", answer_comment: "x" } })
    return writeEntriesCsv(rows)
  }
  const byDmc = (result: ReturnType<typeof runCheckinCheck>, dmc: string) => result.comparison!.entries.find((e) => formatDmc(e.candidate.fields) === dmc)!

  it("meldet abweichende Antworten nicht als Fehler, sondern liefert sie als Liste (auch bei neuen Einträgen)", () => {
    const result = runCheckinCheck(withAnswers(), context)
    expect(result.report.findings).toEqual([])
    const deviations = answerDeviations(result.comparison!).map((d) => formatDmc(d.candidate.fields))
    expect(deviations.sort()).toEqual([dmcOf(0), dmcOf(1), dmcOf(2), NEW_DMC].sort())
  })

  it("trennt Antwortfelder von fachlichen Änderungen; ohne Übernahme zählt eine reine Antwortabweichung als unverändert", () => {
    const result = runCheckinCheck(withAnswers(), context)
    expect(byDmc(result, dmcOf(0))).toMatchObject({ classification: "unveraendert", answerChanged: true, changedFields: [] })
    expect(byDmc(result, dmcOf(1))).toMatchObject({ classification: "unveraendert", answerChanged: true })
    expect(byDmc(result, dmcOf(2))).toMatchObject({ classification: "geaendert", answerChanged: true, changedFields: ["dmentryType", "type", "remarks"] })
    expect(byDmc(result, NEW_DMC)).toMatchObject({ classification: "neu", answerChanged: true })
    expect(result.summary).toMatchObject({ geprueft: 11, neu: 1, geaendert: 1, unveraendert: 9 })
    expect(checkinSummary(result.candidates, result.comparison, true)).toMatchObject({ geprueft: 11, neu: 1, geaendert: 3, unveraendert: 7 })
  })

  it("sperrt die Übernahme nur für Einträge ohne Eintragstyp mit reiner Antwortabweichung", () => {
    const result = runCheckinCheck(withAnswers(), context)
    expect(answerTakeoverBlockers(result.comparison!).map((e) => formatDmc(e.candidate.fields))).toEqual([dmcOf(0)])
    const typed = structuredClone(base)
    Object.assign(typed[0].fields, { answer: "y", dmentryType: "c" })
    expect(answerTakeoverBlockers(runCheckinCheck(writeEntriesCsv(typed), context).comparison!)).toEqual([])
  })

  it("ungültiger Antwortwert bleibt ein Formatfehler (Gruppe A)", () => {
    const rows = structuredClone(base)
    rows[1].fields.answer = "j"
    expect(messages(writeEntriesCsv(rows), context).some((m) => m.startsWith("A: Format: leer, y oder n"))).toBe(true)
  })

  it("ohne Antwortabweichung: keine Liste, keine Sperre, Zahlen mit und ohne Übernahme gleich", () => {
    const result = runCheckinCheck(writeEntriesCsv(base), context)
    expect(answerDeviations(result.comparison!)).toEqual([])
    expect(answerTakeoverBlockers(result.comparison!)).toEqual([])
    expect(checkinSummary(result.candidates, result.comparison, true)).toEqual(result.summary)
  })
})
