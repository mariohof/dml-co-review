import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { readDml } from "@/lib/data/dml-reader"
import { writeDml } from "@/lib/data/dml-writer"
import { runReplyCheck } from "@/lib/rules/check/reply"
import { currentVersionIndex } from "@/lib/data/queries"
import { datasetSchema, type Dataset, type Dmrl, type User } from "@/lib/data/schema"
import { compareByDmc } from "@/lib/dmrl/entries"
import { isOrganisationUsedInWorkflow } from "@/lib/rules/workflow-usage"
import { executeCheckOut } from "./check-out"
import {
  executeSend,
  executeWithdrawSend,
  lastSendPartner,
  nextSendDmlCode,
  prepareSend,
  recordFailedSend,
  sendBlocked,
  sendPartners,
  sendPreview,
  withdrawSendBlocked,
} from "./send"

const AT = "2026-11-13T10:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const C1234 = "org-c1234"

function send(data: Dataset, dmrlId: string, at = AT, userId: string = DEMO_IDS.editorBen, remarks = "") {
  const prepared = prepareSend(data, dmrl(data, dmrlId), C1234, remarks, at)
  const result = executeSend(data, dmrlId, user(data, userId), prepared)
  if (!result.ok) throw new Error(result.message)
  return { data: result.data, prepared }
}

/** PHUNGUN nach Zurückziehen von SEND 00002 durch den Administrator */
function phungunWithdrawn(at = AT) {
  const demo = buildDemoDataset()
  const result = executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "Empfänger antwortet nicht", at)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

describe("Voraussetzungen", () => {
  const demo = buildDemoDataset()

  it("Fahrzeug (4.2) ist sendefähig; PHUNGUN wartet auf REPLY 00002-2026", () => {
    expect(sendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), user(demo, DEMO_IDS.editorBen))).toBeNull()
    expect(sendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.editorAnna))).toBe(
      "Es wird noch auf die Antwort zum SEND 00002-2026 gewartet."
    )
  })

  it("keine Berechtigung, ausgecheckt, abgelehnte Einträge, keine Änderungen", () => {
    expect(sendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlAircraft), user(demo, DEMO_IDS.editorAnna))).toBe("Keine Berechtigung für diese DMRL.")
    const out = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), AT)
    if (!out.ok) throw new Error()
    expect(sendBlocked(out.data, dmrl(out.data, DEMO_IDS.dmrlVehicle), user(out.data, DEMO_IDS.admin))).toBe(
      "Die DMRL ist ausgecheckt von Ben Bearbeiter."
    )
    const rework: Dataset = {
      ...demo,
      entries: demo.entries.map((e, i) => (e.dmrlId === DEMO_IDS.dmrlVehicle && i % 4 === 0 ? { ...e, status: "zu_ueberarbeiten" } : e)),
    }
    expect(sendBlocked(rework, dmrl(rework, DEMO_IDS.dmrlVehicle), user(rework, DEMO_IDS.editorBen))).toMatch(
      /^\d abgelehnte Einträge sind noch nicht überarbeitet/
    )
    const untyped: Dataset = {
      ...demo,
      entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, fields: { ...e.fields, dmentryType: "" } } : e)),
    }
    expect(sendBlocked(untyped, dmrl(untyped, DEMO_IDS.dmrlVehicle), user(untyped, DEMO_IDS.editorBen))).toBe(
      "Es gibt keine Änderungen, die der Empfänger prüfen müsste."
    )
  })

  it("Empfänger ohne Originator; „SEND zurückziehen\" nur Administrator bei Status gesendet", () => {
    expect(sendPartners(demo, dmrl(demo, DEMO_IDS.dmrlVehicle)).map((o) => o.code)).toEqual(["C1234"])
    expect(lastSendPartner(demo, dmrl(demo, DEMO_IDS.dmrlPhungun))?.code).toBe("C1234")
    expect(lastSendPartner(demo, dmrl(demo, DEMO_IDS.dmrlVehicle))).toBeNull()
    expect(withdrawSendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.admin))).toBeNull()
    expect(withdrawSendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.editorAnna))).toContain("Nur Administratoren")
    expect(withdrawSendBlocked(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), user(demo, DEMO_IDS.admin))).toBe("Es gibt keinen offenen SEND.")
  })
})

describe("Versionsindex und Dateiname", () => {
  it("erster SEND des Fahrzeugs: 00001-2026, Dateiname nach Schema", () => {
    const demo = buildDemoDataset()
    expect(sendPreview(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), AT)).toMatchObject({
      versionIndex: "00001-2026",
      fileName: "DML-GTFDEMO-D0815-C-2026-00001_001-00.XML",
      counts: { gesamt: 10, n: 10, c: 0, d: 0 },
    })
  })

  it("PHUNGUN nach SEND 00001/00002 und Zurückziehen: 00003-2026; zurückgezogene belegen ihre Nummer", () => {
    const data = phungunWithdrawn()
    expect(sendPreview(data, dmrl(data, DEMO_IDS.dmrlPhungun), AT)).toMatchObject({
      versionIndex: "00003-2026",
      fileName: "DML-PHUNGUN-D0815-C-2026-00003_001-00.XML",
    })
  })

  it("Jahreswechsel: im neuen Jahr wieder 00001", () => {
    const { data } = send(buildDemoDataset(), DEMO_IDS.dmrlVehicle)
    expect(nextSendDmlCode(data, dmrl(data, DEMO_IDS.dmrlVehicle), "2027-01-02T10:00:00.000Z")).toMatchObject({ diyear: "2027", seqnum: "00001" })
  })
})

describe("Versionsindex erster SEND aus PROJ-6 (Refinement 2026-11-22)", () => {
  const withPreset = (preset: string): Dataset => {
    const demo = buildDemoDataset()
    return { ...demo, dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, firstSendVersionIndex: preset } : d)) }
  }

  it("erster SEND verwendet die Vorgabe, dmlref auf sich selbst; danach wird fortgezählt", () => {
    const data = withPreset("00013-2026")
    expect(sendPreview(data, dmrl(data, DEMO_IDS.dmrlVehicle), AT)).toMatchObject({
      versionIndex: "00013-2026",
      fileName: "DML-GTFDEMO-D0815-C-2026-00013_001-00.XML",
      expiredPreset: null,
    })
    const { data: after, prepared } = send(data, DEMO_IDS.dmrlVehicle)
    expect(prepared.dmlref.dmlc).toEqual(prepared.dmlc)
    expect(readDml(prepared.xml, "4.2").header.dmlc).toMatchObject({ diyear: "2026", seqnum: "00013" })
    expect(currentVersionIndex(after, DEMO_IDS.dmrlVehicle)).toBe("00013-2026")
    // nach dem ersten SEND zählt das Archiv weiter (Zurückziehen, damit erneut gesendet werden kann)
    const withdrawn = executeWithdrawSend(after, DEMO_IDS.dmrlVehicle, user(after, DEMO_IDS.admin), "Test", AT)
    if (!withdrawn.ok) throw new Error(withdrawn.message)
    expect(sendPreview(withdrawn.data, dmrl(withdrawn.data, DEMO_IDS.dmrlVehicle), AT).versionIndex).toBe("00014-2026")
  })

  it("Vorgabe aus vergangenem Jahr: 00001 im neuen Jahr mit Hinweis in der Vorschau", () => {
    const data = withPreset("00013-2026")
    expect(sendPreview(data, dmrl(data, DEMO_IDS.dmrlVehicle), "2027-01-02T10:00:00.000Z")).toMatchObject({
      versionIndex: "00001-2027",
      expiredPreset: "00013-2026",
    })
  })

  it("abgelaufene Vorgabe 00001 wird nicht gemeldet (gleiches Ergebnis)", () => {
    const data = withPreset("00001-2026")
    expect(sendPreview(data, dmrl(data, DEMO_IDS.dmrlVehicle), "2027-01-02T10:00:00.000Z").expiredPreset).toBeNull()
  })

  it("Altbestand ohne Vorgabe: unverändert 00001", () => {
    const demo = buildDemoDataset()
    const data = { ...demo, dmrls: demo.dmrls.map((d) => ({ ...d, firstSendVersionIndex: undefined })) }
    expect(sendPreview(data, dmrl(data, DEMO_IDS.dmrlVehicle), AT).versionIndex).toBe("00001-2026")
  })

  it("bei vorhandenen SENDs wirkt die Vorgabe nicht (PHUNGUN)", () => {
    const demo = buildDemoDataset()
    const data = { ...demo, dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, firstSendVersionIndex: "00050-2026" } : d)) }
    const withdrawn = executeWithdrawSend(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.admin), "Test", AT)
    if (!withdrawn.ok) throw new Error(withdrawn.message)
    expect(sendPreview(withdrawn.data, dmrl(withdrawn.data, DEMO_IDS.dmrlPhungun), AT).versionIndex).toBe("00003-2026")
  })
})

describe("XML-Inhalt", () => {
  it("erster SEND: dmlref auf sich selbst (issno 001), Kopf aus DMRL, alle Einträge nach DMC, BREX bei 4.2, Bemerkung", () => {
    const demo = buildDemoDataset()
    const prepared = prepareSend(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), C1234, "  Bitte bis Monatsende prüfen.  ", AT)
    const parsed = readDml(prepared.xml, "4.2")
    expect(parsed.header).toMatchObject({
      direction: "send",
      dmlc: { modelic: "GTFDEMO", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00001" },
      issno: { issno: "001", inwork: "00", type: "new" },
      issdate: { day: "13", month: "11", year: "2026" },
      security: "01",
      remarks: "Bitte bis Monatsende prüfen.",
    })
    expect(parsed.header.dmlref?.dmlc).toEqual(prepared.dmlc)
    expect(parsed.header.dmlref?.issno?.issno).toBe("001")
    expect(parsed.entries).toHaveLength(10)
    expect(prepared.xml).toContain('modelIdentCode="S1000D" systemDiffCode="F"')
  })

  it("nach einem REPLY: dmlref auf den letzten REPLY; kein answer, Einträge ohne Eintragstyp ohne Attribut", () => {
    const data = phungunWithdrawn()
    // früherer REPLY hat Antworten hinterlassen
    data.entries = data.entries.map((e, i) => (i === 0 ? { ...e, fields: { ...e.fields, answer: "y", answer_comment: "ok", dmentryType: "" } } : e))
    const prepared = prepareSend(data, dmrl(data, DEMO_IDS.dmrlPhungun), C1234, "", AT)
    const parsed = readDml(prepared.xml, "2.3")
    expect(parsed.header.dmlref?.dmlc).toEqual({ modelic: "PHUNGUN", sendid: "C1234", dmltype: "c", diyear: "2026", seqnum: "00001" })
    expect(parsed.entries).toHaveLength(32)
    expect(prepared.xml).not.toContain("<answer")
    expect(parsed.entries.filter((f) => f.dmentryType === "")).toHaveLength(1)
    const asItems = parsed.entries.map((fields) => ({ fields }))
    expect(asItems).toEqual([...asItems].sort(compareByDmc))
  })
})

describe("Wirkung", () => {
  it("Archiv byte-genau, Einträge n/c/d gesendet, übrige unverändert, DMRL gesendet, Verlauf, Empfänger verwendet", () => {
    const demo = buildDemoDataset()
    // ein Eintrag ohne Eintragstyp, freigegeben aus früherem Zyklus
    demo.entries = demo.entries.map((e) =>
      e.id === demo.entries.find((x) => x.dmrlId === DEMO_IDS.dmrlVehicle)!.id ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "" } } : e
    )
    expect(isOrganisationUsedInWorkflow(demo, C1234)).toBe(true) // bereits durch PHUNGUN
    const { data, prepared } = send(demo, DEMO_IDS.dmrlVehicle)
    const archived = data.archive.at(-1)!
    expect(archived).toMatchObject({
      direction: "send",
      versionIndex: "00001-2026",
      fileName: "DML-GTFDEMO-D0815-C-2026-00001_001-00.XML",
      partnerOrganisationId: C1234,
      createdByUserId: DEMO_IDS.editorBen,
      createdAt: AT,
      withdrawn: null,
    })
    expect(archived.content).toBe(prepared.xml)
    const statuses = data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle).map((e) => e.status)
    expect(statuses.filter((s) => s === "gesendet")).toHaveLength(9)
    expect(statuses.filter((s) => s === "freigegeben")).toHaveLength(1)
    expect(dmrl(data, DEMO_IDS.dmrlVehicle).status).toBe("gesendet")
    expect(currentVersionIndex(data, DEMO_IDS.dmrlVehicle)).toBe("00001-2026")
    expect(data.history.at(-1)).toMatchObject({ action: "send", details: "SEND 00001-2026 an C1234 Partner Systemtechnik GmbH" })
    expect(datasetSchema.safeParse(data).success).toBe(true)
    // ein zweiter SEND ist jetzt gesperrt
    expect(executeSend(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), prepared)).toMatchObject({ ok: false })
  })

  it("lehnt ab bei geändertem Versionsindex (paralleler Tab) und ohne gültigen Empfänger", () => {
    const demo = buildDemoDataset()
    const prepared = prepareSend(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), C1234, "", AT)
    expect(executeSend(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), { ...prepared, versionIndex: "00009-2026" })).toEqual({
      ok: false,
      message: "Der Versionsindex hat sich inzwischen geändert. Bitte erneut senden.",
    })
    expect(executeSend(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), { ...prepared, partnerOrganisationId: "org-d0815" })).toEqual({
      ok: false,
      message: "Bitte einen Empfänger auswählen.",
    })
  })

  it("fehlgeschlagene XSD-Prüfung: nur Verlaufseintrag", () => {
    const demo = buildDemoDataset()
    const after = recordFailedSend(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), 3, AT)
    expect(after.history.at(-1)).toMatchObject({ action: "send_fehlgeschlagen", details: "SEND fehlgeschlagen — XSD-Prüfung (3 Fehler)" })
    expect(after.archive).toBe(demo.archive)
    expect(after.entries).toBe(demo.entries)
  })
})

describe("Rundlauf mit der REPLY-Prüfung (PROJ-8)", () => {
  it("eine Empfänger-Antwort auf den archivierten SEND ist fehlerfrei", () => {
    const { data } = send(buildDemoDataset(), DEMO_IDS.dmrlAircraft, AT, DEMO_IDS.editorBen)
    const archived = data.archive.at(-1)!
    const sent = readDml(archived.content, "5.0")
    const reply = writeDml(
      {
        header: {
          ...sent.header,
          direction: "reply",
          dmlc: { ...sent.header.dmlc, sendid: "C1234", seqnum: "00001" },
          dmlref: { dmlc: sent.header.dmlc, issno: { issno: "001", inwork: "00", type: "" } },
        },
        entries: sent.entries.map((f) => ({ ...f, answer: "y" })),
      },
      "5.0",
      { answers: true }
    )
    const result = runReplyCheck(reply, {
      issue: "5.0",
      systemModelic: "THSDEMO",
      dmlType: "c",
      dmrlStatus: "gesendet",
      lastSend: { dmlc: archived.dmlc, partnerCode: "C1234", entries: sent.entries },
      archivedReplies: [],
    })
    expect(result.report.findings).toEqual([])
    expect(result.summary).toMatchObject({ geprueft: 10, freigegeben: 10, zuUeberarbeiten: 0 })
  })
})

describe("Zurückziehen", () => {
  it("DMRL und gesendete Einträge → in Bearbeitung, Archiv markiert, Verlauf; nächster SEND 00003", () => {
    const data = phungunWithdrawn()
    expect(dmrl(data, DEMO_IDS.dmrlPhungun).status).toBe("in_bearbeitung")
    expect(data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun).every((e) => e.status === "in_bearbeitung")).toBe(true)
    const withdrawn = data.archive.find((a) => a.withdrawn)!
    expect(withdrawn.versionIndex).toBe("00002-2026")
    expect(withdrawn.withdrawn).toEqual({ at: AT, userId: DEMO_IDS.admin, reason: "Empfänger antwortet nicht" })
    expect(data.history.at(-1)?.details).toBe("SEND 00002-2026 zurückgezogen — Empfänger antwortet nicht")
    expect(datasetSchema.safeParse(data).success).toBe(true)
    // Kopfbereich zeigt wieder den letzten gültigen SEND
    expect(currentVersionIndex(data, DEMO_IDS.dmrlPhungun)).toBe("00001-2026")
    const again = send(data, DEMO_IDS.dmrlPhungun, AT, DEMO_IDS.editorAnna)
    expect(again.prepared.versionIndex).toBe("00003-2026")
  })

  it("verlangt eine Begründung und einen Administrator", () => {
    const demo = buildDemoDataset()
    expect(executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "   ")).toEqual({
      ok: false,
      message: "Bitte eine Begründung angeben.",
    })
    expect(executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.editorAnna), "x")).toMatchObject({ ok: false })
  })
})
