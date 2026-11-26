import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset, User } from "@/lib/data/schema"
import { executeCheckOut } from "@/lib/workflows/check-out"
import { executeWithdrawSend } from "@/lib/workflows/send"
import {
  applyDashboardFilter,
  dashboardFilterQuery,
  dashboardRows,
  dashboardStats,
  EMPTY_DASHBOARD_FILTER,
  myTasks,
  parseDashboardFilter,
} from "./dashboard"

const demo = buildDemoDataset()
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User

describe("Kennzahlen und Tabelle", () => {
  it("Administrator, Demo: Bestände 4, Offene SEND 1, Offene Änderungen 32, Freigegeben 0", () => {
    expect(dashboardStats(dashboardRows(demo, user(demo, DEMO_IDS.admin)))).toEqual({ bestaende: 4, offeneSend: 1, offeneAenderungen: 32, freigegeben: 0 })
  })

  it("Anna Bearbeitung sieht nur PHUNGUN, Fahrzeug und BIKE60", () => {
    const rows = dashboardRows(demo, user(demo, DEMO_IDS.editorAnna))
    expect(rows.map((r) => r.system?.modelic).sort()).toEqual(["GTFDEMO", "PHUNGUN", "S1000DBIKE"])
    expect(dashboardStats(rows)).toEqual({ bestaende: 3, offeneSend: 1, offeneAenderungen: 22, freigegeben: 0 })
  })

  it("Zeilenwerte: Kennung, Version, Einträge, Fortschritt; sortiert nach Systemname", () => {
    const rows = dashboardRows(demo, user(demo, DEMO_IDS.admin))
    expect(rows.map((r) => r.system?.name)).toEqual([...rows.map((r) => r.system?.name)].sort((a, b) => (a ?? "").localeCompare(b ?? "", "de")))
    const phungun = rows.find((r) => r.dmrl.id === DEMO_IDS.dmrlPhungun)!
    expect(phungun).toMatchObject({ ident: "PHUNGUN–D0815–C", version: "00002-2026", entryCount: 32, released: 0 })
    expect(rows.find((r) => r.dmrl.id === DEMO_IDS.dmrlVehicle)?.version).toBeNull()
  })

  it("Offene Änderungen zählt in Bearbeitung + zu überarbeiten (3 + 2 = 5)", () => {
    const data = structuredClone(demo)
    const vehicle = data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)
    vehicle.forEach((e, i) => (e.status = i < 3 ? "in_bearbeitung" : i < 5 ? "zu_ueberarbeiten" : "gesendet"))
    const row = dashboardRows(data, user(data, DEMO_IDS.admin)).find((r) => r.dmrl.id === DEMO_IDS.dmrlVehicle)!
    expect(row).toMatchObject({ open: 5, rework: 2 })
  })

  it("zurückgezogener SEND: Version zeigt den letzten gültigen SEND", () => {
    const result = executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "Test")
    if (!result.ok) throw new Error()
    expect(dashboardRows(result.data, user(result.data, DEMO_IDS.admin)).find((r) => r.dmrl.id === DEMO_IDS.dmrlPhungun)?.version).toBe("00001-2026")
  })
})

describe("Meine Aufgaben", () => {
  it("ausgecheckt, zu überarbeiten, wartet auf REPLY (ab 1 Tag); Sperrinhaber inaktiv", () => {
    const out = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), "2026-11-10T08:00:00.000Z")
    if (!out.ok) throw new Error()
    const data = out.data
    const firstPhungun = data.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)!
    data.entries = data.entries.map((e) => (e.id === firstPhungun.id ? { ...e, status: "zu_ueberarbeiten" } : e))
    const ben = user(data, DEMO_IDS.editorBen)
    const now = new Date("2026-11-13T12:00:00.000Z")
    const texts = myTasks(dashboardRows(data, ben), ben, now).map((t) => t.text)
    expect(texts).toEqual(["Von Ihnen ausgecheckt: Geschütztes Transportfahrzeug seit 10.11.2026"]) // PHUNGUN ist für Ben nicht sichtbar
    // Anna (PHUNGUN + Fahrzeug): abgelehnte Einträge und wartender SEND, aber nicht die fremde Sperre
    const anna = user(data, DEMO_IDS.editorAnna)
    const annaTexts = myTasks(dashboardRows(data, anna), anna, now).map((t) => t.text)
    expect(annaTexts).toContain("1 Eintrag zu überarbeiten: PHUNGUN")
    expect(annaTexts.some((t) => /^Wartet seit \d+ Tagen auf REPLY: PHUNGUN$/.test(t))).toBe(true)
    expect(annaTexts.some((t) => t.startsWith("Von Ihnen ausgecheckt"))).toBe(false)
    // inaktiver Sperrinhaber
    data.users = data.users.map((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u))
    expect(dashboardRows(data, user(data, DEMO_IDS.admin)).find((r) => r.dmrl.id === DEMO_IDS.dmrlVehicle)?.lockUser).toMatchObject({ inactive: true })
  })

  it("wartet weniger als einen Tag: keine Aufgabe; ohne Aufgaben leer", () => {
    const admin = user(demo, DEMO_IDS.admin)
    const rows = dashboardRows(demo, admin)
    const sentAt = rows.find((r) => r.dmrl.id === DEMO_IDS.dmrlPhungun)!.sentAt!
    expect(myTasks(rows, admin, new Date(new Date(sentAt).getTime() + 60 * 60 * 1000))).toEqual([])
  })
})

describe("Filter", () => {
  const rows = dashboardRows(demo, user(demo, DEMO_IDS.admin))
  const names = (filter: Partial<typeof EMPTY_DASHBOARD_FILTER>) => applyDashboardFilter(rows, { ...EMPTY_DASHBOARD_FILTER, ...filter }).map((r) => r.system?.modelic)

  it("Kacheln, Status (mehrfach), Issue, Suche nach Name/MI", () => {
    expect(names({ kachel: "send" })).toEqual(["PHUNGUN"])
    expect(names({ kachel: "aenderungen" }).sort()).toEqual(["GTFDEMO", "S1000DBIKE", "THSDEMO"])
    expect(names({ kachel: "freigegeben" })).toEqual([])
    expect(names({ status: ["gesendet", "in_bearbeitung"] })).toHaveLength(4)
    expect(names({ issue: "4.2" })).toEqual(["GTFDEMO"])
    expect(names({ issue: "6.0" })).toEqual(["S1000DBIKE"])
    expect(names({ suche: "phun" })).toEqual(["PHUNGUN"])
    expect(names({ suche: "Transporthubschrauber" })).toEqual(["THSDEMO"])
  })

  it("Filterzustand in der Adresse: hin und zurück", () => {
    const filter = { kachel: "send" as const, status: ["gesendet" as const], issue: "2.3" as const, suche: "PHUN" }
    const query = dashboardFilterQuery(filter)
    expect(query).toBe("?kachel=send&status=gesendet&issue=2.3&suche=PHUN")
    expect(parseDashboardFilter(new URLSearchParams(query.slice(1)))).toEqual(filter)
    expect(parseDashboardFilter(new URLSearchParams("kachel=x&issue=9.9&status=foo"))).toEqual(EMPTY_DASHBOARD_FILTER)
  })
})
