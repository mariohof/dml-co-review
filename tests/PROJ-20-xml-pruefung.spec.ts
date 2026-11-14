import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { patchDataset, readDataset, startAs } from "./helpers"

/** PROJ-20: XML prüfen & CSV-Konvertierung (eigenständiges Werkzeug, echte XSD-Serverfunktion) */

const DEMO_DIR = join(__dirname, "..", "public", "demo-dateien")
const REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

async function openTool(page: Page) {
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "XML prüfen" }).click()
  await expect(page.getByRole("heading", { name: "XML prüfen." })).toBeVisible()
}

async function checkFile(page: Page, name: string, issue = "2.3") {
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: `Issue ${issue}` }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name, mimeType: "application/xml", buffer: readFileSync(join(DEMO_DIR, name)) })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

test("Menüpunkt „XML prüfen“; Partner-REPLY: Zusammenfassung mit Antworten, CSV-Download mit Namen der XML", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await openTool(page)
  await expect(page.getByText("Bitte zuerst die S1000D-Issue der Datei wählen.")).toBeVisible()
  await checkFile(page, REPLY)
  const summary = page.getByLabel("Zusammenfassung")
  await expect(summary).toContainText("DML-PHUNGUN-C1234-C-2026-00002")
  await expect(summary).toContainText("REPLY")
  await expect(summary).toContainText("30 freigegeben · 2 zu überarbeiten · 0 ohne Antwort")
  const before = await readDataset(page)
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "CSV herunterladen" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe("DML-PHUNGUN-C1234-C-2026-00002_001-00.csv")
  const csv = readFileSync((await download.path())!, "utf8")
  expect(csv.startsWith("﻿dmentryType;modelic")).toBe(true)
  expect(csv.split("\r\n").filter(Boolean)).toHaveLength(33)
  // nichts gespeichert
  expect(await readDataset(page)).toEqual(before)
})

test("ohne Anmeldung: Adresse des Werkzeugs führt zur Anmeldeseite", async ({ page }) => {
  await page.goto("/anmelden")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("/xml-pruefung")
  await expect(page).toHaveURL(/\/anmelden/)
})

test("Bearbeiter ohne DMRL-Berechtigung kann das Werkzeug nutzen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await patchDataset(page, "for (const d of data.dmrls) d.editorUserIds = []")
  await openTool(page)
  await checkFile(page, REPLY)
  await expect(page.getByLabel("Zusammenfassung")).toBeVisible()
})

test("nicht wohlgeformte XML: Fehler mit Zeile, keine CSV", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await openTool(page)
  await checkFile(page, "TEST-3_Kein-gueltiges-XML.XML")
  await expect(page.getByText(/Die Datei ist kein gültiges XML \(Zeile \d+\)/).first()).toBeVisible()
  await expect(page.getByText("Keine CSV — die Datei kann nicht gelesen werden.")).toBeVisible()
  await expect(page.getByRole("button", { name: "CSV herunterladen" })).toHaveCount(0)
})

test("Schemafehler: XSD-Befunde im Bericht, CSV mit Warnung", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await openTool(page)
  await checkFile(page, "TEST-1_Pflichtelement-fehlt.XML")
  await expect(page.getByRole("cell", { name: "Schema (XSD)" }).first()).toBeVisible()
  await expect(page.getByText(/ein Check-in wird abgewiesen, bis sie behoben sind/)).toBeVisible()
  await expect(page.getByRole("button", { name: "CSV herunterladen" })).toBeVisible()
})

test("falsche Issue gewählt: „Datei passt nicht zur gewählten Issue“, keine CSV", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await openTool(page)
  await checkFile(page, REPLY, "4.2")
  await expect(page.getByText(/Datei passt nicht zur gewählten Issue/).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "CSV herunterladen" })).toHaveCount(0)
})

for (const width of [375, 768, 1440]) {
  test(`${width} px: Ergebnis mit Fehlern ohne waagerechtes Scrollen der Seite`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await startAs(page, "Ben Bearbeiter")
    await page.goto("/xml-pruefung")
    await checkFile(page, "TEST-1_Pflichtelement-fehlt.XML")
    await expect(page.getByLabel("Zusammenfassung")).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test("Neuladen: Ergebnis ist weg", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await openTool(page)
  await checkFile(page, REPLY)
  await expect(page.getByLabel("Zusammenfassung")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "XML prüfen." })).toBeVisible()
  await expect(page.getByLabel("Zusammenfassung")).toHaveCount(0)
})
