import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { User } from "@/lib/data/schema"
import {
  activeUsers,
  canAccessAdministration,
  canAccessDmrl,
  routeAccess,
  visibleDmrls,
} from "./permissions"

const data = buildDemoDataset()
const user = (id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (id: string) => data.dmrls.find((d) => d.id === id)!

const admin = user(DEMO_IDS.admin)
const anna = user(DEMO_IDS.editorAnna)
const ben = user(DEMO_IDS.editorBen)

describe("Rechte-Regel", () => {
  it("erlaubt die Verwaltung nur aktiven Administratoren", () => {
    expect(canAccessAdministration(admin)).toBe(true)
    expect(canAccessAdministration(anna)).toBe(false)
    expect(canAccessAdministration({ ...admin, active: false })).toBe(false)
    expect(canAccessAdministration(null)).toBe(false)
  })

  it("erlaubt Administratoren alle DMRLs", () => {
    expect(data.dmrls.every((d) => canAccessDmrl(admin, d))).toBe(true)
  })

  it("erlaubt Bearbeitern nur berechtigte DMRLs (Demo: Anna PHUNGUN + Fahrzeug + BIKE60, Ben Fahrzeug + Fluggerät)", () => {
    expect(visibleDmrls(data, anna).map((d) => d.id)).toEqual([DEMO_IDS.dmrlPhungun, DEMO_IDS.dmrlVehicle, DEMO_IDS.dmrlBike])
    expect(visibleDmrls(data, ben).map((d) => d.id)).toEqual([DEMO_IDS.dmrlVehicle, DEMO_IDS.dmrlAircraft])
    expect(canAccessDmrl(anna, dmrl(DEMO_IDS.dmrlAircraft))).toBe(false)
  })

  it("verweigert inaktiven Bearbeitern jeden Zugriff, auch bei Berechtigung", () => {
    expect(canAccessDmrl({ ...anna, active: false }, dmrl(DEMO_IDS.dmrlPhungun))).toBe(false)
  })

  it("wirkt eine Rollenänderung sofort (Bearbeiter → Administrator sieht alles)", () => {
    const promoted = { ...anna, role: "administrator" as const }
    expect(visibleDmrls(data, promoted)).toHaveLength(4)
    expect(canAccessAdministration(promoted)).toBe(true)
  })

  it("listet nur aktive Benutzer, sortiert nach Name, inkl. Systemkonto", () => {
    const withInactive = { ...data, users: [...data.users, { ...ben, id: "x", name: "Zora", active: false }] }
    expect(activeUsers(withInactive).map((u) => u.name)).toEqual(["Administrator", "Anna Bearbeitung", "Ben Bearbeiter"])
  })
})

describe("Seitenzugriff (Benutzerwechsel)", () => {
  it.each([
    ["/", DEMO_IDS.editorAnna, "allowed"],
    ["/verwaltung", DEMO_IDS.admin, "allowed"],
    ["/verwaltung/benutzer", DEMO_IDS.editorAnna, "forbidden"],
    [`/dmrl/${DEMO_IDS.dmrlPhungun}`, DEMO_IDS.editorAnna, "allowed"],
    [`/dmrl/${DEMO_IDS.dmrlAircraft}/archiv`, DEMO_IDS.editorAnna, "forbidden"],
    [`/dmrl/${DEMO_IDS.dmrlAircraft}`, DEMO_IDS.editorBen, "allowed"],
    ["/dmrl/gibt-es-nicht", DEMO_IDS.admin, "not_found"],
  ])("%s für %s → %s", (path, userId, expected) => {
    expect(routeAccess(path, data, user(userId))).toBe(expected)
  })
})
