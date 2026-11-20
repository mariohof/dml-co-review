import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type Organisation } from "@/lib/data/schema"
import {
  createOrganisation,
  deleteOrganisation,
  organisationFormSchema,
  organisationRights,
  updateOrganisation,
} from "./organisations"
import { isDmrlUsedInWorkflow, isOrganisationUsedInWorkflow, isSystemUsedInWorkflow } from "./workflow-usage"

const demo = buildDemoDataset()
const org = (data: Dataset, id: string) => data.organisations.find((o) => o.id === id) as Organisation

/** Demo-Bestand plus unbenutzte Organisation X0001 und einer DMRL-ohne-Workflow-Zuordnung auf Y0002 */
function withExtraOrgs(): Dataset {
  return {
    ...demo,
    organisations: [
      ...demo.organisations,
      { id: "org-x", code: "X0001", name: "Unbenutzt GmbH" },
      { id: "org-y", code: "Y0002", name: "Zugeordnet AG" },
    ],
    dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, originatorOrganisationId: "org-y" } : d)),
  }
}

describe("Regel „im Workflow benutzt\"", () => {
  it("erkennt die Demo-DMRL PHUNGUN (Archiv) als benutzt, Fahrzeug/Fluggerät nicht", () => {
    expect(isDmrlUsedInWorkflow(demo, DEMO_IDS.dmrlPhungun)).toBe(true)
    expect(isDmrlUsedInWorkflow(demo, DEMO_IDS.dmrlVehicle)).toBe(false)
    expect(isSystemUsedInWorkflow(demo, DEMO_IDS.sysPhungun)).toBe(true)
    expect(isSystemUsedInWorkflow(demo, DEMO_IDS.sysAircraft)).toBe(false)
  })

  it("zählt einen abgeschlossenen Check-in als Workflow", () => {
    const data: Dataset = {
      ...demo,
      history: [
        ...demo.history,
        { id: "h", dmrlId: DEMO_IDS.dmrlVehicle, at: "2026-11-12T10:00:00.000Z", userId: DEMO_IDS.editorBen, action: "check_in", details: "" },
      ],
    }
    expect(isDmrlUsedInWorkflow(data, DEMO_IDS.dmrlVehicle)).toBe(true)
  })

  it("zählt einen Check-out allein nicht als Workflow", () => {
    const data: Dataset = {
      ...demo,
      history: [
        ...demo.history,
        { id: "h", dmrlId: DEMO_IDS.dmrlVehicle, at: "2026-11-12T10:00:00.000Z", userId: DEMO_IDS.editorBen, action: "check_out", details: "" },
      ],
    }
    expect(isDmrlUsedInWorkflow(data, DEMO_IDS.dmrlVehicle)).toBe(false)
  })

  it("erkennt Originator (D0815) und Empfänger (C1234) der Demo als benutzt", () => {
    expect(isOrganisationUsedInWorkflow(demo, DEMO_IDS.orgOriginator)).toBe(true)
    expect(isOrganisationUsedInWorkflow(demo, DEMO_IDS.orgPartner)).toBe(true)
  })
})

describe("Prüfung CAGE-Code und Name", () => {
  const schema = organisationFormSchema(demo)

  it("wandelt Kleinbuchstaben in Großbuchstaben um", () => {
    expect(schema.parse({ code: "x0001", name: " Neue Firma " })).toEqual({ code: "X0001", name: "Neue Firma" })
  })

  it.each([
    ["C123", "genau 5"],
    ["C12345", "genau 5"],
    ["C 123", "genau 5"],
    ["CÄ123", "genau 5"],
    ["c1234", "bereits vergeben"],
  ])("lehnt CAGE-Code „%s\" ab", (code, message) => {
    expect(schema.safeParse({ code, name: "Firma" }).error?.issues[0].message).toContain(message)
  })

  it.each([
    ["", "Bitte einen Namen"],
    ["A", "mindestens 2"],
    ["x".repeat(121), "höchstens 120"],
  ])("lehnt Name „%s\" ab", (name, message) => {
    expect(schema.safeParse({ code: "X0001", name }).error?.issues[0].message).toContain(message)
  })

  it("erlaubt gleiche Namen mit anderem CAGE-Code", () => {
    expect(schema.safeParse({ code: "X0001", name: "Partner Systemtechnik GmbH" }).success).toBe(true)
  })
})

describe("Rechte je Situation", () => {
  const data = withExtraOrgs()

  it("unbenutzt und nicht zugeordnet: alles erlaubt", () => {
    expect(organisationRights(data, org(data, "org-x"))).toEqual({ used: false, assignedCount: 0, deleteBlocked: null, codeBlocked: null })
  })

  it("zugeordnet ohne Workflow: Löschen gesperrt mit DMRL-Name, CAGE-Code änderbar", () => {
    const rights = organisationRights(data, org(data, "org-y"))
    expect(rights.deleteBlocked).toBe(
      "Die Organisation ist der DMRL „Geschütztes Transportfahrzeug\" zugeordnet. Ändern Sie zuerst die Zuordnung in der DMRL."
    )
    expect(rights.codeBlocked).toBeNull()
  })

  it("im Workflow benutzt: Löschen und CAGE-Code dauerhaft gesperrt", () => {
    const rights = organisationRights(data, org(data, DEMO_IDS.orgPartner))
    expect(rights.used).toBe(true)
    expect(rights.deleteBlocked).toContain("an Workflows beteiligt")
    expect(rights.codeBlocked).toContain("kann nicht geändert werden")
  })
})

describe("Anlegen, Bearbeiten, Löschen", () => {
  const data = withExtraOrgs()

  it("legt eine Organisation an; Datenbestand bleibt gültig", () => {
    const result = createOrganisation(demo, { code: "z9999", name: "Neue Empfänger GmbH" }, "org-z")
    expect(result.ok && result.data.organisations.at(-1)).toEqual({ id: "org-z", code: "Z9999", name: "Neue Empfänger GmbH" })
    expect(result.ok && datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("ändert bei einer benutzten Organisation nur den Namen", () => {
    const renamed = updateOrganisation(data, DEMO_IDS.orgPartner, { code: "C1234", name: "Partner Systemtechnik AG" })
    expect(renamed.ok && org(renamed.data, DEMO_IDS.orgPartner).name).toBe("Partner Systemtechnik AG")
    expect(updateOrganisation(data, DEMO_IDS.orgPartner, { code: "C9999", name: "X" })).toMatchObject({ ok: false })
  })

  it("ändert bei einer unbenutzten Organisation auch den CAGE-Code, aber nicht auf einen vergebenen", () => {
    expect(updateOrganisation(data, "org-x", { code: "x0002", name: "Unbenutzt GmbH" })).toMatchObject({ ok: true })
    expect(updateOrganisation(data, "org-x", { code: "C1234", name: "Unbenutzt GmbH" })).toMatchObject({
      ok: false,
      message: "CAGE-Code bereits vergeben.",
    })
  })

  it("löscht nur unbenutzte, nicht zugeordnete Organisationen", () => {
    const deleted = deleteOrganisation(data, "org-x")
    expect(deleted.ok && deleted.data.organisations.some((o) => o.id === "org-x")).toBe(false)
    expect(deleteOrganisation(data, "org-y")).toMatchObject({ ok: false })
    expect(deleteOrganisation(data, DEMO_IDS.orgOriginator)).toMatchObject({ ok: false })
  })
})
