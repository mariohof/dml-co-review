import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import type { Dataset, User } from "@/lib/data/schema"
import { readReplyFile } from "@/lib/workflows/reply"
import { executeWithdrawSend } from "@/lib/workflows/send"
import {
  archiveChain,
  archiveEntries,
  archiveFileBytes,
  dmlRefLabel,
  historyEntries,
  organisationLabelById,
  readArchived,
  userLabel,
} from "./archive"

const demo = buildDemoDataset()
const admin = demo.users.find((u) => u.id === DEMO_IDS.admin) as User

describe("Austausch", () => {
  it("PHUNGUN: drei Stände, neueste oben, als Kette", () => {
    const list = archiveEntries(demo, DEMO_IDS.dmrlPhungun)
    expect(list).toHaveLength(3)
    expect(archiveChain(list)).toBe("SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026")
    expect(archiveEntries(demo, DEMO_IDS.dmrlVehicle)).toEqual([])
  })

  it("Bezug: erster SEND auf sich selbst, REPLY auf SEND, zweiter SEND auf REPLY", () => {
    const [send2, reply1, send1] = archiveEntries(demo, DEMO_IDS.dmrlPhungun)
    expect(dmlRefLabel(send1)).toBe("eigener Stand (erster SEND)")
    expect(dmlRefLabel(reply1)).toBe("D0815 00001-2026")
    expect(dmlRefLabel(send2)).toBe("C1234 00001-2026")
  })

  it("liest archivierte Dateien neu ein (REPLY mit Antworten und Partner-Bemerkung)", () => {
    const reply = archiveEntries(demo, DEMO_IDS.dmrlPhungun)[1]
    const parsed = readArchived(demo, reply)!
    expect(parsed.header.direction).toBe("reply")
    expect(parsed.entries.every((f) => f.answer === "y")).toBe(true)
    expect(readArchived(demo, { ...reply, content: "<kaputt" })).toBeNull()
  })

  it("Download byte-genau: CRLF bleibt, UTF-8 und ISO-8859-1 laut Deklaration", () => {
    const original = DEMO_XML_FILES[DEMO_FILES.send1]
    expect(original).toContain("\r\n")
    expect(new TextDecoder().decode(archiveFileBytes(original))).toBe(original)
    const latin1 = '<?xml version="1.0" encoding="ISO-8859-1"?><dml>Gerät</dml>'
    const bytes = archiveFileBytes(latin1)
    expect(bytes.length).toBe(latin1.length)
    expect(bytes[bytes.indexOf(0x47) + 3]).toBe(0xe4)
  })

  it("UTF-16 (BUG-QA1-1): Download als UTF-16 LE mit BOM, Rundlauf über das Lesen beim Import", async () => {
    const text = '\ufeff<?xml version="1.0" encoding="UTF-16"?>\r\n<dml>Gerät</dml>'
    const bytes = archiveFileBytes(text)
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0xff, 0xfe, 0x3c, 0x00])
    expect(bytes.length).toBe(text.length * 2)
    expect(await readReplyFile(new Blob([new Uint8Array(bytes)]))).toEqual({ ok: true, text })
    // ohne BOM im Text: BOM wird ergänzt
    expect([...archiveFileBytes(text.slice(1)).subarray(0, 2)]).toEqual([0xff, 0xfe])
  })

  it("aktuelle Namen über IDs; deaktivierte Benutzer gekennzeichnet; umbenannte Organisation", () => {
    const data: Dataset = {
      ...demo,
      users: demo.users.map((u) => (u.id === DEMO_IDS.editorAnna ? { ...u, active: false } : u)),
      organisations: demo.organisations.map((o) => (o.id === "org-c1234" ? { ...o, name: "Neuer Name GmbH" } : o)),
    }
    expect(userLabel(data, DEMO_IDS.editorAnna)).toEqual({ name: "Anna Bearbeitung", inactive: true })
    expect(organisationLabelById(data, "org-c1234")).toBe("C1234 Neuer Name GmbH")
  })
})

describe("Verlauf", () => {
  it("PHUNGUN-Demo: SEND, REPLY übernommen, SEND — neueste oben; Filter nach Aktionsart", () => {
    expect(historyEntries(demo, DEMO_IDS.dmrlPhungun).map((h) => h.action)).toEqual(["send", "reply_uebernommen", "send"])
    expect(historyEntries(demo, DEMO_IDS.dmrlPhungun, "send")).toHaveLength(2)
    expect(historyEntries(demo, DEMO_IDS.dmrlPhungun, "reply")).toHaveLength(1)
    expect(historyEntries(demo, DEMO_IDS.dmrlPhungun, "checkout")).toHaveLength(0)
  })

  it("zurückgezogener SEND: Archiv markiert, Verlauf enthält den Schritt", () => {
    const result = executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, admin, "Partner antwortet nicht", "2026-11-13T10:00:00.000Z")
    if (!result.ok) throw new Error()
    const [latest] = archiveEntries(result.data, DEMO_IDS.dmrlPhungun)
    expect(latest.withdrawn).toMatchObject({ userId: DEMO_IDS.admin, reason: "Partner antwortet nicht" })
    expect(historyEntries(result.data, DEMO_IDS.dmrlPhungun, "send")[0].details).toBe("SEND 00002-2026 zurückgezogen — Partner antwortet nicht")
  })
})
