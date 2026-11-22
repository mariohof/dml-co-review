import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { readDml } from "@/lib/data/dml-reader"
import type { Dataset, Dmrl, User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { executeCheckOut } from "./check-out"
import { exportBlocked, exportCsv, exportXml, NO_ENTRIES } from "./export"
import { executeWithdrawSend } from "./send"

const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0
const AT = "2026-11-12T10:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl

describe("Verfügbarkeit", () => {
  it("jederzeit für Berechtigte — auch bei Status gesendet und fremder Sperre; sonst keine Berechtigung", () => {
    const demo = buildDemoDataset()
    expect(exportBlocked(dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.editorAnna))).toBeNull() // gesendet
    const locked = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), AT)
    if (!locked.ok) throw new Error()
    expect(exportBlocked(dmrl(locked.data, DEMO_IDS.dmrlVehicle), user(locked.data, DEMO_IDS.admin))).toBeNull()
    expect(exportBlocked(dmrl(demo, DEMO_IDS.dmrlAircraft), user(demo, DEMO_IDS.editorAnna))).toBe("Keine Berechtigung für diese DMRL.")
  })
})

describe("CSV", () => {
  it("PHUNGUN am 12.11.2026: Dateiname und Aufbau wie Check-out; Datenbestand unverändert", () => {
    const demo = buildDemoDataset()
    const snapshot = JSON.stringify(demo)
    const file = exportCsv(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), AT)
    expect(file.fileName).toBe("DML-PHUNGUN-D0815-C-Export-2026-11-12.csv")
    expect(file.content).toBe(writeEntriesCsv(demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)))
    expect(JSON.stringify(demo)).toBe(snapshot)
  })

  it("DMRL ohne Einträge: nur Kopfzeile", () => {
    const demo = buildDemoDataset()
    demo.entries = demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlVehicle)
    expect(exportCsv(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), AT).content.trim().split("\r\n")).toHaveLength(1)
  })

  it("bei fremder Sperre: Stand der Anwendung", () => {
    const demo = buildDemoDataset()
    const locked = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), AT)
    if (!locked.ok) throw new Error()
    expect(exportCsv(locked.data, dmrl(locked.data, DEMO_IDS.dmrlVehicle), AT).content).toBe(exportCsv(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), AT).content)
  })
})

describe("XML", () => {
  it("PHUNGUN (letzter SEND 00002-2026): Dateiname _000-01, issno 000 / inwork 01, dmlref letzter REPLY, Export-Hinweis, ohne answer", () => {
    const demo = buildDemoDataset()
    const file = exportXml(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), AT)
    expect(file.fileName).toBe("DML-PHUNGUN-D0815-C-2026-00002_000-01.XML")
    const parsed = readDml(file.content, "2.3")
    expect(parsed.header).toMatchObject({
      direction: "send",
      dmlc: { modelic: "PHUNGUN", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00002" },
      issno: { issno: "000", inwork: "01" },
      issdate: { day: "12", month: "11", year: "2026" },
      remarks: "Export vom 12.11.2026 — kein offizieller Austauschstand",
    })
    expect(parsed.header.dmlref?.dmlc).toMatchObject({ sendid: "C1234", seqnum: "00001" })
    expect(parsed.entries).toHaveLength(32)
    expect(file.content).not.toContain("<answer")
  })

  it("nie gesendet: seqnum 00001 (Schema verlangt eine positive Zahl), aktuelles Jahr, dmlref auf sich selbst", () => {
    const demo = buildDemoDataset()
    const file = exportXml(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), "2027-03-01T10:00:00.000Z")
    expect(file.fileName).toBe("DML-GTFDEMO-D0815-C-2027-00001_000-01.XML")
    const parsed = readDml(file.content, "4.2")
    expect(parsed.header.dmlc).toMatchObject({ diyear: "2027", seqnum: "00001" })
    expect(parsed.header.dmlref?.dmlc).toEqual(parsed.header.dmlc)
  })

  it("nie gesendet mit Vorgabe 00013-2026 (PROJ-6): Export trägt 00013-2026; abgelaufene Vorgabe → 00001", () => {
    const demo = buildDemoDataset()
    const data = { ...demo, dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, firstSendVersionIndex: "00013-2026" } : d)) }
    expect(exportXml(data, dmrl(data, DEMO_IDS.dmrlVehicle), AT).fileName).toBe("DML-GTFDEMO-D0815-C-2026-00013_000-01.XML")
    expect(exportXml(data, dmrl(data, DEMO_IDS.dmrlVehicle), "2027-03-01T10:00:00.000Z").fileName).toBe("DML-GTFDEMO-D0815-C-2027-00001_000-01.XML")
  })

  it("letzter SEND zurückgezogen: dmlc vom letzten gültigen SEND; Jahreswechsel behält Jahr/seqnum des SEND", () => {
    const demo = buildDemoDataset()
    const withdrawn = executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "Test", AT)
    if (!withdrawn.ok) throw new Error()
    expect(exportXml(withdrawn.data, dmrl(withdrawn.data, DEMO_IDS.dmrlPhungun), AT).fileName).toBe("DML-PHUNGUN-D0815-C-2026-00001_000-01.XML")
    expect(exportXml(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), "2027-01-05T10:00:00.000Z").fileName).toBe("DML-PHUNGUN-D0815-C-2026-00002_000-01.XML")
  })

  it("keine Einträge: „Die DMRL hat keine Einträge.\"", () => {
    const demo = buildDemoDataset()
    demo.entries = demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlVehicle)
    expect(() => exportXml(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), AT)).toThrow(NO_ENTRIES)
  })

  it.skipIf(!hasXmllint)("besteht die XSD-Prüfung für 2.3, 4.2 und 5.0", async () => {
    const demo = buildDemoDataset()
    for (const [id, issue] of [
      [DEMO_IDS.dmrlPhungun, "2.3"],
      [DEMO_IDS.dmrlVehicle, "4.2"],
      [DEMO_IDS.dmrlAircraft, "5.0"],
    ] as const) {
      const file = exportXml(demo, dmrl(demo, id), AT)
      expect(await validateWithXmllint(new TextEncoder().encode(file.content), issue), issue).toEqual({ state: "gueltig", issue })
    }
  })
})
