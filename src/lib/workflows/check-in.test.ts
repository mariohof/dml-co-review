import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { isDmrlUsedInWorkflow } from "@/lib/rules/workflow-usage"
import { checkCheckinFile, checkInBlocked, executeCheckIn, MAX_CHECKIN_BYTES, readCheckinFile, recordRejectedCheckIn } from "./check-in"
import { executeCheckOut, executeReleaseLock } from "./check-out"

const AT = "2026-11-13T10:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const vehicleEntries = (data: Dataset) => data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)

/** Fahrzeug-DMRL (10 Einträge), ausgecheckt von Ben; optional vorher freigegeben */
function checkedOut(released = false): Dataset {
  const demo = buildDemoDataset()
  const base: Dataset = released
    ? {
        ...demo,
        dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d)),
        entries: demo.entries.map((e) =>
          e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "" } } : e
        ),
      }
    : demo
  const result = executeCheckOut(base, DEMO_IDS.dmrlVehicle, user(base, DEMO_IDS.editorBen), AT)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

/** CSV aus der Sperr-Kopie, optional verändert */
function csvOf(data: Dataset, change?: (rows: EntrySnapshot[]) => EntrySnapshot[]) {
  const rows = structuredClone(dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries)
  return writeEntriesCsv(change ? change(rows) : rows)
}

const check = (data: Dataset, csv: string) => checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
const fileOf = (content: BlobPart, name = "DML-GTFDEMO-D0815-C-2026.csv") => new File([content], name)

describe("Verfügbarkeit", () => {
  it("nur der Sperrinhaber kann einchecken", () => {
    const demo = buildDemoDataset()
    expect(checkInBlocked(dmrl(demo, DEMO_IDS.dmrlVehicle), user(demo, DEMO_IDS.editorBen))).toBe("Die DMRL ist nicht ausgecheckt.")
    const data = checkedOut()
    expect(checkInBlocked(dmrl(data, DEMO_IDS.dmrlVehicle), user(data, DEMO_IDS.editorBen))).toBeNull()
    expect(checkInBlocked(dmrl(data, DEMO_IDS.dmrlVehicle), user(data, DEMO_IDS.editorAnna))).toContain("Nur wer die DMRL ausgecheckt hat")
    expect(checkInBlocked(dmrl(data, DEMO_IDS.dmrlVehicle), user(data, DEMO_IDS.admin))).toContain("Nur wer die DMRL ausgecheckt hat")
  })
})

describe("Datei lesen", () => {
  it("akzeptiert eine UTF-8-CSV", async () => {
    expect(await readCheckinFile(fileOf("a;b\r\n"))).toEqual({ ok: true, text: "a;b\r\n" })
  })

  it("lehnt andere Dateitypen, zu große und nicht UTF-8-kodierte Dateien ab", async () => {
    expect(await readCheckinFile(fileOf("x", "liste.xlsx"))).toEqual({ ok: false, message: "Bitte eine CSV-Datei auswählen." })
    const big = fileOf(new Uint8Array(MAX_CHECKIN_BYTES + 1))
    expect(await readCheckinFile(big)).toEqual({ ok: false, message: "Datei zu groß (höchstens 5 MB)." })
    const latin1 = fileOf(new Uint8Array([0x47, 0x65, 0x72, 0xe4, 0x74])) // „Gerät" in ISO-8859-1
    expect(await readCheckinFile(latin1)).toEqual({ ok: false, message: "Datei ist nicht UTF-8-kodiert." })
  })
})

describe("Übernahme", () => {
  it("unveränderte Datei: Sperre aufgehoben, Einträge und Status bleiben, Verlauf, gültiger Datenbestand", () => {
    const data = checkedOut(true)
    const before = vehicleEntries(data)
    const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), check(data, csvOf(data)), AT)
    if (!result.ok) throw new Error(result.message)
    const after = result.data
    expect(dmrl(after, DEMO_IDS.dmrlVehicle).lock).toBeNull()
    expect(dmrl(after, DEMO_IDS.dmrlVehicle).status).toBe("freigegeben")
    const idStatus = (list: typeof before) => list.map((e) => `${e.id}:${e.status}`).sort()
    expect(idStatus(vehicleEntries(after))).toEqual(idStatus(before))
    expect(after.history.at(-1)).toMatchObject({
      action: "check_in",
      userId: DEMO_IDS.editorBen,
      details: "Check-in — 0 neu, 0 geändert, 10 unverändert",
    })
    expect(datasetSchema.safeParse(after).success).toBe(true)
    expect(isDmrlUsedInWorkflow(after, DEMO_IDS.dmrlVehicle)).toBe(true)
  })

  it("neue und geänderte Einträge: Status in Bearbeitung, IDs bleiben erhalten, Freigabe entfällt", () => {
    const data = checkedOut(true)
    const csv = csvOf(data, (rows) => {
      rows[0].fields.remarks = "Geändert"
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" })
      return [...rows, { id: "neu", status: "in_bearbeitung", fields: { ...rows[9].fields, itemloc: "B", dmentryType: "n" } }]
    })
    const checked = check(data, csv)
    expect(checked.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
    const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT)
    if (!result.ok) throw new Error(result.message)
    const entries = vehicleEntries(result.data)
    expect(entries).toHaveLength(11)
    const changed = entries.find((e) => e.fields.remarks === "Geändert")!
    expect(changed.id).toBe(vehicleEntries(data).find((e) => e.id === changed.id)?.id)
    expect(changed.status).toBe("in_bearbeitung")
    const added = entries.find((e) => !vehicleEntries(data).some((x) => x.id === e.id))!
    expect(added.status).toBe("in_bearbeitung")
    expect(entries.filter((e) => e.status === "freigegeben")).toHaveLength(9)
    expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).status).toBe("in_bearbeitung")
    expect(result.data.history.at(-1)?.details).toBe("Check-in — 1 neu, 1 geändert, 9 unverändert")
    expect(datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("entfernte Einträge verschwinden nach der Übernahme nicht ohne Fehler (Gruppe F)", () => {
    const data = checkedOut()
    const checked = check(data, csvOf(data, (rows) => rows.slice(1)))
    const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT)
    expect(result).toEqual({ ok: false, message: "Die Datei enthält Fehler und kann nicht übernommen werden." })
  })

  it("lehnt ab, wenn die Sperre inzwischen aufgehoben wurde oder ein anderer Benutzer übernimmt", () => {
    const data = checkedOut()
    const checked = check(data, csvOf(data))
    expect(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorAnna), checked)).toMatchObject({ ok: false })
    const released = executeReleaseLock(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.admin), AT)
    if (!released.ok) throw new Error(released.message)
    expect(executeCheckIn(released.data, DEMO_IDS.dmrlVehicle, user(released.data, DEMO_IDS.editorBen), checked)).toEqual({
      ok: false,
      message: "Die Sperre wurde aufgehoben — Check-in nicht möglich.",
    })
  })

  describe("Partnerantworten aus der Datei (Refinement 2026-11-14)", () => {
    const ben = (data: Dataset) => user(data, DEMO_IDS.editorBen)
    const newEntry = (rows: EntrySnapshot[], answer: string) => ({
      id: "neu",
      status: "in_bearbeitung" as const,
      fields: { ...rows[9].fields, itemloc: "B", dmentryType: "n", answer, answer_comment: "aus Altbestand" },
    })

    it("ohne Übernahme: bisherige Antworten bleiben, reine Antwortabweichung ist keine Änderung, neue Einträge ohne Antwort", () => {
      const data = checkedOut(true) // alle Einträge freigegeben, ohne Eintragstyp
      const csv = csvOf(data, (rows) => {
        rows[0].fields.answer = "n"
        rows[0].fields.answer_comment = "anders"
        return [...rows, newEntry(rows, "y")]
      })
      const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, ben(data), check(data, csv), AT)
      if (!result.ok) throw new Error(result.message)
      const entries = vehicleEntries(result.data)
      const first = entries.find((e) => e.id === vehicleEntries(data)[0].id)!
      expect(first).toMatchObject({ status: "freigegeben", fields: { answer: vehicleEntries(data)[0].fields.answer, answer_comment: "" } })
      const added = entries.find((e) => e.fields.itemloc === "B")!
      expect(added).toMatchObject({ status: "in_bearbeitung", fields: { answer: "", answer_comment: "" } })
      expect(result.data.history.at(-1)?.details).toBe("Check-in — 1 neu, 0 geändert, 10 unverändert")
    })

    it("mit Übernahme: Werte aus der Datei, betroffene Einträge in Bearbeitung (nie freigegeben), Freigabe entfällt, Verlaufszusatz", () => {
      const data = checkedOut(true)
      const csv = csvOf(data, (rows) => {
        Object.assign(rows[0].fields, { dmentryType: "c", type: "changed", answer: "n", answer_comment: "Partner lehnt ab" })
        return [...rows, newEntry(rows, "y")]
      })
      const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, ben(data), check(data, csv), AT, true)
      if (!result.ok) throw new Error(result.message)
      const entries = vehicleEntries(result.data)
      const first = entries.find((e) => e.id === vehicleEntries(data)[0].id)!
      expect(first).toMatchObject({ status: "in_bearbeitung", fields: { answer: "n", answer_comment: "Partner lehnt ab" } })
      const added = entries.find((e) => e.fields.itemloc === "B")!
      expect(added).toMatchObject({ status: "in_bearbeitung", fields: { answer: "y", answer_comment: "aus Altbestand" } })
      expect(entries.filter((e) => e.status === "freigegeben")).toHaveLength(9)
      expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).status).toBe("in_bearbeitung")
      expect(result.data.history.at(-1)?.details).toBe("Check-in — 1 neu, 1 geändert, 9 unverändert; 2 Antworten aus der Datei übernommen")
      expect(datasetSchema.safeParse(result.data).success).toBe(true)
    })

    it("mit Übernahme: Eintrag ohne Eintragstyp mit reiner Antwortabweichung sperrt die Übernahme; ohne Übernahme möglich", () => {
      const data = checkedOut(true)
      const checked = check(data, csvOf(data, (rows) => {
        rows[0].fields.answer = "n"
        return rows
      }))
      expect(executeCheckIn(data, DEMO_IDS.dmrlVehicle, ben(data), checked, AT, true)).toEqual({
        ok: false,
        message: "Eintragstyp setzen (n, c oder d), damit der Eintrag erneut gesendet werden kann — Datei korrigieren oder Antworten nicht übernehmen.",
      })
      const without = executeCheckIn(data, DEMO_IDS.dmrlVehicle, ben(data), checked, AT, false)
      if (!without.ok) throw new Error(without.message)
      expect(dmrl(without.data, DEMO_IDS.dmrlVehicle).status).toBe("freigegeben")
    })
  })

  it("abgelehnter Check-in: nur Verlaufseintrag, Sperre und Einträge bleiben", () => {
    const data = checkedOut()
    const checked = check(data, "kaputt")
    const after = recordRejectedCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT)
    expect(after.history.at(-1)).toMatchObject({ action: "check_in_abgelehnt" })
    expect(after.history.at(-1)?.details).toMatch(/^Check-in abgelehnt — \d+ Fehler$/)
    expect(dmrl(after, DEMO_IDS.dmrlVehicle).lock).not.toBeNull()
    expect(after.entries).toBe(data.entries)
  })
})
