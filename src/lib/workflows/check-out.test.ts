import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, ENTRY_FILE_COLUMNS, type Dataset, type Dmrl, type User } from "@/lib/data/schema"
import { ENTRIES_SHEET_NAME } from "@/lib/files/entries-xlsx"
import { readXlsxSheet } from "@/lib/files/xlsx-reader"
import { readCheckinTable } from "@/lib/rules/check/csv-reader"
import { isDmrlUsedInWorkflow } from "@/lib/rules/workflow-usage"
import {
  checkOutBlocked,
  checkOutFileName,
  executeCancelCheckOut,
  executeCheckOut,
  executeReleaseLock,
  lockXlsx,
  releaseLockBlocked,
} from "./check-out"

const demo = buildDemoDataset()
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const AT = "2026-11-13T09:15:00.000Z"

const checkedOut = () => {
  const result = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), AT)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

describe("Verfügbarkeit", () => {
  it("erlaubt berechtigten Bearbeitern und Administratoren den Check-out", () => {
    expect(checkOutBlocked(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), user(demo, DEMO_IDS.editorBen))).toBeNull()
    expect(checkOutBlocked(demo, dmrl(demo, DEMO_IDS.dmrlAircraft), user(demo, DEMO_IDS.admin))).toBeNull()
  })

  it("sperrt bei Status gesendet (Demo PHUNGUN), ohne Berechtigung und bei bestehender Sperre", () => {
    expect(checkOutBlocked(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), user(demo, DEMO_IDS.editorAnna))).toContain("wartet auf die Antwort")
    expect(checkOutBlocked(demo, dmrl(demo, DEMO_IDS.dmrlAircraft), user(demo, DEMO_IDS.editorAnna))).toContain("Keine Berechtigung")
    const data = checkedOut()
    expect(checkOutBlocked(data, dmrl(data, DEMO_IDS.dmrlVehicle), user(data, DEMO_IDS.editorAnna))).toMatch(
      /^Ausgecheckt von Ben Bearbeiter seit 13\.11\.2026/
    )
  })

  it("erlaubt eine freigegebene DMRL und lässt die Freigabe bestehen", () => {
    const released: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d)),
      entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "" } } : e)),
    }
    const result = executeCheckOut(released, DEMO_IDS.dmrlVehicle, user(released, DEMO_IDS.editorBen), AT)
    expect(result.ok && dmrl(result.data, DEMO_IDS.dmrlVehicle).status).toBe("freigegeben")
  })
})

describe("Check-out", () => {
  it("setzt die Sperre mit Kopie aller Einträge und schreibt einen Verlaufseintrag; Datenbestand bleibt gültig", () => {
    const data = checkedOut()
    const lock = dmrl(data, DEMO_IDS.dmrlVehicle).lock!
    expect(lock).toMatchObject({ userId: DEMO_IDS.editorBen, since: AT })
    expect(lock.entries).toHaveLength(10)
    expect(data.history.at(-1)).toMatchObject({ action: "check_out", userId: DEMO_IDS.editorBen, dmrlId: DEMO_IDS.dmrlVehicle })
    expect(datasetSchema.safeParse(data).success).toBe(true)
    // Check-out allein zählt nicht als Workflow (PROJ-4/5/6)
    expect(isDmrlUsedInWorkflow(data, DEMO_IDS.dmrlVehicle)).toBe(false)
  })

  it("lehnt einen zweiten Check-out ab (zwei Tabs)", () => {
    const data = checkedOut()
    expect(executeCheckOut(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorAnna))).toMatchObject({ ok: false })
  })

  it("bildet den Dateinamen DML-{MI}-{CAGE}-{TYP}-{Jahr}.xlsx (Refinement 2026-11-25)", () => {
    expect(checkOutFileName(demo, dmrl(demo, DEMO_IDS.dmrlPhungun), "2026-05-01T10:00:00Z")).toBe("DML-PHUNGUN-D0815-C-2026.xlsx")
  })

  it("erzeugt die Excel-Datei aus der Kopie: Blatt „Einträge“, 37 Spalten, alle Einträge, inhaltlich identisch beim erneuten Download", () => {
    const data = checkedOut()
    const sheet = readXlsxSheet(lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!, ENTRIES_SHEET_NAME)
    if (!sheet.ok) throw new Error("nicht lesbar")
    expect(sheet.sheetName).toBe("Einträge")
    expect(sheet.rows[0].cells).toEqual([...ENTRY_FILE_COLUMNS])
    expect(readCheckinTable(sheet.rows, "xlsx").candidates).toHaveLength(10)
    // spätere Änderungen am Datenbestand ändern die Kopie nicht
    const changed: Dataset = { ...data, entries: data.entries.map((e) => ({ ...e, fields: { ...e.fields, techname: "X" } })) }
    expect(readXlsxSheet(lockXlsx(dmrl(changed, DEMO_IDS.dmrlVehicle))!, ENTRIES_SHEET_NAME)).toEqual(sheet)
  })

  it("liefert auch für eine Sperre ohne Kopie keine Datei, für jede bestehende Sperre (auch aus der CSV-Zeit) eine .xlsx", () => {
    expect(lockXlsx(dmrl(demo, DEMO_IDS.dmrlVehicle))).toBeNull()
    const data = checkedOut()
    const bytes = lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!
    // ZIP-Kennung „PK“ → .xlsx
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})

describe("Sperre aufheben", () => {
  it("Sperrinhaber nimmt den Check-out zurück; DMRL und Einträge bleiben unverändert", () => {
    const data = checkedOut()
    const result = executeCancelCheckOut(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).lock).toBeNull()
    expect(result.data.entries).toEqual(demo.entries)
    expect(result.data.history.at(-1)?.action).toBe("check_out_zurueckgenommen")
  })

  it("andere Bearbeiter können weder zurücknehmen noch aufheben", () => {
    const data = checkedOut()
    expect(executeCancelCheckOut(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorAnna))).toMatchObject({ ok: false })
    expect(releaseLockBlocked(dmrl(data, DEMO_IDS.dmrlVehicle), user(data, DEMO_IDS.editorAnna))).not.toBeNull()
  })

  it("Administrator hebt eine fremde Sperre auf; Verlauf nennt den Sperrinhaber", () => {
    const data = checkedOut()
    const result = executeReleaseLock(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.admin))
    expect(result.ok && dmrl(result.data, DEMO_IDS.dmrlVehicle).lock).toBeNull()
    expect(result.ok && result.data.history.at(-1)?.details).toBe("Sperre aufgehoben durch Administrator (Sperrinhaber: Ben Bearbeiter)")
  })
})
