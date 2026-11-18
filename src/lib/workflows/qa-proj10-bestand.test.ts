import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCheckOut } from "./check-out"
import { latestRelease, releaseInfo, releaseLabel, releaseXml } from "./release"
import { sendBlocked } from "./send"

/** QA-Lauf 8 — Refinement 2026-11-18 „Bestand übernehmen“ (Regel F1 entfällt) */

const AT = "2026-11-18T09:00:00.000Z"
const LATER = "2026-11-18T12:00:00.000Z"
const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0

const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const entriesOf = (data: Dataset, id: string) => data.entries.filter((e) => e.dmrlId === id)
const ok = <T,>(result: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!result.ok) throw new Error(result.message)
  return result.data
}
const errors = (data: Dataset, id: string, csv: string) =>
  checkCheckinFile(data, dmrl(data, id), csv).report.findings.filter((f) => f.severity === "fehler")

/** Auschecken (Administrator darf jede DMRL), CSV aus der Sperr-Kopie bauen, prüfen und übernehmen */
function cycle(data: Dataset, id: string, change: (rows: EntrySnapshot[]) => EntrySnapshot[], at = AT, takeAnswers = false) {
  const admin = user(data, DEMO_IDS.admin)
  const out = ok(executeCheckOut(data, id, admin, at))
  const csv = writeEntriesCsv(change(structuredClone(dmrl(out, id).lock!.entries)))
  const checked = checkCheckinFile(out, dmrl(out, id), csv)
  return { checked, result: executeCheckIn(out, id, admin, checked, at, takeAnswers) }
}

const newEntry = (template: EntrySnapshot, itemloc: string, dmentryType = "", type = "new", answer = ""): EntrySnapshot => ({
  id: `qa-${itemloc}`,
  status: "in_bearbeitung",
  fields: { ...template.fields, itemloc, dmentryType, type, answer, answer_comment: answer === "n" ? "Begründung" : "" },
})

/** Alle Einträge einer DMRL leeren — Ausgangslage „Erstübernahme“ */
const withoutEntries = (data: Dataset, id: string): Dataset => ({ ...data, entries: data.entries.filter((e) => e.dmrlId !== id) })

describe("QA PROJ-10 Bestand übernehmen — Erstübernahme in allen drei S1000D-Issues", () => {
  for (const [id, issue] of [
    [DEMO_IDS.dmrlPhungun, "2.3"],
    [DEMO_IDS.dmrlVehicle, "4.2"],
    [DEMO_IDS.dmrlAircraft, "5.0"],
  ] as const) {
    it(`${issue}: leere DMRL + Datei nur ohne Eintragstyp → alle freigegeben, Nachweis + Freigabestand, Ladeprüfung gültig`, () => {
      const demo = buildDemoDataset()
      const template = entriesOf(demo, id).map(({ id: entryId, fields }) => ({
        id: entryId,
        status: "freigegeben" as const,
        fields: { ...fields, dmentryType: "", type: "new", answer: "", answer_comment: "" },
      }))
      // PHUNGUN wartet im Demo-Zustand auf den REPLY → Status für die Erstübernahme zurücksetzen
      const base = withoutEntries(
        { ...demo, dmrls: demo.dmrls.map((d) => (d.id === id ? { ...d, status: "in_bearbeitung" as const } : d)) },
        id
      )
      const { checked, result } = cycle(base, id, () => template)
      expect(checked.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
      expect(checked.summary).toMatchObject({ neu: template.length, alsFreigegeben: template.length })
      const after = ok(result)
      expect(entriesOf(after, id).every((e) => e.status === "freigegeben")).toBe(true)
      expect(dmrl(after, id)).toMatchObject({ status: "freigegeben", lock: null, release: { at: AT, replyArchiveId: null, userId: DEMO_IDS.admin } })
      expect(latestRelease(after, id)?.entries).toHaveLength(template.length)
      expect(datasetSchema.safeParse(after).success).toBe(true)
    })
  }

  it.skipIf(!hasXmllint)("XML-Export eines Freigabestands „Übernahme per Check-in“ ist in 2.3, 4.2 und 5.0 schemagültig", async () => {
    for (const [id, issue] of [
      [DEMO_IDS.dmrlPhungun, "2.3"],
      [DEMO_IDS.dmrlVehicle, "4.2"],
      [DEMO_IDS.dmrlAircraft, "5.0"],
    ] as const) {
      const demo = buildDemoDataset()
      const template = entriesOf(demo, id).map(({ id: entryId, fields }) => ({
        id: entryId,
        status: "freigegeben" as const,
        fields: { ...fields, dmentryType: "", type: "new", answer: "", answer_comment: "" },
      }))
      const base = withoutEntries({ ...demo, dmrls: demo.dmrls.map((d) => (d.id === id ? { ...d, status: "in_bearbeitung" as const } : d)) }, id)
      const after = ok(cycle(base, id, () => template).result)
      const file = releaseXml(after, dmrl(after, id), latestRelease(after, id)!, LATER)
      expect(file.content).toContain("Freigabestand vom 18.11.2026")
      expect(await validateWithXmllint(new TextEncoder().encode(file.content), issue)).toEqual({ state: "gueltig", issue })
    }
  })
})

describe("QA PROJ-10 Bestand übernehmen — Folgezyklus und Statusmodell", () => {
  it("nach Freigabe per Check-in: SEND gesperrt (nichts zu senden); nächster Check-in mit n → in Bearbeitung, letzte Freigabe bleibt", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const template = entriesOf(demo, id)
    const base = withoutEntries(demo, id)
    let data = ok(
      cycle(base, id, () =>
        template.map(({ id: entryId, fields }) => ({ id: entryId, status: "freigegeben" as const, fields: { ...fields, dmentryType: "", type: "new" } }))
      ).result
    )
    expect(dmrl(data, id).status).toBe("freigegeben")
    expect(sendBlocked(data, dmrl(data, id), user(data, DEMO_IDS.admin))).toBe("Es gibt keine Änderungen, die der Partner prüfen müsste.")

    data = ok(cycle(data, id, (rows) => [...rows, newEntry(rows[0], "Q", "n", "new")], LATER).result)
    expect(dmrl(data, id).status).toBe("in_bearbeitung")
    // Nachweis bleibt als „letzte Freigabe“ erhalten
    expect(dmrl(data, id).release).toEqual({ at: AT, replyArchiveId: null, userId: DEMO_IDS.admin })
    const last = latestRelease(data, id)!
    expect(releaseLabel(releaseInfo(data, last))).toBe("18.11.2026, Übernahme per Check-in")
    expect(sendBlocked(data, dmrl(data, id), user(data, DEMO_IDS.admin))).toBeNull()
    expect(datasetSchema.safeParse(data).success).toBe(true)
  })

  it("Mischfall bei freigegebener DMRL: neu ohne Typ + neu mit c → DMRL in Bearbeitung, kein neuer Freigabestand", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const releasedDemo: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === id ? { ...d, status: "freigegeben" as const } : d)),
      entries: demo.entries.map((e) => (e.dmrlId === id ? { ...e, status: "freigegeben" as const, fields: { ...e.fields, dmentryType: "" } } : e)),
    }
    const after = ok(cycle(releasedDemo, id, (rows) => [...rows, newEntry(rows[0], "Q"), newEntry(rows[0], "R", "c", "changed")]).result)
    expect(dmrl(after, id).status).toBe("in_bearbeitung")
    expect(after.releases).toHaveLength(releasedDemo.releases.length)
    expect(datasetSchema.safeParse(after).success).toBe(true)
  })

  it("Edge Case: neuer Eintrag ohne Typ mit Antwort n und Antwortübernahme → freigegeben, Antwort n gespeichert", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const { checked, result } = cycle(demo, id, (rows) => [...rows, newEntry(rows[0], "Q", "", "new", "n")], AT, true)
    expect(checked.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
    const added = entriesOf(ok(result), id).find((e) => e.fields.itemloc === "Q")!
    expect(added.status).toBe("freigegeben")
    expect(added.fields.answer).toBe("n")
  })

  it("Edge Case: ohne Antwortübernahme erhält der freigegebene neue Eintrag leere Antwortfelder", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const added = entriesOf(ok(cycle(demo, id, (rows) => [...rows, newEntry(rows[0], "Q", "", "new", "y")]).result), id).find(
      (e) => e.fields.itemloc === "Q"
    )!
    expect(added).toMatchObject({ status: "freigegeben", fields: { answer: "", answer_comment: "" } })
  })
})

describe("QA PROJ-10 Bestand übernehmen — Red Team", () => {
  it("bestehender Eintrag in Bearbeitung lässt sich nicht durch Entfernen des Eintragstyps freigeben", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const out = ok(executeCheckOut(demo, id, user(demo, DEMO_IDS.admin), AT))
    const rows = structuredClone(dmrl(out, id).lock!.entries)
    expect(rows[0].status).toBe("in_bearbeitung")
    rows[0].fields.dmentryType = ""
    expect(errors(out, id, writeEntriesCsv(rows)).map((f) => f.message)).toContain(
      "Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden."
    )
  })

  it("DMC eines bestehenden Eintrags ändern (Eintrag ‚umbenennen‘, ohne Typ) → Fehler „fehlt“, keine Freigabe durch die Hintertür", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const out = ok(executeCheckOut(demo, id, user(demo, DEMO_IDS.admin), AT))
    const rows = structuredClone(dmrl(out, id).lock!.entries)
    const oldDmc = formatDmc(rows[0].fields)
    Object.assign(rows[0].fields, { itemloc: "Q", dmentryType: "" })
    const messages = errors(out, id, writeEntriesCsv(rows)).map((f) => f.message)
    expect(messages.some((m) => m.startsWith(`Eintrag ${oldDmc} fehlt`))).toBe(true)
  })

  it("abgelehnter Eintrag (zu überarbeiten) kann nicht per Kopie ohne Typ ersetzt und das Original entfernt werden", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const rework: Dataset = {
      ...demo,
      entries: demo.entries.map((e, i) => (e.dmrlId === id && i === demo.entries.findIndex((x) => x.dmrlId === id) ? { ...e, status: "zu_ueberarbeiten" as const } : e)),
    }
    const out = ok(executeCheckOut(rework, id, user(rework, DEMO_IDS.admin), AT))
    const rows = structuredClone(dmrl(out, id).lock!.entries)
    const target = rows.find((r) => r.status === "zu_ueberarbeiten")!
    const copy = newEntry(target, "Q")
    const without = rows.filter((r) => r !== target)
    expect(errors(out, id, writeEntriesCsv([...without, copy])).some((f) => f.message.includes("fehlt"))).toBe(true)
  })

  it("Hinweis (gewollt): Ein Bearbeiter kann neue Einträge ohne Partner-REPLY als freigegeben übernehmen — sichtbar in Verlauf und Nachweis", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlVehicle
    const after = ok(cycle(demo, id, (rows) => [...rows, newEntry(rows[0], "Q")]).result)
    expect(after.history.at(-1)?.details).toContain("davon 1 als freigegeben übernommen")
  })
})

/** seqnum aus dmlc und dmlref (2.3: <seqnum>…</seqnum>, 4.2/5.0: seqNumber="…") */
const seqnums = (xml: string) => [...xml.matchAll(/<seqnum>(\d{5})<\/seqnum>|seqNumber="(\d{5})"/g)].map((m) => m[1] ?? m[2])

describe("QA PROJ-10 Bestand übernehmen — XML-Kopf des Freigabestands ohne REPLY", () => {
  // BUG-QA8-1: Ohne REPLY fällt releaseXml auf dmlc …-00001 des Freigabejahres zurück, auch wenn die DMRL bereits
  // SENDs hat (PHUNGUN: letzter SEND 00002-2026). Der Export des aktuellen Stands (PROJ-18) nimmt dagegen den letzten SEND.
  it.skip("BUG-QA8-1: dmlc des Freigabestand-Exports = letzter SEND der DMRL (wie PROJ-18), nicht pauschal 00001", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlPhungun
    const released: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === id ? { ...d, status: "freigegeben" as const } : d)),
      entries: demo.entries.map((e) => (e.dmrlId === id ? { ...e, status: "freigegeben" as const, fields: { ...e.fields, dmentryType: "" } } : e)),
    }
    const after = ok(cycle(released, id, (rows) => [...rows, newEntry(rows[0], "Q")]).result)
    const xml = releaseXml(after, dmrl(after, id), latestRelease(after, id)!, LATER).content
    expect(seqnums(xml)[0]).toBe("00002")
  })

  it("Gegenprobe zu BUG-QA8-1: aktuelles Verhalten liefert 00001", () => {
    const demo = buildDemoDataset()
    const id = DEMO_IDS.dmrlPhungun
    const released: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === id ? { ...d, status: "freigegeben" as const } : d)),
      entries: demo.entries.map((e) => (e.dmrlId === id ? { ...e, status: "freigegeben" as const, fields: { ...e.fields, dmentryType: "" } } : e)),
    }
    const after = ok(cycle(released, id, (rows) => [...rows, newEntry(rows[0], "Q")]).result)
    const xml = releaseXml(after, dmrl(after, id), latestRelease(after, id)!, LATER).content
    expect(seqnums(xml)).toEqual(["00001", "00001"])
  })
})
