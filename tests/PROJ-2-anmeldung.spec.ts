import { expect, test } from "@playwright/test"

import { bodyRows, freshStart, loginAs, patchDataset, startAs, switchUser } from "./helpers"

test.describe("PROJ-2 Simulierte Anmeldung & Rollenwechsel", () => {
  test("Ohne Anmeldung: Anmeldeseite mit allen aktiven Benutzern (Name + Rolle), inkl. Systemkonto", async ({ page }) => {
    await freshStart(page)
    const list = page.getByRole("list", { name: "Benutzer" })
    await expect(list.getByRole("button")).toHaveText([
      /Administrator.*Administrator/,
      /Anna Bearbeitung.*Bearbeiter/,
      /Ben Bearbeiter.*Bearbeiter/,
    ])
  })

  test("Direktaufruf ohne Anmeldung leitet zur Anmeldeseite und danach zum Ziel", async ({ page }) => {
    await freshStart(page)
    await page.goto("/verwaltung/systeme")
    await expect(page).toHaveURL(/\/anmelden\?ziel=/)
    await loginAs(page, "Administrator")
    await expect(page).toHaveURL(/\/verwaltung\/systeme$/)
  })

  test("Klick auf einen Benutzer meldet ohne Passwort an; Anmeldung überlebt das Neuladen", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    await expect(page.getByRole("heading", { name: "DMRL im Blick." })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: /Benutzer: Anna Bearbeitung, Bearbeiter/ })).toBeVisible()
  })

  test("Administrator: Menü „Dashboard\" und „Verwaltung\", alle DMRLs", async ({ page }) => {
    await startAs(page, "Administrator")
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await page.getByRole("button", { name: "Verwaltung" }).click()
    for (const item of ["Benutzer", "Organisationen", "Systeme", "DMRLs & Berechtigungen"]) {
      await expect(page.getByRole("menuitem", { name: item })).toBeVisible()
    }
    await page.keyboard.press("Escape")
    await expect(bodyRows(page)).toHaveCount(3)
  })

  test("Bearbeiter: nur „Dashboard\", nur berechtigte DMRLs", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    await expect(page.getByRole("button", { name: "Verwaltung" })).toHaveCount(0)
    await expect(bodyRows(page)).toHaveText([/Geschütztes Transportfahrzeug/, /PHUNGUN/])
  })

  test("Bearbeiter ohne Berechtigung sieht den Hinweis im Dashboard", async ({ page }) => {
    await freshStart(page)
    await patchDataset(page, "data.dmrls.forEach(d => d.editorUserIds = d.editorUserIds.filter(id => id !== 'user-ben-bearbeiter'))")
    await loginAs(page, "Ben Bearbeiter")
    await expect(page.getByText("Ihnen sind noch keine DMRLs zugeordnet. Bitte wenden Sie sich an einen Administrator.")).toBeVisible()
  })

  test("Bearbeiter: Direktaufruf Verwaltung bzw. fremde DMRL → „Keine Berechtigung\" mit Link zum Dashboard", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    await page.goto("/verwaltung/benutzer")
    await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
    await page.goto("/dmrl/dmrl-thsdemo")
    await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
    await page.getByRole("link", { name: "Zum Dashboard" }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test("Unbekannte DMRL → „DMRL nicht gefunden\"", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/dmrl/gibt-es-nicht")
    await expect(page.getByText("DMRL nicht gefunden")).toBeVisible()
  })

  test("Benutzerwechsel auf erlaubter Seite: Seite bleibt offen, Sicht des neuen Benutzers", async ({ page }) => {
    await startAs(page, "Administrator")
    await switchUser(page, "Ben Bearbeiter")
    await expect(page).toHaveURL(/\/$/)
    await expect(bodyRows(page)).toHaveText([/Geschütztes Transportfahrzeug/, /Transporthubschrauber/])
  })

  test("Benutzerwechsel auf nicht erlaubter Seite: Dashboard mit Hinweis", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/benutzer")
    await switchUser(page, "Anna Bearbeitung")
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("Die vorherige Seite ist für Anna Bearbeitung nicht verfügbar.")).toBeVisible()
  })

  test("Abmelden führt zur Anmeldeseite", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.getByRole("button", { name: /^Benutzer: / }).click()
    await page.getByRole("menuitem", { name: "Abmelden" }).click()
    await expect(page).toHaveURL(/\/anmelden/)
    await expect(page.getByRole("list", { name: "Benutzer" })).toBeVisible()
  })

  test("Deaktivierter angemeldeter Benutzer wird abgemeldet und sieht einen Hinweis", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    await patchDataset(page, "data.users.find(u => u.id === 'user-ben-bearbeiter').active = false")
    await expect(page).toHaveURL(/\/anmelden/)
    await expect(page.getByText("Ihr Benutzer ist nicht mehr aktiv.")).toBeVisible()
    await expect(page.getByRole("list", { name: "Benutzer" })).not.toContainText("Ben Bearbeiter")
  })

  test("Rollenänderung wirkt sofort", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    await patchDataset(page, "data.users.find(u => u.id === 'user-anna-bearbeitung').role = 'administrator'")
    await expect(page.getByRole("button", { name: "Verwaltung" })).toBeVisible()
    await expect(bodyRows(page)).toHaveCount(3)
  })
})
