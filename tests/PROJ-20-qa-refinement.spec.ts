import { readFileSync } from "node:fs"
import { networkInterfaces } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { startAs } from "./helpers"

/** PROJ-20 QA Refinement 2026-11-16: Ausgabedaten optional, Ursache „XSD nicht erreichbar“, „Erneut prüfen“, Wirkung auf REPLY/Export */

const DEMO = join(__dirname, "..", "public", "demo-dateien")
const REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"
const XSD = (url: URL) => url.pathname === "/api/xsd-pruefung"

async function toolCheck(page: Page, buffer: Buffer, name = REPLY) {
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Werkzeug" }).click()
  // Seite fertig geladen (Entwicklungsserver kompiliert beim ersten Aufruf und lädt ggf. neu)
  await expect(page.getByRole("heading", { name: "Werkzeug." })).toBeVisible()
  await page.waitForLoadState("networkidle")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: "Issue 2.3" }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name, mimeType: "application/xml", buffer })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

test("375 px: Hinweis mit „Erneut prüfen“ ohne waagerechtes Scrollen, Schaltfläche erreichbar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await startAs(page, "Ben Bearbeiter")
  await page.route(XSD, (route) => route.abort("connectionrefused"))
  await page.goto("/xml-pruefung")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: "Issue 2.3" }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles(join(DEMO, REPLY))
  await page.getByRole("button", { name: "Prüfen" }).click()
  const retry = page.getByRole("button", { name: "Erneut prüfen" })
  await expect(retry).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test("Erneut prüfen schlägt erneut fehl: Meldung bleibt, keine doppelten Anfragen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  let calls = 0
  await page.route(XSD, (route) => {
    calls += 1
    return route.abort("connectionrefused")
  })
  await toolCheck(page, readFileSync(join(DEMO, REPLY)))
  await expect(page.getByText(/Der Server der Anwendung läuft nicht/).first()).toBeVisible()
  await page.getByRole("button", { name: "Erneut prüfen" }).click()
  await expect(page.getByRole("button", { name: "Erneut prüfen" })).toBeEnabled()
  await expect(page.getByLabel("Zusammenfassung")).toBeVisible()
  expect(calls).toBe(2)
})

test("REPLY-Import (PROJ-13): Server läuft nicht → neue Meldung, „Erneut versuchen“ prüft danach regulär", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-phungun")
  await page.route(XSD, (route) => route.abort("connectionrefused"))
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles(join(DEMO, REPLY))
  await expect(dialog).toContainText("Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).")
  await page.unroute(XSD)
  await dialog.getByRole("button", { name: "Erneut versuchen" }).click()
  await expect(dialog.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeVisible()
})

test("DMRL-Export XML (PROJ-18): Zugriff abgelehnt → Hinweis mit localhost-Adresse", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.route(XSD, (route) => route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"Anfrage nicht erlaubt."}' }))
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
  await page.getByRole("menuitem", { name: "Als XML exportieren" }).click()
  const port = new URL(page.url()).port
  await expect(page.getByText(`Zugriff abgelehnt — bitte die Anwendung über http://localhost:${port} öffnen.`)).toBeVisible()
})

/** Netzwerkadresse dieses Rechners (IPv4, nicht intern) — für den echten Host-Schutz der Serverfunktion */
const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((a) => a && a.family === "IPv4" && !a.internal)?.address

test("echt, ohne Abfangen: App über Netzwerkadresse geöffnet → Serverfunktion lehnt ab → „Zugriff abgelehnt“", async ({ page }) => {
  test.skip(!lanAddress, "keine Netzwerkadresse vorhanden")
  const base = `http://${lanAddress}:3000`
  await page.goto(`${base}/anmelden`)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole("list", { name: "Benutzer" }).getByRole("button", { name: /^Ben Bearbeiter/ }).click()
  await expect(page.getByRole("button", { name: /Benutzer: Ben Bearbeiter/ })).toBeVisible()
  // Weiterleitung zum Dashboard abwarten, bevor über das Menü navigiert wird
  await expect(page).toHaveURL(`${base}/`)
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Werkzeug" }).click()
  await expect(page).toHaveURL(`${base}/xml-pruefung`)
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: "Issue 2.3" }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles(join(DEMO, REPLY))
  await page.getByRole("button", { name: "Prüfen" }).click()
  await expect(page.getByText("Zugriff abgelehnt — bitte die Anwendung über http://localhost:3000 öffnen.").first()).toBeVisible()
})
