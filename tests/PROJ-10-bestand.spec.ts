import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { patchDataset, readDataset, startAs } from "./helpers"

/** PROJ-10 Refinement 2026-11-18: Bestand übernehmen — neue Einträge ohne Eintragstyp werden freigegeben (QA-Lauf 8) */

type Entry = { dmrlId: string; status: string; fields: Record<string, string> }

async function checkOut(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), csv: readFileSync((await download.path())!, "utf8") }
}

/** Erste Datenzeile kopieren, Felder setzen und als neue Zeile anhängen */
function withNewRow(csv: string, values: Record<string, string>) {
  const lines = csv.split("\r\n").filter((line) => line !== "")
  const header = lines[0].replace(/^﻿/, "").split(";")
  const cells = lines[1].split(";")
  for (const [name, value] of Object.entries({ answer: "", answer_comment: "", ...values })) {
    const index = header.indexOf(name)
    expect(index).toBeGreaterThanOrEqual(0)
    cells[index] = value
  }
  return [...lines, cells.join(";")].join("\r\n") + "\r\n"
}

async function upload(page: Page, file: { name: string; csv: string }) {
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("CSV-Datei für den Check-in").setInputFiles({ name: file.name, mimeType: "text/csv", buffer: Buffer.from(file.csv) })
  return dialog
}

/** Fahrzeug-DMRL komplett freigeben (Einträge freigegeben, ohne Eintragstyp) */
const RELEASE_VEHICLE = `
  data.dmrls.find(d => d.id === 'dmrl-gtfdemo').status = 'freigegeben'
  for (const e of data.entries) if (e.dmrlId === 'dmrl-gtfdemo') { e.status = 'freigegeben'; e.fields.dmentryType = '' }
`

test("Neuer Eintrag ohne Eintragstyp: Zusammenfassung „davon 1 als freigegeben übernommen“, Status danach, Eintrag freigegeben", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "Q", dmentryType: "", type: "new" }) })

  await expect(dialog.getByRole("heading", { name: "Neue Einträge (1, davon 1 als freigegeben übernommen)" })).toBeVisible()
  await expect(dialog.getByText("Bestand übernehmen: davon 1 als freigegeben übernommen")).toBeVisible()
  await expect(dialog.getByRole("columnheader", { name: "Status danach" })).toBeVisible()
  await expect(dialog.getByRole("cell", { name: "freigegeben", exact: true })).toBeVisible()
  await expect(dialog.getByText("Neuer Eintrag muss Eintragstyp")).toHaveCount(0)

  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Check-in übernommen — 1 neu \(davon 1 als freigegeben übernommen\)/)).toBeVisible()
  const data = await readDataset(page)
  const added = data.entries.find((e: Entry) => e.dmrlId === "dmrl-gtfdemo" && e.fields.itemloc === "Q")
  expect(added.status).toBe("freigegeben")
  // übrige Einträge sind in Bearbeitung → DMRL bleibt in Bearbeitung
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").status).toBe("in_bearbeitung")
})

test("Neuer Eintrag mit c: kein F1-Fehler mehr, Eintrag in Bearbeitung", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "Q", dmentryType: "c", type: "changed" }) })

  await expect(dialog.getByRole("heading", { name: "Neue Einträge (1)" })).toBeVisible()
  await expect(dialog.getByRole("cell", { name: "in Bearbeitung", exact: true })).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.entries.find((e: Entry) => e.dmrlId === "dmrl-gtfdemo" && e.fields.itemloc === "Q").status).toBe("in_bearbeitung")
})

test("Alle Einträge danach freigegeben: DMRL freigegeben, Nachweis „Übernahme Bestand per Check-in“, Freigabestand und Archiv", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await patchDataset(page, RELEASE_VEHICLE)
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "Q", dmentryType: "", type: "new" }) })
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Die DMRL ist freigegeben\./)).toBeVisible()

  await expect(page.getByText(/Freigegeben am .* durch Übernahme Bestand per Check-in — übernommen von Ben Bearbeiter/)).toBeVisible()
  await page.getByRole("link", { name: "Freigabestand anzeigen" }).click()
  await expect(page).toHaveURL(/\/dmrl\/dmrl-gtfdemo\/freigabestand\//, { timeout: 15_000 })
  await expect(page.getByText(/^Freigabestand vom .* \(Übernahme per Check-in\)$/)).toBeVisible()
  await expect(page.getByText(/11 Einträge · Übernahme Bestand per Check-in · übernommen von Ben Bearbeiter/)).toBeVisible()

  await page.goto("/dmrl/dmrl-gtfdemo/archiv?ansicht=freigaben")
  await expect(page.getByRole("columnheader", { name: "Herkunft" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "Übernahme per Check-in" })).toBeVisible()

  const data = await readDataset(page)
  const dmrl = data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo")
  expect(dmrl).toMatchObject({ status: "freigegeben", lock: null, release: { replyArchiveId: null, userId: "user-ben-bearbeiter" } })
  expect(data.history.at(-1).details).toBe(
    "Check-in — 1 neu (davon 1 als freigegeben übernommen), 0 geändert, 10 unverändert — DMRL freigegeben (Übernahme Bestand)"
  )
  // Ladeprüfung: nach Neuladen keine Meldung „beschädigt“
  await page.goto("/dmrl/dmrl-gtfdemo")
  await expect(page.getByText("beschädigt")).toHaveCount(0)
  await expect(page.getByText(/Freigegeben am .* durch Übernahme Bestand per Check-in/)).toBeVisible()
})

test("Nach Freigabe per Check-in: weitere Änderung → „Letzte Freigabe: …, Übernahme per Check-in“", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await patchDataset(page, RELEASE_VEHICLE)
  let file = await checkOut(page)
  let dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "Q", dmentryType: "", type: "new" }) })
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()

  file = await checkOut(page)
  dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "R", dmentryType: "n", type: "new" }) })
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText("Nicht freigegeben")).toBeVisible()
  await expect(page.getByText(/Letzte Freigabe: \d{2}\.\d{2}\.\d{4}, Übernahme per Check-in/)).toBeVisible()
})

test("375 px: Hinweis „Bestand übernehmen“ ohne waagerechtes Scrollen der Seite", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withNewRow(file.csv, { itemloc: "Q", dmentryType: "", type: "new" }) })
  const hint = dialog.getByText("Bestand übernehmen: davon 1 als freigegeben übernommen")
  await expect(hint).toBeVisible()
  const box = (await hint.boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
