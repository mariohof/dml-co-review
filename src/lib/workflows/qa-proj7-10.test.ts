import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset, Dmrl, EntrySnapshot, User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { runReplyCheck } from "@/lib/rules/check/reply"
import { errorCount } from "@/lib/rules/check/types"
import { isDmrlUsedInWorkflow } from "@/lib/rules/workflow-usage"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCancelCheckOut, executeCheckOut, lockCsv } from "./check-out"
import { replyContext } from "./reply"

/** QA PROJ-7 bis PROJ-10: Akzeptanzkriterien, die bisher nicht ausdrücklich getestet waren */

const ROOT = join(__dirname, "..", "..", "..")
const demoReply = readFileSync(join(ROOT, "public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "utf8")
const AT = "2026-11-13T09:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const ok = <T,>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message)
  return r.data
}

function checkedOut(data: Dataset, id: string, userId: string) {
  return ok(executeCheckOut(data, id, user(data, userId), AT))
}
function csvFromLock(data: Dataset, id: string, change: (rows: EntrySnapshot[]) => EntrySnapshot[]) {
  return writeEntriesCsv(change(structuredClone(dmrl(data, id).lock!.entries)))
}

describe("PROJ-8 — Regeln", () => {
  it("REPLY: security = 1 ist ein Formatfehler (kein Auffüllen beim REPLY)", () => {
    const demo = buildDemoDataset()
    // erster Eintrag: security 01 → 1
    const xml = demoReply.replace(/(<dmentry[^>]*>[\s\S]*?)<security class="01"\/>/, '$1<security class="1"/>')
    const findings = runReplyCheck(xml, replyContext(demo, dmrl(demo, DEMO_IDS.dmrlPhungun))).report.findings
    expect(findings).toContainEqual(expect.objectContaining({ severity: "fehler", group: "A", field: "security" }))
  })

  it("Check-in: Leerzeichen am Anfang/Ende werden entfernt; Großschreibung bei Eintragstyp ist ungültig", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const spaced = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      rows[0].fields.techname = `  ${rows[0].fields.techname}  `
      return rows
    }))
    expect(errorCount(spaced.report)).toBe(0)
    expect(spaced.summary.unveraendert).toBe(10)
    const upper = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      rows[0].fields.dmentryType = "N"
      return rows
    }))
    expect(upper.report.findings.some((f) => f.field === "dmentryType" && f.severity === "fehler")).toBe(true)
  })

  it("Datei einer anderen DMRL fällt durch MI (D) und fehlende Einträge (F)", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const aircraftCsv = writeEntriesCsv(demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlAircraft))
    const groups = new Set(checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), aircraftCsv).report.findings.map((f) => f.group))
    expect(groups.has("D")).toBe(true)
    expect(groups.has("F")).toBe(true)
  })
})

describe("PROJ-9 — Check-out", () => {
  it("DMRL ohne Einträge: CSV enthält nur die Kopfzeile", () => {
    const demo = buildDemoDataset()
    demo.entries = demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlVehicle)
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    expect(lockCsv(dmrl(data, DEMO_IDS.dmrlVehicle))!.trim().split("\r\n")).toHaveLength(1)
  })

  it("Check-out und Rücknahme: DMRL gilt weiterhin nicht als im Workflow verwendet", () => {
    const demo = buildDemoDataset()
    const out = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const back = ok(executeCancelCheckOut(out, DEMO_IDS.dmrlVehicle, user(out, DEMO_IDS.editorBen)))
    expect(isDmrlUsedInWorkflow(back, DEMO_IDS.dmrlVehicle)).toBe(false)
  })
})

describe("PROJ-10 — Check-in", () => {
  it("geänderter Eintrag „zu überarbeiten\": Status in Bearbeitung, answer/answer_comment bleiben erhalten", () => {
    const demo = buildDemoDataset()
    const first = demo.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)!
    demo.entries = demo.entries.map((e) =>
      e.id === first.id ? { ...e, status: "zu_ueberarbeiten", fields: { ...e.fields, answer: "n", answer_comment: "Titel prüfen" } } : e
    )
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      const row = rows.find((r) => r.id === first.id)!
      row.fields.remarks = "Neue Bemerkung"
      row.fields.dmentryType = "c"
      return rows
    }))
    expect(errorCount(result.report)).toBe(0)
    const after = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT))
    const entry = after.entries.find((e) => e.id === first.id)!
    expect(entry.status).toBe("in_bearbeitung")
    expect(entry.fields).toMatchObject({ answer: "n", answer_comment: "Titel prüfen", remarks: "Neue Bemerkung" })
  })

  it("abgelehnter Check-in ändert „im Workflow verwendet\" nicht; Check-in ohne Änderung setzt es", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const unchanged = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csvFromLock(data, DEMO_IDS.dmrlVehicle, (r) => r))
    expect(isDmrlUsedInWorkflow(data, DEMO_IDS.dmrlVehicle)).toBe(false)
    const after = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), unchanged, AT))
    expect(isDmrlUsedInWorkflow(after, DEMO_IDS.dmrlVehicle)).toBe(true)
  })

  it("zwei Tabs: zweite Übernahme nach erfolgtem Check-in schlägt fehl", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csvFromLock(data, DEMO_IDS.dmrlVehicle, (r) => r))
    const first = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT))
    expect(executeCheckIn(first, DEMO_IDS.dmrlVehicle, user(first, DEMO_IDS.editorBen), result, AT)).toMatchObject({ ok: false })
  })
})

describe("QA PROJ-10 Refinement 2026-11-14 — Partnerantworten aus der Datei", () => {
  /** Fahrzeug-DMRL: erster Eintrag *zu überarbeiten* (Typ c, Antwort n), ausgecheckt von Ben */
  function withRejectedFirst() {
    const demo = buildDemoDataset()
    const first = demo.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)!
    const data: Dataset = {
      ...demo,
      entries: demo.entries.map((e) =>
        e.id === first.id ? { ...e, status: "zu_ueberarbeiten", fields: { ...e.fields, dmentryType: "c", answer: "n", answer_comment: "bitte präzisieren" } } : e
      ),
    }
    return { data: checkedOut(data, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen), firstId: first.id }
  }

  it("Eintrag „zu überarbeiten“ mit reiner Antwortänderung: ohne Übernahme bleibt Status und Antwort, mit Übernahme in Bearbeitung mit Werten aus der Datei", () => {
    const { data, firstId } = withRejectedFirst()
    const csv = csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      Object.assign(rows.find((r) => r.id === firstId)!.fields, { answer: "y", answer_comment: "Partner hat telefonisch zugestimmt" })
      return rows
    })
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
    expect(errorCount(result.report)).toBe(0)

    const without = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT, false))
    expect(without.entries.find((e) => e.id === firstId)).toMatchObject({ status: "zu_ueberarbeiten", fields: { answer: "n", answer_comment: "bitte präzisieren" } })

    const withTake = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT, true))
    expect(withTake.entries.find((e) => e.id === firstId)).toMatchObject({
      status: "in_bearbeitung",
      fields: { dmentryType: "c", answer: "y", answer_comment: "Partner hat telefonisch zugestimmt" },
    })
    expect(withTake.entries.filter((e) => e.status === "freigegeben")).toHaveLength(0) // übernommenes y gibt nie frei
  })

  it("XSS-Text in der übernommenen Begründung wird unverändert als Text gespeichert", () => {
    const { data, firstId } = withRejectedFirst()
    const payload = '<img src=x onerror="alert(1)">'
    const csv = csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      rows.find((r) => r.id === firstId)!.fields.answer_comment = payload
      return rows
    })
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
    const after = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT, true))
    expect(after.entries.find((e) => e.id === firstId)?.fields.answer_comment).toBe(payload)
  })

  // BUG-QA4-1: behoben 2026-11-14 — Test aktiv
  it("BUG-QA4-1: Eintrag, der durch den Check-in ohne Eintragstyp „in Bearbeitung“ würde, wird abgewiesen bzw. gesperrt", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo, DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const firstId = dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries[0].id
    // Eintragstyp n entfernt und Antwort gesetzt
    const csv = csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      Object.assign(rows.find((r) => r.id === firstId)!.fields, { dmentryType: "", answer: "y" })
      return rows
    })
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
    const outcome = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT, true)
    // erwartet: kein Eintrag „in Bearbeitung“ ohne Eintragstyp nach dem Check-in
    const stuck = outcome.ok ? outcome.data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle && e.status === "in_bearbeitung" && e.fields.dmentryType === "") : []
    expect(stuck).toEqual([])
  })
})
