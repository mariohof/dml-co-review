import { expect, type Page } from "@playwright/test"

/** Startet mit leerem Browser-Speicher → Demo-Daten werden neu angelegt (PROJ-1) */
export async function freshStart(page: Page) {
  await page.goto("/anmelden")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { name: "DMRL Management System" }).or(page.getByText("DMRL Management System").first())).toBeVisible()
}

/** Anmelden per Klick in der Benutzerliste der Anmeldeseite (PROJ-2) */
export async function loginAs(page: Page, name: string) {
  if (!page.url().includes("/anmelden")) await page.goto("/anmelden")
  await page.getByRole("list", { name: "Benutzer" }).getByRole("button", { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByRole("button", { name: new RegExp(`Benutzer: ${name}`) })).toBeVisible()
}

/** Frischer Demo-Bestand + Anmeldung */
export async function startAs(page: Page, name: string) {
  await freshStart(page)
  await loginAs(page, name)
}

/** Benutzer über die Auswahlliste in der Kopfzeile wechseln */
export async function switchUser(page: Page, name: string) {
  await page.getByRole("button", { name: /^Benutzer: / }).click()
  await page.getByRole("menuitemradio", { name: new RegExp(name) }).click()
  await expect(page.getByRole("button", { name: new RegExp(`Benutzer: ${name}`) })).toBeVisible()
}

/** Datenbestand im Browser lesen */
export async function readDataset(page: Page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem("dmrl-ms:dataset") ?? "null"))
}

/** Datenbestand im Browser ändern und Seite neu laden */
export async function patchDataset(page: Page, patch: string) {
  await page.evaluate((code) => {
    const data = JSON.parse(window.localStorage.getItem("dmrl-ms:dataset") ?? "null")
    new Function("data", code)(data)
    window.localStorage.setItem("dmrl-ms:dataset", JSON.stringify(data))
  }, patch)
  await page.reload()
}

/** Zeilen einer Tabelle (ohne Kopfzeile) */
export function bodyRows(page: Page) {
  return page.locator("table tbody tr")
}
