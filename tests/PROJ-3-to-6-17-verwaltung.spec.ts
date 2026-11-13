import { expect, test, type Page } from "@playwright/test"

import { bodyRows, readDataset, startAs, switchUser } from "./helpers"

async function openDialog(page: Page, button: string) {
  await page.getByRole("button", { name: button }).click()
  return page.getByRole("dialog")
}

async function pickOption(page: Page, label: string, option: RegExp | string) {
  await page.getByRole("dialog").getByLabel(label).click()
  await page.getByRole("option", { name: option }).click()
}

test.describe("PROJ-3 Benutzerverwaltung", () => {
  test.beforeEach(async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/benutzer")
  })

  test("Liste mit Name, Rolle, Status, sortiert; Systemkonto gekennzeichnet und geschützt", async ({ page }) => {
    await expect(bodyRows(page)).toHaveText([/Administrator.*Systemkonto/, /Anna Bearbeitung/, /Ben Bearbeiter/])
    await expect(page.getByLabel("Administrator bearbeiten")).toBeDisabled()
    await expect(page.getByLabel("Administrator deaktivieren")).toBeDisabled()
  })

  test("Anlegen: neuer Benutzer ist aktiv und erscheint in der Anmeldeliste", async ({ page }) => {
    const dialog = await openDialog(page, "Benutzer anlegen")
    await dialog.getByLabel("Name").fill("Carla Neu")
    await pickOption(page, "Rolle", "Bearbeiter")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: "Carla Neu" })).toContainText("aktiv")
    await page.getByRole("button", { name: /^Benutzer: / }).click()
    await expect(page.getByRole("menuitemradio", { name: /Carla Neu/ })).toBeVisible()
  })

  test("Pflichtfelder, Länge und doppelter Name werden gemeldet", async ({ page }) => {
    const dialog = await openDialog(page, "Benutzer anlegen")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText("Bitte einen Namen eingeben.")).toBeVisible()
    await expect(dialog.getByText("Bitte eine Rolle wählen.")).toBeVisible()
    await dialog.getByLabel("Name").fill("A")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText(/mindestens 2 Zeichen/)).toBeVisible()
    await dialog.getByLabel("Name").fill("anna bearbeitung")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText("Dieser Name ist bereits vergeben.")).toBeVisible()
  })

  test("Deaktivieren gesperrt bei offenem SEND (Anna), möglich bei Ben; inaktive fehlen in der Anmeldeliste", async ({ page }) => {
    await page.getByLabel("Anna Bearbeitung deaktivieren").click()
    await expect(page.getByRole("alertdialog")).toContainText("wartet auf REPLY zu SEND 00002-2026")
    await page.getByRole("button", { name: "Schließen" }).click()

    await page.getByLabel("Ben Bearbeiter deaktivieren").click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Deaktivieren" }).click()
    await expect(bodyRows(page).filter({ hasText: "Ben Bearbeiter" })).toContainText("inaktiv")
    await page.getByRole("button", { name: /^Benutzer: / }).click()
    await expect(page.getByRole("menuitemradio", { name: /Ben Bearbeiter/ })).toHaveCount(0)
  })

  test("Eigene Rolle auf Bearbeiter → sofort Bearbeiter-Rechte, kein Zugriff mehr auf die Verwaltung", async ({ page }) => {
    // Neuen Administrator anlegen und mit ihm arbeiten (Systemkonto ist geschützt)
    const dialog = await openDialog(page, "Benutzer anlegen")
    await dialog.getByLabel("Name").fill("Zweiter Admin")
    await pickOption(page, "Rolle", "Administrator")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await switchUser(page, "Zweiter Admin")
    await page.getByLabel("Zweiter Admin bearbeiten").click()
    await pickOption(page, "Rolle", "Bearbeiter")
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: "Verwaltung" })).toHaveCount(0)
  })
})

test.describe("PROJ-4 Organisationsverwaltung", () => {
  test.beforeEach(async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/organisationen")
  })

  test("Demo: C1234 und D0815 sind im Workflow benutzt, Löschen gesperrt", async ({ page }) => {
    await expect(bodyRows(page)).toHaveText([/C1234.*im Workflow benutzt/, /D0815.*im Workflow benutzt/])
    await expect(page.getByLabel("C1234 löschen")).toBeDisabled()
    await expect(page.getByLabel("D0815 löschen")).toBeDisabled()
  })

  test("Benutzte Organisation: CAGE-Code gesperrt, Name änderbar", async ({ page }) => {
    await page.getByLabel("C1234 bearbeiten").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByLabel("CAGE-Code")).toBeDisabled()
    await dialog.getByLabel("Name").fill("Partner Systemtechnik AG")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: "C1234" })).toContainText("Partner Systemtechnik AG")
  })

  test("Anlegen (Großschreibung), doppelter CAGE-Code, Löschen einer unbenutzten Organisation", async ({ page }) => {
    let dialog = await openDialog(page, "Organisation anlegen")
    await dialog.getByLabel("CAGE-Code").fill("c1234")
    await dialog.getByLabel("Name").fill("Doppelt")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText("CAGE-Code bereits vergeben.")).toBeVisible()
    await dialog.getByLabel("CAGE-Code").fill("x0001")
    await expect(dialog.getByLabel("CAGE-Code")).toHaveValue("X0001")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page)).toHaveCount(3)
    await page.getByLabel("X0001 löschen").click()
    dialog = page.getByRole("alertdialog")
    await dialog.getByRole("button", { name: "Löschen" }).click()
    await expect(bodyRows(page)).toHaveCount(2)
  })
})

test.describe("PROJ-5 Systemverwaltung", () => {
  test.beforeEach(async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/systeme")
  })

  test("Demo: PHUNGUN vollständig gesperrt, Fahrzeug mit MI und Bezeichnung gesperrt, Issue änderbar", async ({ page }) => {
    await expect(page.getByLabel("PHUNGUN löschen")).toBeDisabled()
    await page.getByLabel("Geschütztes Transportfahrzeug bearbeiten").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByLabel("Bezeichnung")).toBeDisabled()
    await expect(dialog.getByLabel("Model Ident Code")).toBeDisabled()
    await pickOption(page, "S1000D-Issue", "5.0")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: "GTFDEMO" })).toContainText("5.0")
  })

  test("Anlegen eines Systems; DMRL-Spalte „— keine —\"; Löschen möglich", async ({ page }) => {
    const dialog = await openDialog(page, "System anlegen")
    await dialog.getByLabel("Bezeichnung").fill("Wasseraufbereitung")
    await pickOption(page, "S1000D-Issue", "2.3")
    await dialog.getByLabel("Model Ident Code").fill("waa")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    const row = bodyRows(page).filter({ hasText: "Wasseraufbereitung" })
    await expect(row).toContainText("WAA")
    await expect(row).toContainText("— keine —")
    await page.getByLabel("Wasseraufbereitung löschen").click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click()
    await expect(bodyRows(page)).toHaveCount(3)
  })
})

test.describe("PROJ-6 DMRL anlegen", () => {
  test.beforeEach(async ({ page }) => {
    await startAs(page, "Administrator")
  })

  test("„DMRL anlegen\" ist gesperrt, solange kein System frei ist", async ({ page }) => {
    await page.goto("/verwaltung/dmrl")
    await expect(page.getByRole("button", { name: "DMRL anlegen" })).toBeDisabled()
  })

  test("Neues System → DMRL anlegen (Vorbelegung c / 01), Status in Bearbeitung; Systembezeichnung danach fest", async ({ page }) => {
    await page.goto("/verwaltung/systeme")
    let dialog = await openDialog(page, "System anlegen")
    await dialog.getByLabel("Bezeichnung").fill("Wasseraufbereitung")
    await pickOption(page, "S1000D-Issue", "2.3")
    await dialog.getByLabel("Model Ident Code").fill("WAA")
    await dialog.getByRole("button", { name: "Speichern" }).click()

    await page.goto("/verwaltung/dmrl")
    dialog = await openDialog(page, "DMRL anlegen")
    await expect(dialog.getByLabel("DML-Typ")).toContainText("c – vollständig")
    await expect(dialog.getByLabel("Sicherheitseinstufung")).toHaveValue("01")
    await pickOption(page, "System", /Wasseraufbereitung/)
    await pickOption(page, "Originator", /D0815/)
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: "Wasseraufbereitung" })).toContainText("In Bearbeitung")

    await page.goto("/verwaltung/systeme")
    await page.getByLabel("Wasseraufbereitung bearbeiten").click()
    await expect(page.getByRole("dialog").getByLabel("Bezeichnung")).toBeDisabled()
  })

  test("PHUNGUN: nur Sicherheitseinstufung änderbar, Löschen gesperrt; Änderung im Verlauf", async ({ page }) => {
    await page.goto("/verwaltung/dmrl")
    await expect(page.getByLabel("DMRL PHUNGUN löschen")).toBeDisabled()
    await page.getByLabel("DMRL PHUNGUN bearbeiten").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByLabel("Originator")).toBeDisabled()
    await expect(dialog.getByLabel("DML-Typ")).toBeDisabled()
    await dialog.getByLabel("Sicherheitseinstufung").fill("21")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText("Sicherheitseinstufung muss zweistellig sein (01–20).")).toBeVisible()
    await dialog.getByLabel("Sicherheitseinstufung").fill("02")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const data = await readDataset(page)
    expect(data.history.at(-1).details).toBe("Kopfdaten geändert: Sicherheitseinstufung 01 → 02")
  })

  test("DMRL ohne Workflow löschen; System erscheint wieder ohne DMRL", async ({ page }) => {
    await page.goto("/verwaltung/dmrl")
    await page.getByLabel("DMRL Transporthubschrauber löschen").click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click()
    await expect(bodyRows(page)).toHaveCount(2)
    await page.goto("/verwaltung/systeme")
    await expect(bodyRows(page).filter({ hasText: "THSDEMO" })).toContainText("— keine —")
  })
})

test.describe("PROJ-17 DMRL-Berechtigungen", () => {
  test("Spalte „Bearbeiter\" zeigt die Demo-Berechtigungen", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/dmrl")
    await expect(bodyRows(page).filter({ hasText: "PHUNGUN" })).toContainText("Anna Bearbeitung")
    await expect(bodyRows(page).filter({ hasText: "THSDEMO" })).toContainText("Ben Bearbeiter")
  })

  test("Berechtigung vergeben → Bearbeiter sieht die DMRL; entziehen → „Keine Berechtigung\"", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/dmrl")
    await page.getByLabel("Berechtigungen für Transporthubschrauber").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("checkbox", { name: /Administrator/ })).toHaveCount(0)
    await dialog.getByRole("checkbox", { name: /Anna Bearbeitung/ }).click()
    await dialog.getByRole("button", { name: "Speichern" }).click()

    await switchUser(page, "Anna Bearbeitung")
    await expect(bodyRows(page)).toHaveCount(3)

    await switchUser(page, "Administrator")
    await page.goto("/verwaltung/dmrl")
    await page.getByLabel("Berechtigungen für PHUNGUN").click()
    await page.getByRole("dialog").getByRole("checkbox", { name: /Anna Bearbeitung/ }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click()

    await switchUser(page, "Anna Bearbeitung")
    await page.goto("/dmrl/dmrl-phungun")
    await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
  })

  test("Bearbeiter erreicht die Berechtigungsverwaltung nicht", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    await page.goto("/verwaltung/dmrl")
    await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
  })
})
