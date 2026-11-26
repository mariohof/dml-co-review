import { readFileSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { checkOutXlsxToCsv, patchDataset, readDataset, startAs } from "./helpers"

/** QA-Lauf 13 — PROJ-9/10 Refinement 2026-11-26: `dmc` und Informationsfelder (37 Spalten) */

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Aktionen" })
const vehicleDmrl = (data: { dmrls: { id: string }[] }) => data.dmrls.find((d) => d.id === "dmrl-gtfdemo") as unknown as { status: string; lock: unknown }

async function checkOut(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await toolbar(page).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  const lines = checkOutXlsxToCsv(readFileSync((await download.path())!)).split("\r\n")
  const header = lines[0].replace(/^﻿/, "").split(";")
  return { lines, header }
}

async function upload(page: Page, content: string) {
  await toolbar(page).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: "DML-GTFDEMO-D0815-C-2026.csv", mimeType: "text/csv", buffer: Buffer.from(content) })
  return dialog
}

const setCell = (lines: string[], header: string[], row: number, name: string, value: string) => {
  const cells = lines[row].split(";")
  cells[header.indexOf(name)] = value
  lines[row] = cells.join(";")
}

/** Fahrzeug-DMRL freigegeben: alle Einträge freigegeben, ohne Eintragstyp */
const RELEASE_VEHICLE = `
  data.dmrls.find((d) => d.id === "dmrl-gtfdemo").status = "freigegeben"
  for (const e of data.entries) if (e.dmrlId === "dmrl-gtfdemo") { e.status = "freigegeben"; e.fields.dmentryType = "" }
`

test("dmc in der Datei entspricht dem DMC in der DMRL-Ansicht", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const { lines, header } = await checkOut(page)
  const dmcs = lines.slice(1).filter(Boolean).map((l) => l.split(";")[header.indexOf("dmc")])
  expect(dmcs).toHaveLength(10)
  for (const dmc of dmcs.slice(0, 3)) await expect(page.getByText(dmc, { exact: true }).first()).toBeVisible()
})

test("freigegebene DMRL: nur Informationsfelder geändert → bleibt freigegeben, Hinweis im Dialog, kein Eintragstyp verlangt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await patchDataset(page, RELEASE_VEHICLE)
  const { lines, header } = await checkOut(page)
  setCell(lines, header, 1, "orig", "D0815")
  setCell(lines, header, 2, "applic_model", "GTF-A")
  const dialog = await upload(page, lines.join("\r\n"))
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await expect(dialog.getByText("Informationsfelder bei 2 Einträgen aktualisiert")).toBeVisible()
  await expect(dialog.getByText(/Keine fachlichen Änderungen/)).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(vehicleDmrl(data).status).toBe("freigegeben")
  expect(vehicleDmrl(data).lock).toBeNull()
  const entries = data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-gtfdemo")
  expect(entries.every((e: { status: string }) => e.status === "freigegeben")).toBe(true)
})

test("geänderte dmc-Spalte wird ignoriert → „Keine Änderungen“", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const { lines, header } = await checkOut(page)
  setCell(lines, header, 1, "dmc", "FALSCH-0815")
  const dialog = await upload(page, lines.join("\r\n"))
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await expect(dialog.getByText(/^Keine Änderungen/)).toBeVisible()
})

test("Datei mit 28 Spalten: angenommen, Hinweis im Prüfbericht, gespeicherte Informationsfelder bleiben", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await patchDataset(page, `for (const e of data.entries) if (e.dmrlId === "dmrl-gtfdemo") e.fields.orig = "ALT01"`)
  const { lines } = await checkOut(page)
  const legacy = lines.map((l) => (l === "" ? l : l.split(";").slice(0, 28).join(";"))).join("\r\n")
  const dialog = await upload(page, legacy)
  await expect(dialog.getByText("Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten.")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  const entries = data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-gtfdemo")
  expect(entries.every((e: { fields: { orig: string } }) => e.fields.orig === "ALT01")).toBe(true)
})

test("Teilmenge der neuen Spalten → Check-in nicht möglich, Sperre bleibt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const { lines, header } = await checkOut(page)
  const drop = header.indexOf("spec")
  const broken = lines.map((l) => (l === "" ? l : l.split(";").filter((_, i) => i !== drop).join(";"))).join("\r\n")
  const dialog = await upload(page, broken)
  await expect(dialog.getByText("Check-in nicht möglich")).toBeVisible()
  await expect(dialog.getByText("Spalte ‚spec' fehlt.")).toBeVisible()
  expect(vehicleDmrl(await readDataset(page)).lock).not.toBeNull()
})

test("XSS: HTML in einem Informationsfeld wird nirgends ausgeführt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  let dialogs = 0
  page.on("dialog", (d) => {
    dialogs++
    void d.dismiss()
  })
  const { lines, header } = await checkOut(page)
  setCell(lines, header, 1, "orig", "<img src=x onerror=alert(1)>")
  const dialog = await upload(page, lines.join("\r\n"))
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await page.getByRole("button", { name: /GTFDEMO-/ }).first().click().catch(() => undefined)
  expect(dialogs).toBe(0)
  expect(await page.locator("img[src='x']").count()).toBe(0)
})
