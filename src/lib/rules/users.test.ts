import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type User } from "@/lib/data/schema"
import {
  canEditUser,
  createUser,
  deactivationBlockers,
  isNameTaken,
  setUserActive,
  updateUser,
  userFormSchema,
} from "./users"

const demo = buildDemoDataset()
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User

describe("Namensprüfung", () => {
  const schema = userFormSchema(demo)

  it("entfernt Randleerzeichen und akzeptiert gültige Namen", () => {
    expect(schema.parse({ name: "  Carla Neu  ", role: "bearbeiter" })).toEqual({ name: "Carla Neu", role: "bearbeiter" })
  })

  it.each([
    ["", "Bitte einen Namen eingeben."],
    ["   ", "Bitte einen Namen eingeben."],
    ["A", "mindestens 2 Zeichen"],
    ["x".repeat(81), "höchstens 80 Zeichen"],
    ["anna bearbeitung", "bereits vergeben"],
    ["ADMINISTRATOR", "bereits vergeben"],
  ])("lehnt „%s\" ab", (name, message) => {
    const result = schema.safeParse({ name, role: "bearbeiter" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain(message)
  })

  it("verlangt eine Rolle", () => {
    expect(schema.safeParse({ name: "Carla Neu", role: "" }).success).toBe(false)
  })

  it("erlaubt beim Bearbeiten den eigenen Namen in anderer Schreibweise", () => {
    expect(isNameTaken(demo, "ANNA BEARBEITUNG", DEMO_IDS.editorAnna)).toBe(false)
    expect(userFormSchema(demo, DEMO_IDS.editorAnna).safeParse({ name: "ANNA Bearbeitung", role: "bearbeiter" }).success).toBe(true)
  })
})

describe("Anlegen und Bearbeiten", () => {
  it("legt einen aktiven Benutzer an; Datenbestand bleibt gültig", () => {
    const result = createUser(demo, { name: "Carla Neu", role: "bearbeiter" }, "user-carla")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(user(result.data, "user-carla")).toEqual({
      id: "user-carla", name: "Carla Neu", role: "bearbeiter", active: true, isSystemAccount: false,
    })
    expect(datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("lehnt doppelte Namen beim Anlegen ab", () => {
    expect(createUser(demo, { name: "ben bearbeiter", role: "bearbeiter" }, "x")).toMatchObject({ ok: false })
  })

  it("ändert Name und Rolle eines normalen Benutzers", () => {
    const result = updateUser(demo, DEMO_IDS.editorBen, { name: "Ben Berger", role: "administrator" })
    expect(result.ok && user(result.data, DEMO_IDS.editorBen)).toMatchObject({ name: "Ben Berger", role: "administrator" })
  })

  it("schützt das Systemkonto vor Änderungen", () => {
    expect(canEditUser(user(demo, DEMO_IDS.admin))).toBe(false)
    expect(updateUser(demo, DEMO_IDS.admin, { name: "Admin", role: "bearbeiter" })).toMatchObject({ ok: false })
  })
})

describe("Deaktivieren", () => {
  it("sperrt das Systemkonto", () => {
    expect(deactivationBlockers(demo, user(demo, DEMO_IDS.admin), null)).toEqual([
      "Das Systemkonto „Administrator\" kann nicht deaktiviert werden.",
    ])
  })

  it("sperrt die Selbst-Deaktivierung", () => {
    expect(deactivationBlockers(demo, user(demo, DEMO_IDS.editorBen), DEMO_IDS.editorBen)).toEqual([
      "Sie können sich nicht selbst deaktivieren.",
    ])
  })

  it("sperrt einen Benutzer, der den letzten SEND einer gesendeten DMRL ausgelöst hat (Demo: Anna, PHUNGUN)", () => {
    const reasons = deactivationBlockers(demo, user(demo, DEMO_IDS.editorAnna), DEMO_IDS.admin)
    expect(reasons).toEqual([
      "Hat den letzten SEND der DMRL „PHUNGUN\" ausgelöst — wartet auf REPLY zu SEND 00002-2026.",
    ])
  })

  it("erlaubt die Deaktivierung, sobald die DMRL nicht mehr gesendet ist (REPLY übernommen)", () => {
    const afterReply: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, status: "in_bearbeitung" } : d)),
      entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlPhungun ? { ...e, status: "in_bearbeitung" } : e)),
    }
    expect(deactivationBlockers(afterReply, user(afterReply, DEMO_IDS.editorAnna), DEMO_IDS.admin)).toEqual([])
  })

  it("sperrt einen Benutzer mit ausgecheckter DMRL und nennt sie", () => {
    const locked: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) =>
        d.id === DEMO_IDS.dmrlAircraft ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-12T10:00:00.000Z", entries: [] } } : d
      ),
    }
    expect(deactivationBlockers(locked, user(locked, DEMO_IDS.editorBen), DEMO_IDS.admin)).toEqual([
      "Hat die DMRL „Transporthubschrauber\" ausgecheckt.",
    ])
  })

  it("deaktiviert und aktiviert einen Benutzer ohne laufende Vorgänge; Berechtigungen bleiben erhalten", () => {
    const off = setUserActive(demo, DEMO_IDS.editorBen, false, DEMO_IDS.admin)
    expect(off.ok && user(off.data, DEMO_IDS.editorBen).active).toBe(false)
    if (!off.ok) return
    expect(off.data.dmrls.find((d) => d.id === DEMO_IDS.dmrlAircraft)?.editorUserIds).toContain(DEMO_IDS.editorBen)
    const on = setUserActive(off.data, DEMO_IDS.editorBen, true, DEMO_IDS.admin)
    expect(on.ok && user(on.data, DEMO_IDS.editorBen).active).toBe(true)
  })

  it("lehnt die Deaktivierung bei Sperrgründen ab", () => {
    expect(setUserActive(demo, DEMO_IDS.editorAnna, false, DEMO_IDS.admin)).toMatchObject({ ok: false })
  })
})
