import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset, type Dmrl } from "@/lib/data/schema"
import {
  createBlocked,
  createDmrl,
  deleteDmrl,
  dmrlFormSchema,
  dmrlRights,
  expiredPresetHint,
  firstSendVersionIndexOf,
  systemsWithoutDmrl,
  updateDmrl,
} from "./dmrls"

const demo = buildDemoDataset()
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl

/** Demo-Bestand plus freies System */
const withFreeSystem: Dataset = {
  ...demo,
  systems: [...demo.systems, { id: "sys-frei", name: "Wasseraufbereitung", description: "", s1000dIssue: "2.3", modelic: "WAA" }],
}
const thisYear = String(new Date().getFullYear())
const newValues = {
  systemId: "sys-frei",
  originatorOrganisationId: DEMO_IDS.orgOriginator,
  dmlType: "c",
  security: "01",
  firstSendVersionIndex: `00001-${thisYear}`,
}

describe("Anlegen", () => {
  it("bietet nur Systeme ohne DMRL an", () => {
    expect(systemsWithoutDmrl(withFreeSystem).map((s) => s.id)).toEqual(["sys-frei"])
    expect(systemsWithoutDmrl(demo)).toEqual([])
  })

  it("sperrt „DMRL anlegen\", wenn kein System frei ist", () => {
    expect(createBlocked(demo)).toBe("Kein System ohne DMRL vorhanden — legen Sie zuerst ein System an.")
    expect(createBlocked(withFreeSystem)).toBeNull()
  })

  it("legt eine DMRL im Status in Bearbeitung ohne Einträge und Berechtigungen an", () => {
    const result = createDmrl(withFreeSystem, newValues, "dmrl-neu")
    expect(result.ok && dmrl(result.data, "dmrl-neu")).toEqual({
      id: "dmrl-neu",
      systemId: "sys-frei",
      originatorOrganisationId: DEMO_IDS.orgOriginator,
      dmlType: "c",
      security: "01",
      firstSendVersionIndex: `00001-${thisYear}`,
      editorUserIds: [],
      status: "in_bearbeitung",
      partnerRemarks: "",
      release: null,
      lock: null,
    })
    expect(result.ok && datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it.each([
    [{ systemId: "" }, "Bitte ein System wählen."],
    [{ systemId: DEMO_IDS.sysVehicle }, "bereits eine DMRL"],
    [{ originatorOrganisationId: "" }, "Bitte einen Originator wählen."],
    [{ dmlType: "x" }, "DML-Typ"],
    [{ security: "1" }, "(01–20)"],
    [{ security: "00" }, "(01–20)"],
    [{ security: "21" }, "(01–20)"],
    [{ security: "100" }, "(01–20)"],
    [{ security: "A1" }, "(01–20)"],
  ])("lehnt %o ab", (override, message) => {
    expect(dmrlFormSchema(withFreeSystem).safeParse({ ...newValues, ...override }).error?.issues[0].message).toContain(message)
  })

  it("akzeptiert die DML-Typen c, p und s", () => {
    for (const dmlType of ["c", "p", "s"]) {
      expect(dmrlFormSchema(withFreeSystem).safeParse({ ...newValues, dmlType }).success).toBe(true)
    }
  })
})

describe("Rechte", () => {
  it("ohne Workflow: Originator, DML-Typ, Sicherheitseinstufung änderbar, System fest, löschbar", () => {
    const rights = dmrlRights(demo, dmrl(demo, DEMO_IDS.dmrlVehicle))
    expect(rights.fieldBlocked).toMatchObject({ originatorOrganisationId: null, dmlType: null, security: null })
    expect(rights.fieldBlocked.systemId).not.toBeNull()
    expect(rights.deleteBlocked).toBeNull()
  })

  it("im Workflow benutzt (PHUNGUN): nur Sicherheitseinstufung änderbar, Löschen dauerhaft gesperrt", () => {
    const rights = dmrlRights(demo, dmrl(demo, DEMO_IDS.dmrlPhungun))
    expect(rights.fieldBlocked).toMatchObject({ security: null })
    expect(rights.fieldBlocked.originatorOrganisationId).toContain("Workflows")
    expect(rights.fieldBlocked.dmlType).toContain("Workflows")
    expect(rights.deleteBlocked).toBe("Die DMRL ist an Workflows beteiligt und kann nicht gelöscht werden.")
  })

  it("ausgecheckt ohne abgeschlossenen Check-in: Löschen vorübergehend gesperrt mit Name", () => {
    const locked: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) =>
        d.id === DEMO_IDS.dmrlVehicle ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-13T08:00:00.000Z", entries: [] } } : d
      ),
    }
    expect(dmrlRights(locked, dmrl(locked, DEMO_IDS.dmrlVehicle)).deleteBlocked).toBe(
      "Die DMRL ist ausgecheckt von Ben Bearbeiter und kann derzeit nicht gelöscht werden."
    )
  })
})

describe("Bearbeiten", () => {
  const base = (d: Dmrl) => ({
    systemId: d.systemId,
    originatorOrganisationId: d.originatorOrganisationId,
    dmlType: d.dmlType as string,
    security: d.security,
    firstSendVersionIndex: firstSendVersionIndexOf(demo, d),
  })

  it("ändert die Sicherheitseinstufung von PHUNGUN und protokolliert sie im Verlauf; Einträge bleiben unverändert", () => {
    const phungun = dmrl(demo, DEMO_IDS.dmrlPhungun)
    const result = updateDmrl(demo, phungun.id, { ...base(phungun), security: "02" }, DEMO_IDS.admin, "2026-11-13T09:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(dmrl(result.data, phungun.id).security).toBe("02")
    expect(result.data.history.at(-1)).toMatchObject({
      dmrlId: phungun.id,
      userId: DEMO_IDS.admin,
      action: "kopfdaten_geaendert",
      details: "Kopfdaten geändert: Sicherheitseinstufung 01 → 02",
    })
    expect(result.data.entries).toEqual(demo.entries)
  })

  it("lehnt bei PHUNGUN Änderungen an Originator und DML-Typ ab", () => {
    const phungun = dmrl(demo, DEMO_IDS.dmrlPhungun)
    expect(updateDmrl(demo, phungun.id, { ...base(phungun), dmlType: "p" }, DEMO_IDS.admin)).toMatchObject({ ok: false })
    expect(
      updateDmrl(demo, phungun.id, { ...base(phungun), originatorOrganisationId: DEMO_IDS.orgPartner }, DEMO_IDS.admin)
    ).toMatchObject({ ok: false })
  })

  it("ändert ohne Workflow Originator und DML-Typ und nennt beide im Verlauf", () => {
    const vehicle = dmrl(demo, DEMO_IDS.dmrlVehicle)
    const result = updateDmrl(
      demo,
      vehicle.id,
      { ...base(vehicle), originatorOrganisationId: DEMO_IDS.orgPartner, dmlType: "p" },
      DEMO_IDS.admin
    )
    expect(result.ok && result.data.history.at(-1)?.details).toBe("Kopfdaten geändert: Originator D0815 → C1234, DML-Typ c → p")
  })

  it("erzeugt ohne Änderung keinen Verlaufseintrag", () => {
    const vehicle = dmrl(demo, DEMO_IDS.dmrlVehicle)
    const result = updateDmrl(demo, vehicle.id, base(vehicle), DEMO_IDS.admin)
    expect(result.ok && result.data.history).toEqual(demo.history)
  })
})

describe("Löschen", () => {
  it("entfernt DMRL, Einträge und Berechtigungen; das System ist wieder frei", () => {
    const result = deleteDmrl(demo, DEMO_IDS.dmrlVehicle)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.dmrls.some((d) => d.id === DEMO_IDS.dmrlVehicle)).toBe(false)
    expect(result.data.entries.some((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)).toBe(false)
    expect(systemsWithoutDmrl(result.data).map((s) => s.id)).toEqual([DEMO_IDS.sysVehicle])
    expect(datasetSchema.safeParse(result.data).success).toBe(true)
  })

  it("lehnt das Löschen von PHUNGUN ab", () => {
    expect(deleteDmrl(demo, DEMO_IDS.dmrlPhungun)).toMatchObject({ ok: false })
  })
})

describe("Versionsindex erster SEND (Refinement 2026-11-22)", () => {
  const NOW = "2026-11-22T10:00:00.000Z"
  const values = (d: Dmrl, data: Dataset = demo) => ({
    systemId: d.systemId,
    originatorOrganisationId: d.originatorOrganisationId,
    dmlType: d.dmlType as string,
    security: d.security,
    firstSendVersionIndex: firstSendVersionIndexOf(data, d, NOW),
  })

  it("speichert beim Anlegen den vorgegebenen Versionsindex", () => {
    const result = createDmrl(withFreeSystem, { ...newValues, firstSendVersionIndex: "00013-2026" }, "dmrl-neu", NOW)
    expect(result.ok && dmrl(result.data, "dmrl-neu").firstSendVersionIndex).toBe("00013-2026")
  })

  it.each(["13-2026", "000013-2026", "00000-2026", "ABCDE-2026", "00013/2026", ""])("lehnt das Format „%s“ ab", (value) => {
    const result = createDmrl(withFreeSystem, { ...newValues, firstSendVersionIndex: value }, "dmrl-neu", NOW)
    expect(result).toEqual({ ok: false, message: "Versionsindex muss das Format NNNNN-JJJJ haben (00001–99999)." })
  })

  it("akzeptiert 99999", () => {
    expect(createDmrl(withFreeSystem, { ...newValues, firstSendVersionIndex: "99999-2026" }, "dmrl-neu", NOW).ok).toBe(true)
  })

  it("verlangt beim Anlegen das aktuelle Jahr", () => {
    const result = createDmrl(withFreeSystem, { ...newValues, firstSendVersionIndex: "00013-2025" }, "dmrl-neu", NOW)
    expect(result).toEqual({ ok: false, message: "Das Jahr muss das aktuelle Jahr (2026) sein." })
  })

  it("ist bis zum ersten SEND änderbar — auch nach Check-in — und protokolliert die Änderung", () => {
    const vehicle = dmrl(demo, DEMO_IDS.dmrlVehicle)
    const checkedIn: Dataset = {
      ...demo,
      history: [...demo.history, { id: "h-ci", dmrlId: vehicle.id, at: NOW, userId: DEMO_IDS.editorAnna, action: "check_in", details: "" }],
    } as Dataset
    expect(dmrlRights(checkedIn, vehicle).fieldBlocked.firstSendVersionIndex).toBeNull()
    const before = firstSendVersionIndexOf(checkedIn, vehicle, NOW)
    const result = updateDmrl(checkedIn, vehicle.id, { ...values(vehicle, checkedIn), firstSendVersionIndex: "00013-2026" }, DEMO_IDS.admin, NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(dmrl(result.data, vehicle.id).firstSendVersionIndex).toBe("00013-2026")
    expect(result.data.history.at(-1)?.details).toBe(`Kopfdaten geändert: Versionsindex erster SEND ${before} → 00013-2026`)
  })

  it("ist gesperrt, sobald ein SEND existiert (PHUNGUN)", () => {
    const phungun = dmrl(demo, DEMO_IDS.dmrlPhungun)
    expect(dmrlRights(demo, phungun).fieldBlocked.firstSendVersionIndex).toBe("Versionsindex wird bereits vom SEND-Zähler fortgeführt.")
    const result = updateDmrl(demo, phungun.id, { ...values(phungun), firstSendVersionIndex: "00050-2026" }, DEMO_IDS.admin, NOW)
    expect(result).toEqual({ ok: false, message: "Versionsindex wird bereits vom SEND-Zähler fortgeführt." })
  })

  it("bleibt gesperrt, wenn der einzige SEND zurückgezogen wurde", () => {
    const phungun = dmrl(demo, DEMO_IDS.dmrlPhungun)
    const withdrawnOnly: Dataset = {
      ...demo,
      archive: demo.archive
        .filter((a) => a.id === DEMO_IDS.archiveSend1)
        .map((a) => ({ ...a, withdrawn: { at: NOW, userId: DEMO_IDS.admin, reason: "Test" } })),
    }
    expect(withdrawnOnly.archive).toHaveLength(1)
    expect(dmrlRights(withdrawnOnly, phungun).fieldBlocked.firstSendVersionIndex).not.toBeNull()
  })

  it("erlaubt in einem späteren Jahr das Speichern anderer Kopfdaten und meldet die abgelaufene Vorgabe", () => {
    const later = "2027-01-15T10:00:00.000Z"
    const data: Dataset = {
      ...demo,
      dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, firstSendVersionIndex: "00013-2026" } : d)),
    }
    const vehicle = dmrl(data, DEMO_IDS.dmrlVehicle)
    expect(expiredPresetHint(data, vehicle, later)).toBe("Vorgabe abgelaufen — der erste SEND erhält 00001-2027.")
    const result = updateDmrl(data, vehicle.id, { ...values(vehicle, data), security: "02" }, DEMO_IDS.admin, later)
    expect(result.ok && dmrl(result.data, vehicle.id)).toMatchObject({ security: "02", firstSendVersionIndex: "00013-2026" })
    // Eine Änderung des Feldes verlangt dagegen das aktuelle Jahr
    expect(updateDmrl(data, vehicle.id, { ...values(vehicle, data), firstSendVersionIndex: "00014-2026" }, DEMO_IDS.admin, later)).toEqual({
      ok: false,
      message: "Das Jahr muss das aktuelle Jahr (2027) sein.",
    })
  })

  it("zeigt bei Altbestand ohne Vorgabe den Versionsindex des ersten SEND bzw. 00001-<Jahr>", () => {
    const strip = (d: Dmrl): Dmrl => ({ ...d, firstSendVersionIndex: undefined })
    const legacy: Dataset = { ...demo, dmrls: demo.dmrls.map(strip) }
    expect(datasetSchema.safeParse(legacy).success).toBe(true)
    expect(firstSendVersionIndexOf(legacy, dmrl(legacy, DEMO_IDS.dmrlPhungun), NOW)).toBe("00001-2026")
    expect(firstSendVersionIndexOf(legacy, dmrl(legacy, DEMO_IDS.dmrlVehicle), "2027-03-01T00:00:00.000Z")).toBe("00001-2027")
    // Unverändert speichern schreibt keine Vorgabe
    const vehicle = dmrl(legacy, DEMO_IDS.dmrlVehicle)
    const result = updateDmrl(legacy, vehicle.id, values(vehicle, legacy), DEMO_IDS.admin, NOW)
    expect(result.ok && dmrl(result.data, vehicle.id).firstSendVersionIndex).toBeUndefined()
  })
})
