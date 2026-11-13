import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { latestSend } from "@/lib/data/queries"
import { datasetSchema, type Dataset, type Dmrl, type User } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { errorCount } from "@/lib/rules/check/types"
import {
  checkReplyFile,
  declaredEncoding,
  executeReplyImport,
  NOT_WAITING,
  readReplyFile,
  recordRejectedReply,
  replyBlocked,
  replyOutcome,
} from "./reply"
import { executeWithdrawSend, prepareSend, sendDmlRef } from "./send"

const ROOT = join(__dirname, "..", "..", "..")
const DEMO_REPLY_NAME = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"
const demoReply = readFileSync(join(ROOT, "public/demo-dateien", DEMO_REPLY_NAME), "utf8")
/** Variante: Partner genehmigt alle Einträge */
const allApproved = demoReply.replace(/answer="n"/g, 'answer="y"')

const AT = "2026-11-13T12:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const phungun = (data: Dataset) => data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)

function importReply(data: Dataset, text: string, userId: string = DEMO_IDS.editorAnna) {
  const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlPhungun), text)
  const send = latestSend(data, DEMO_IDS.dmrlPhungun)!
  return executeReplyImport(data, DEMO_IDS.dmrlPhungun, user(data, userId), { fileName: DEMO_REPLY_NAME, text, result, sendArchiveId: send.id }, AT)
}

describe("Verfügbarkeit", () => {
  it("nur bei Status gesendet und mit Berechtigung", () => {
    const demo = buildDemoDataset()
    expect(replyBlocked(dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.editorAnna))).toBeNull()
    expect(replyBlocked(dmrl(demo, DEMO_IDS.dmrlVehicle), user(demo, DEMO_IDS.editorBen))).toContain("nicht gesendet")
    expect(replyBlocked(dmrl(demo, DEMO_IDS.dmrlAircraft), user(demo, DEMO_IDS.editorAnna))).toBe("Keine Berechtigung für diese DMRL.")
  })
})

describe("Datei lesen", () => {
  it("liest UTF-8 und ISO-8859-1 laut XML-Deklaration unverändert (CRLF, BOM bleiben)", async () => {
    const utf8 = "﻿<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<dml>Gerät</dml>"
    expect(await readReplyFile(new Blob([utf8]))).toEqual({ ok: true, text: utf8 })
    const latin1 = new Uint8Array([...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><dml>Ger'), 0xe4, ...new TextEncoder().encode("t</dml>")])
    expect(declaredEncoding(latin1)).toBe("iso-8859-1")
    expect(await readReplyFile(new Blob([latin1]))).toEqual({ ok: true, text: '<?xml version="1.0" encoding="ISO-8859-1"?><dml>Gerät</dml>' })
  })
})

describe("Prüfung im Demo-Stand", () => {
  it("Demo-REPLY auf SEND 00002-2026: fehlerfrei, 30 freigegeben / 2 zu überarbeiten, künftig in Bearbeitung", () => {
    const demo = buildDemoDataset()
    const result = checkReplyFile(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), demoReply)
    expect(result.report.findings).toEqual([])
    const outcome = replyOutcome(demo, DEMO_IDS.dmrlPhungun, result)
    expect(outcome).toMatchObject({ approved: 30, rework: 2, futureStatus: "in_bearbeitung" })
    expect(outcome.rejected).toHaveLength(2)
    expect(outcome.rejected[0].comment).not.toBe("")
  })

  it("Beispieldatei 02 (REPLY auf SEND 00001) wird abgelehnt: falscher Bezug und Duplikat", () => {
    const demo = buildDemoDataset()
    const messages = checkReplyFile(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), DEMO_XML_FILES[DEMO_FILES.reply1]).report.findings.map((f) => f.message)
    expect(messages).toContain("REPLY bezieht sich nicht auf den letzten SEND 00002-2026.")
    expect(messages).toContain("REPLY wurde bereits importiert.")
  })
})

describe("Übernahme", () => {
  it("30/2: y → Eintragstyp leer + freigegeben (auch d bleibt bestehen), n → Typ bleibt + zu überarbeiten; DMRL in Bearbeitung", () => {
    const demo = buildDemoDataset()
    const before = phungun(demo)
    const result = importReply(demo, demoReply)
    if (!result.ok) throw new Error(result.message)
    const after = phungun(result.data)
    expect(after).toHaveLength(32)
    expect(after.filter((e) => e.status === "freigegeben").every((e) => e.fields.dmentryType === "" && e.fields.answer === "y")).toBe(true)
    const rework = after.filter((e) => e.status === "zu_ueberarbeiten")
    expect(rework).toHaveLength(2)
    expect(rework.every((e) => e.fields.dmentryType !== "" && e.fields.answer === "n" && e.fields.answer_comment !== "")).toBe(true)
    // d-Einträge mit y bleiben bestehen
    const deletions = before.filter((e) => e.fields.dmentryType === "d").map((e) => e.id)
    expect(after.filter((e) => deletions.includes(e.id))).toHaveLength(deletions.length)
    // Ausgabedaten der Anwendung bleiben erhalten (REPLY lässt sie weg)
    expect(after.every((e) => e.fields.issno !== "")).toBe(true)

    const d = dmrl(result.data, DEMO_IDS.dmrlPhungun)
    expect(d.status).toBe("in_bearbeitung")
    expect(d.partnerRemarks).toBe("Bitte abgelehnte Einträge überarbeiten.")
    expect(d.release).toBeNull()
    expect(result.data.releases).toHaveLength(0)
    const archived = result.data.archive.at(-1)!
    expect(archived).toMatchObject({
      direction: "reply",
      versionIndex: "00002-2026",
      fileName: DEMO_REPLY_NAME,
      partnerOrganisationId: "org-c1234",
      sendArchiveId: DEMO_IDS.archiveSend2,
      replyCounts: { approved: 30, rework: 2 },
      createdByUserId: DEMO_IDS.editorAnna,
    })
    expect(archived.content).toBe(demoReply)
    expect(result.data.history.at(-1)).toMatchObject({
      action: "reply_uebernommen",
      details: "REPLY 00002-2026 von C1234 Partner Systemtechnik GmbH übernommen — 30 freigegeben, 2 zu überarbeiten",
    })
    expect(datasetSchema.safeParse(result.data).success).toBe(true)

    // nächster SEND verweist auf diesen REPLY; derselbe REPLY ist nicht erneut importierbar
    expect(sendDmlRef(result.data, d, archived.dmlc).dmlc).toEqual(archived.dmlc)
    expect(replyBlocked(d, user(result.data, DEMO_IDS.editorAnna))).not.toBeNull()
  })

  it("alle genehmigt: DMRL freigegeben mit Freigabe-Nachweis und Freigabestand", () => {
    const demo = buildDemoDataset()
    const result = importReply(demo, allApproved)
    if (!result.ok) throw new Error(result.message)
    const d = dmrl(result.data, DEMO_IDS.dmrlPhungun)
    expect(d.status).toBe("freigegeben")
    const archived = result.data.archive.at(-1)!
    expect(d.release).toEqual({ at: AT, replyArchiveId: archived.id, userId: DEMO_IDS.editorAnna })
    const snapshot = result.data.releases.at(-1)!
    expect(snapshot).toMatchObject({ dmrlId: DEMO_IDS.dmrlPhungun, replyArchiveId: archived.id, createdAt: AT })
    expect(snapshot.entries).toHaveLength(32)
    expect(snapshot.entries.every((e) => e.status === "freigegeben")).toBe(true)
    expect(result.data.history.at(-1)?.details).toMatch(/32 freigegeben, 0 zu überarbeiten — DMRL freigegeben$/)
    expect(datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("Einträge ohne Eintragstyp bleiben unverändert inkl. früherer Antwort", () => {
    const demo = buildDemoDataset()
    // Eintrag aus früherem Zyklus: genehmigt, ohne Typ — wird im nächsten SEND mitgeschickt, aber nicht geprüft
    const target = phungun(demo)[5]
    demo.entries = demo.entries.map((e) =>
      e.id === target.id ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "", answer: "y", answer_comment: "früher genehmigt" } } : e
    )
    // passender REPLY: dieser Eintrag ohne Typ und ohne Antwort
    const dmc = formatDmc(target.fields)
    const result = checkReplyFile(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), demoReply)
    const candidate = result.candidates.find((c) => formatDmc(c.fields) === dmc)!
    candidate.fields = { ...candidate.fields, dmentryType: "", answer: "", answer_comment: "" }
    const outcome = replyOutcome(demo, DEMO_IDS.dmrlPhungun, result)
    const kept = outcome.entries.find((e) => e.id === target.id)!
    expect(kept.status).toBe("freigegeben")
    expect(kept.fields.answer_comment).toBe("früher genehmigt")
  })

  it("SEND inzwischen zurückgezogen: „Die DMRL wartet nicht mehr auf eine Antwort.\"", () => {
    const demo = buildDemoDataset()
    const result = checkReplyFile(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), demoReply)
    const withdrawn = executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "Test", AT)
    if (!withdrawn.ok) throw new Error()
    const outcome = executeReplyImport(withdrawn.data, DEMO_IDS.dmrlPhungun, user(withdrawn.data, DEMO_IDS.editorAnna), {
      fileName: DEMO_REPLY_NAME,
      text: demoReply,
      result,
      sendArchiveId: DEMO_IDS.archiveSend2,
    })
    expect(outcome).toEqual({ ok: false, message: NOT_WAITING })
  })

  it("Datei mit Fehlern wird nicht übernommen; Ablehnung nur im Verlauf", () => {
    const demo = buildDemoDataset()
    const wrong = readFileSync(join(ROOT, "public/demo-dateien/TEST-4_Falscher-Absender.XML"), "utf8")
    const checked = checkReplyFile(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), wrong)
    expect(errorCount(checked.report)).toBeGreaterThan(0)
    expect(importReply(demo, wrong)).toMatchObject({ ok: false })
    const after = recordRejectedReply(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.editorAnna), "TEST-4.XML", "Regelwerk", 1, AT)
    expect(after.history.at(-1)).toMatchObject({ action: "reply_abgelehnt", details: "REPLY „TEST-4.XML\" abgelehnt — Regelwerk, 1 Fehler" })
    expect(after.entries).toBe(demo.entries)
  })
})

describe("Vollständiger Zyklus 4.2: SEND → REPLY", () => {
  it("Antwort auf den SEND des Fahrzeugs wird übernommen", async () => {
    const { executeSend } = await import("./send")
    const { writeDml } = await import("@/lib/data/dml-writer")
    const { readDml } = await import("@/lib/data/dml-reader")
    const demo = buildDemoDataset()
    const prepared = prepareSend(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), "org-c1234", "", AT)
    const sent = executeSend(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), prepared)
    if (!sent.ok) throw new Error(sent.message)
    const parsed = readDml(prepared.xml, "4.2")
    const replyXml = writeDml(
      {
        header: { ...parsed.header, direction: "reply", dmlc: { ...parsed.header.dmlc, sendid: "C1234", seqnum: "00001" }, dmlref: { dmlc: prepared.dmlc, issno: null }, remarks: "" },
        entries: parsed.entries.map((f, i) => ({ ...f, answer: i === 0 ? "n" : "y", answer_comment: i === 0 ? "Titel prüfen" : "" })),
      },
      "4.2",
      { answers: true }
    )
    const data = sent.data
    const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), replyXml)
    expect(result.report.findings).toEqual([])
    const done = executeReplyImport(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), {
      fileName: "DML-GTFDEMO-C1234-C-2026-00001_001-00.XML",
      text: replyXml,
      result,
      sendArchiveId: data.archive.at(-1)!.id,
    })
    if (!done.ok) throw new Error(done.message)
    expect(dmrl(done.data, DEMO_IDS.dmrlVehicle).status).toBe("in_bearbeitung")
    expect(done.data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle && e.status === "zu_ueberarbeiten")).toHaveLength(1)
    expect(datasetSchema.safeParse(done.data).success).toBe(true)
  })
})
