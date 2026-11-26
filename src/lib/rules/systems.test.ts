import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type DmrlSystem } from "@/lib/data/schema"
import { createSystem, deleteSystem, systemFormSchema, systemRights, systemState, updateSystem } from "./systems"

const demo = buildDemoDataset()
const system = (data: Dataset, id: string) => data.systems.find((s) => s.id === id) as DmrlSystem

/** Demo-Bestand plus System ohne DMRL */
const withFreeSystem: Dataset = {
  ...demo,
  systems: [...demo.systems, { id: "sys-frei", name: "Wasseraufbereitung", description: "", s1000dIssue: "2.3", modelic: "WAA" }],
}

const valid = { name: "Feldküche", s1000dIssue: "4.2", modelic: "fk01", description: "  Mobile Feldküche  " }

describe("Prüfung", () => {
  const schema = systemFormSchema(demo)

  it("normalisiert MI (Großbuchstaben) und Randleerzeichen", () => {
    expect(schema.parse(valid)).toEqual({ name: "Feldküche", s1000dIssue: "4.2", modelic: "FK01", description: "Mobile Feldküche" })
  })

  it.each([
    [{ name: "" }, "Bitte eine Bezeichnung"],
    [{ name: "phungun" }, "Bezeichnung bereits vergeben"],
    [{ name: "x".repeat(121) }, "höchstens 120"],
    [{ s1000dIssue: "" }, "S1000D-Issue wählen"],
    [{ s1000dIssue: "7.0" }, "S1000D-Issue wählen"],
    [{ modelic: "" }, "Model Ident Code eingeben"],
    [{ modelic: "A" }, "2–14"],
    [{ modelic: "A".repeat(15) }, "2–14"],
    [{ modelic: "PH-UN" }, "2–14"],
    [{ modelic: "GTFDÄMO" }, "2–14"],
    [{ modelic: "phungun" }, "Model Ident Code bereits vergeben"],
    [{ description: "x".repeat(501) }, "höchstens 500"],
  ])("lehnt %o ab", (override, message) => {
    expect(schema.safeParse({ ...valid, ...override }).error?.issues[0].message).toContain(message)
  })
})

describe("Zustand und Rechte", () => {
  it("ermittelt die Zustände der Demo-Systeme", () => {
    expect(systemState(demo, DEMO_IDS.sysPhungun)).toBe("benutzt")
    expect(systemState(demo, DEMO_IDS.sysVehicle)).toBe("dmrl_ohne_workflow")
    expect(systemState(withFreeSystem, "sys-frei")).toBe("keine_dmrl")
  })

  it("keine DMRL: alles änderbar und löschbar", () => {
    const rights = systemRights(withFreeSystem, system(withFreeSystem, "sys-frei"))
    expect(Object.values(rights.fieldBlocked).every((v) => v === null)).toBe(true)
    expect(rights.deleteBlocked).toBeNull()
  })

  it("DMRL ohne Workflow: MI und Bezeichnung fest, Issue und Beschreibung änderbar, Löschen gesperrt", () => {
    const rights = systemRights(demo, system(demo, DEMO_IDS.sysVehicle))
    expect(rights.fieldBlocked).toEqual({
      name: "Fest, da eine DMRL existiert.",
      s1000dIssue: null,
      modelic: "Fest, da eine DMRL existiert.",
      description: null,
    })
    expect(rights.deleteBlocked).toBe("Zum System existiert eine DMRL. Löschen Sie zuerst die DMRL.")
  })

  it("im Workflow benutzt: nur Beschreibung änderbar, Löschen dauerhaft gesperrt", () => {
    const rights = systemRights(demo, system(demo, DEMO_IDS.sysPhungun))
    expect(rights.fieldBlocked.description).toBeNull()
    expect(rights.fieldBlocked.s1000dIssue).toContain("Workflows")
    expect(rights.deleteBlocked).toContain("an Workflows beteiligt")
  })
})

describe("Anlegen, Bearbeiten, Löschen", () => {
  it("legt ein System an; Datenbestand bleibt gültig", () => {
    const result = createSystem(demo, valid, "sys-neu")
    expect(result.ok && result.data.systems.at(-1)).toMatchObject({ id: "sys-neu", modelic: "FK01" })
    expect(result.ok && datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("ändert bei DMRL ohne Workflow die Issue, aber nicht MI oder Bezeichnung", () => {
    const vehicle = system(demo, DEMO_IDS.sysVehicle)
    const base = { name: vehicle.name, s1000dIssue: vehicle.s1000dIssue as string, modelic: vehicle.modelic, description: vehicle.description }
    const changed = updateSystem(demo, vehicle.id, { ...base, s1000dIssue: "5.0" })
    expect(changed.ok && system(changed.data, vehicle.id).s1000dIssue).toBe("5.0")
    expect(updateSystem(demo, vehicle.id, { ...base, modelic: "GTFNEU" })).toMatchObject({ ok: false })
    expect(updateSystem(demo, vehicle.id, { ...base, name: "Anderer Name" })).toMatchObject({ ok: false })
  })

  it("ändert bei benutzten Systemen nur die Beschreibung", () => {
    const phungun = system(demo, DEMO_IDS.sysPhungun)
    const base = { name: phungun.name, s1000dIssue: phungun.s1000dIssue as string, modelic: phungun.modelic, description: phungun.description }
    expect(updateSystem(demo, phungun.id, { ...base, description: "Neu" })).toMatchObject({ ok: true })
    expect(updateSystem(demo, phungun.id, { ...base, s1000dIssue: "4.2" })).toMatchObject({ ok: false })
  })

  it("löscht nur Systeme ohne DMRL", () => {
    const deleted = deleteSystem(withFreeSystem, "sys-frei")
    expect(deleted.ok && deleted.data.systems.some((s) => s.id === "sys-frei")).toBe(false)
    expect(deleteSystem(demo, DEMO_IDS.sysVehicle)).toMatchObject({ ok: false })
    expect(deleteSystem(demo, DEMO_IDS.sysPhungun)).toMatchObject({ ok: false })
  })
})
