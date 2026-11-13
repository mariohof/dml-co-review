import { describe, expect, it } from "vitest"

import { canAccessDmrl } from "@/lib/auth/permissions"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset, Dmrl, User } from "@/lib/data/schema"
import { editorOptions, hasActiveEditors, permittedEditors, setDmrlEditors } from "./permissions-admin"

const demo = buildDemoDataset()
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User

const withUsers = (changes: (u: User) => User): Dataset => ({ ...demo, users: demo.users.map(changes) })

describe("Auswahlliste", () => {
  it("bietet aktive Bearbeiter an, markiert berechtigte, ohne Administratoren (Demo Fahrzeug)", () => {
    const options = editorOptions(demo, dmrl(demo, DEMO_IDS.dmrlVehicle))
    expect(options.map((o) => [o.user.name, o.checked])).toEqual([
      ["Anna Bearbeitung", true],
      ["Ben Bearbeiter", true],
    ])
    expect(options.some((o) => o.user.role === "administrator")).toBe(false)
  })

  it("zeigt inaktive Bearbeiter nur, wenn sie bereits berechtigt sind", () => {
    const data = withUsers((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u))
    expect(editorOptions(data, dmrl(data, DEMO_IDS.dmrlPhungun)).map((o) => o.user.name)).toEqual(["Anna Bearbeitung"])
    const aircraft = editorOptions(data, dmrl(data, DEMO_IDS.dmrlAircraft))
    expect(aircraft.find((o) => o.user.id === DEMO_IDS.editorBen)).toMatchObject({ inactive: true, checked: true })
  })

  it("sperrt den Sperrinhaber mit Hinweis", () => {
    const data: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) =>
        d.id === DEMO_IDS.dmrlVehicle ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-13T08:00:00.000Z", entries: [] } } : d
      ),
    }
    const ben = editorOptions(data, dmrl(data, DEMO_IDS.dmrlVehicle)).find((o) => o.user.id === DEMO_IDS.editorBen)
    expect(ben?.locked).toBe("Ben Bearbeiter hat die DMRL ausgecheckt und kann erst nach dem Check-in entfernt werden.")
  })

  it("erkennt, ob aktive Bearbeiter existieren", () => {
    expect(hasActiveEditors(demo)).toBe(true)
    expect(hasActiveEditors(withUsers((u) => (u.role === "bearbeiter" ? { ...u, active: false } : u)))).toBe(false)
  })

  it("listet berechtigte Bearbeiter für die Spalte „Bearbeiter\"", () => {
    expect(permittedEditors(demo, dmrl(demo, DEMO_IDS.dmrlAircraft)).map((u) => u.name)).toEqual(["Ben Bearbeiter"])
  })
})

describe("Speichern", () => {
  it("vergibt eine Berechtigung; der Bearbeiter sieht die DMRL danach", () => {
    const result = setDmrlEditors(demo, DEMO_IDS.dmrlAircraft, [DEMO_IDS.editorAnna, DEMO_IDS.editorBen])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(canAccessDmrl(user(result.data, DEMO_IDS.editorAnna), dmrl(result.data, DEMO_IDS.dmrlAircraft))).toBe(true)
  })

  it("entzieht eine Berechtigung; leere Auswahl ist erlaubt", () => {
    const result = setDmrlEditors(demo, DEMO_IDS.dmrlPhungun, [])
    expect(result.ok && dmrl(result.data, DEMO_IDS.dmrlPhungun).editorUserIds).toEqual([])
    expect(result.ok && canAccessDmrl(user(result.data, DEMO_IDS.editorAnna), dmrl(result.data, DEMO_IDS.dmrlPhungun))).toBe(false)
  })

  it("verhindert das Entfernen des Sperrinhabers", () => {
    const data: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) =>
        d.id === DEMO_IDS.dmrlVehicle ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-13T08:00:00.000Z", entries: [] } } : d
      ),
    }
    expect(setDmrlEditors(data, DEMO_IDS.dmrlVehicle, [DEMO_IDS.editorAnna])).toMatchObject({ ok: false })
  })

  it("verhindert das neue Berechtigen inaktiver Bearbeiter und von Administratoren", () => {
    const data = withUsers((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u))
    expect(setDmrlEditors(data, DEMO_IDS.dmrlPhungun, [DEMO_IDS.editorAnna, DEMO_IDS.editorBen])).toMatchObject({ ok: false })
    expect(setDmrlEditors(demo, DEMO_IDS.dmrlPhungun, [DEMO_IDS.admin])).toMatchObject({ ok: false })
  })

  it("erlaubt das Entfernen eines inaktiven Bearbeiters", () => {
    const data = withUsers((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u))
    const result = setDmrlEditors(data, DEMO_IDS.dmrlAircraft, [])
    expect(result.ok && dmrl(result.data, DEMO_IDS.dmrlAircraft).editorUserIds).toEqual([])
  })

  it("behält Berechtigungen beförderter Administratoren gespeichert; nach Rückstufung wirken sie wieder", () => {
    const promoted = withUsers((u) => (u.id === DEMO_IDS.editorAnna ? { ...u, role: "administrator" } : u))
    const result = setDmrlEditors(promoted, DEMO_IDS.dmrlVehicle, [DEMO_IDS.editorBen])
    expect(result.ok && dmrl(result.data, DEMO_IDS.dmrlVehicle).editorUserIds).toEqual([DEMO_IDS.editorAnna, DEMO_IDS.editorBen])
  })
})
