import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { parseDml23 } from "@/lib/data/dml-parser-2-3"
import { runReplyCheck, type ReplyContext } from "./reply"
import { errorCount } from "./types"

const ROOT = join(__dirname, "..", "..", "..", "..")
const demoFile = (name: string) => readFileSync(join(ROOT, "public/demo-dateien", name), "utf8")
const demoReply = demoFile("DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")

const demo = buildDemoDataset()
const send2 = parseDml23(DEMO_XML_FILES[DEMO_FILES.send2])

/** Prüfkontext der Demo-DMRL PHUNGUN (wartet auf REPLY zu SEND 00002-2026) */
const context: ReplyContext = {
  issue: "2.3",
  systemModelic: "PHUNGUN",
  dmlType: "c",
  dmrlStatus: "gesendet",
  lastSend: { dmlc: send2.header.dmlc, partnerCode: "C1234", entries: send2.entries },
  archivedReplies: demo.archive.filter((a) => a.direction === "reply" && a.dmrlId === DEMO_IDS.dmrlPhungun).map((a) => a.dmlc),
}

const messages = (xml: string, ctx: ReplyContext = context) => runReplyCheck(xml, ctx).report.findings.map((f) => `${f.group}: ${f.message}`)

describe("REPLY-Prüfung", () => {
  it("Demo-REPLY auf SEND 00002-2026 ist fehlerfrei: 30 freigegeben, 2 zu überarbeiten", () => {
    const result = runReplyCheck(demoReply, context)
    expect(result.report.findings).toEqual([])
    expect(result.summary).toEqual({ geprueft: 32, freigegeben: 30, zuUeberarbeiten: 2 })
  })

  it("Beispieldatei 02 (REPLY auf SEND 00001) wird im Demo-Stand abgelehnt", () => {
    const m = messages(DEMO_XML_FILES[DEMO_FILES.reply1])
    expect(m).toContain("G: REPLY bezieht sich nicht auf den letzten SEND 00002-2026.")
    expect(m).toContain("G: REPLY wurde bereits importiert.")
  })

  describe("Bezug SEND ↔ REPLY (PROJ-12, Refinement 2026-11-20)", () => {
    /** ändert nur den Block /dml/dmlref, nicht /dml/dmlc des REPLY */
    const withDmlref = (change: (dmlref: string) => string) =>
      demoReply.replace(/<dmlref>[\s\S]*?<\/dmlref>/, (block) => change(block))
    const notLastSend = "G: REPLY bezieht sich nicht auf den letzten SEND 00002-2026."

    it("dmlref stimmt in allen Feldern mit den Sender-Daten des letzten SEND überein → kein Bezugsfehler", () => {
      expect(messages(demoReply)).not.toContain(notLastSend)
    })

    it.each([
      ["modelic", (b: string) => b.replace("<modelic>PHUNGUN</modelic>", "<modelic>ANDERES</modelic>")],
      ["sendid", (b: string) => b.replace("<sendid>D0815</sendid>", "<sendid>D0816</sendid>")],
      ["dmltype", (b: string) => b.replace('<dmltype type="c"/>', '<dmltype type="s"/>')],
      ["diyear", (b: string) => b.replace("<diyear>2026</diyear>", "<diyear>2025</diyear>")],
      ["seqnum", (b: string) => b.replace("<seqnum>00002</seqnum>", "<seqnum>00003</seqnum>")],
    ])("abweichendes %s im dmlref → REPLY wird abgelehnt", (_field, change) => {
      const xml = withDmlref(change)
      expect(xml).not.toBe(demoReply)
      const result = runReplyCheck(xml, context)
      expect(result.report.findings.map((f) => `${f.group}: ${f.message}`)).toContain(notLastSend)
      expect(errorCount(result.report)).toBeGreaterThan(0)
    })

    it("seqnum des REPLY ist unabhängig von der seqnum des SEND (REPLY 00001-2026 auf SEND 00002-2026)", () => {
      const ownSeqnum = demoReply.replace(/(<dmlc>[\s\S]*?<seqnum>)00002(<\/seqnum>)/, "$100001$2")
      expect(ownSeqnum).not.toBe(demoReply)
      const result = runReplyCheck(ownSeqnum, { ...context, archivedReplies: [] })
      expect(result.report.findings).toEqual([])
      expect(result.parsed?.header.dmlc.seqnum).toBe("00001")
      expect(result.parsed?.header.dmlref?.dmlc.seqnum).toBe("00002")
    })
  })

  it("Testdatei 4: falscher Absender", () => {
    expect(messages(demoFile("TEST-4_Falscher-Absender.XML"))).toContain("G: REPLY stammt nicht vom Empfänger C1234 (Absender ‚C9999').")
  })

  it("lehnt eine Datei mit Richtung send ab", () => {
    expect(messages(demoReply.replace('direction="reply"', 'direction="send"'))).toContain(
      "G: Die Datei ist keine Antwort (Richtung ‚send' statt ‚reply')."
    )
  })

  it("lehnt ab, wenn die DMRL nicht auf eine Antwort wartet", () => {
    expect(messages(demoReply, { ...context, dmrlStatus: "in_bearbeitung" })).toContain("G: Für diese DMRL wird keine Antwort erwartet.")
  })

  it("meldet fehlende und zusätzliche DMCs sowie veränderte Felder", () => {
    const changed = demoReply
      .replace("<chapnum>A00</chapnum>", "<chapnum>Z99</chapnum>")
      .replace("Fristenarbeiten Gerätesatz F1", "Anderer Name")
    const m = messages(changed)
    expect(m).toContain("G: DMC war nicht im SEND enthalten.")
    expect(m).toContain("G: DMC aus dem SEND fehlt im REPLY.")
    expect(m.some((x) => x.startsWith("G: Feld techname wurde gegenüber dem SEND verändert"))).toBe(true)
  })

  it("Regel G: fehlendes security im REPLY ist keine Änderung, abweichendes security schon (Refinement 2026-11-26)", () => {
    // Kopf-security (erstes Vorkommen) bleibt, Einträge ohne security
    let first = true
    const withoutEntrySecurity = demoReply.replace(/\s*<security class="01"\/>/g, (match) => (first ? ((first = false), match) : ""))
    expect(withoutEntrySecurity.match(/<security /g)).toHaveLength(1)
    const result = runReplyCheck(withoutEntrySecurity, context)
    expect(result.report.findings).toEqual([])
    expect(result.candidates.every((c) => c.fields.security === "")).toBe(true)

    let count = 0
    const changed = demoReply.replace(/<security class="01"\/>/g, (match) => (count++ === 1 ? '<security class="02"/>' : match))
    expect(messages(changed).filter((m) => m.startsWith("G: Feld security wurde gegenüber dem SEND verändert"))).toHaveLength(1)
  })

  it("Gruppe H: Antwort fehlt, Antwort ohne Eintragstyp, Begründung fehlt", () => {
    const withoutAnswer = demoReply.replace(/<answer answer="y">\s*<remarks><\/remarks>\s*<\/answer>/, "")
    expect(messages(withoutAnswer)).toContain("H: Antwort fehlt.")
    const noComment = demoReply.replace("Infocode nicht im beauftragten Leistungsumfang", "")
    expect(messages(noComment)).toContain("H: Begründung fehlt.")
    const untyped = demoReply.replace('<dmentry type="d">', "<dmentry>")
    expect(messages(untyped)).toContain("H: Antwort nur bei Eintragstyp n/c/d zulässig.")
  })

  it("erlaubt fehlende Ausgabedaten im REPLY und die Gesamtbemerkung des Empfängers", () => {
    const result = runReplyCheck(demoReply, context)
    expect(result.parsed?.header.remarks).toBe("Bitte abgelehnte Einträge überarbeiten.")
    expect(result.candidates.every((c) => c.fields.issno === "")).toBe(true)
    expect(errorCount(result.report)).toBe(0)
  })

  it("meldet nicht lesbare Dateien", () => {
    expect(messages(demoFile("TEST-3_Kein-gueltiges-XML.XML"))).toEqual(["G: XML ist nicht wohlgeformt"])
  })
})
