import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** Erneuter QA-Test BUG-QA1-1: UTF-16-Dateien im REPLY-Import (PROJ-13), Archiv (PROJ-15) und „XML prüfen" (PROJ-20) */

const DEMO = join(__dirname, "..", "public", "demo-dateien")
const DEMO_REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"
const utf8Text = () => readFileSync(join(DEMO, DEMO_REPLY), "utf8").replace(/^﻿/, "").replace(/encoding="[^"]*"/i, 'encoding="UTF-16"')

function utf16(text: string, { bigEndian = false, bom = true } = {}) {
  const le = Buffer.from((bom ? "﻿" : "") + text, "utf16le")
  if (bigEndian) le.swap16()
  return le
}

async function replyImport(page: Page, buffer: Buffer) {
  await page.goto("/dmrl/dmrl-phungun")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles({ name: DEMO_REPLY, mimeType: "application/xml", buffer })
  return dialog
}

async function toolCheck(page: Page, buffer: Buffer) {
  await page.goto("/xml-pruefung")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: "Issue 2.3" }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name: "utf16.xml", mimeType: "application/xml", buffer })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

test("REPLY-Import UTF-16 LE mit BOM: XSD + Regelwerk bestanden, übernommen, Archiv-Download byte-genau", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  const original = utf16(utf8Text())
  const dialog = await replyImport(page, original)
  await expect(dialog.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeVisible()
  await expect(dialog.getByText("Abgelehnte Einträge (2)")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.archive.at(-1).content).toBe("﻿" + utf8Text())
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-phungun").status).toBe("in_bearbeitung")

  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Archiv" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: `${DEMO_REPLY} herunterladen` }).first().click()
  const download = await downloadPromise
  expect(readFileSync((await download.path())!).equals(original)).toBe(true)
})

test("REPLY-Import UTF-16 BE ohne BOM: wird gelesen, Umlaute korrekt", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  // Umlaute im Original (techname „Fähigkeitsträger…“): der Abgleich REPLY ↔ SEND besteht nur bei korrekt gelesenen Umlauten
  const dialog = await replyImport(page, utf16(utf8Text(), { bigEndian: true, bom: false }))
  await expect(dialog.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.archive.at(-1).content).toContain("Fähigkeitsträger")
})

test("XML prüfen: UTF-16 BE mit BOM und LE ohne BOM werden gelesen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  for (const variant of [{ bigEndian: true, bom: true }, { bigEndian: false, bom: false }]) {
    await toolCheck(page, utf16(utf8Text(), variant))
    await expect(page.getByLabel("Zusammenfassung")).toContainText("30 freigegeben · 2 zu überarbeiten")
    await expect(page.getByText("Die Datei kann nicht geprüft werden")).toHaveCount(0)
  }
})

test("Regression: UTF-8 mit BOM und ISO-8859-1 im Werkzeug unverändert", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await toolCheck(page, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(utf8Text().replace('encoding="UTF-16"', 'encoding="UTF-8"'))]))
  await expect(page.getByLabel("Zusammenfassung")).toContainText("30 freigegeben")
  await toolCheck(page, Buffer.from(utf8Text().replace('encoding="UTF-16"', 'encoding="ISO-8859-1"').replace(/–/g, "-"), "latin1"))
  await expect(page.getByLabel("Zusammenfassung")).toContainText("30 freigegeben")
})
