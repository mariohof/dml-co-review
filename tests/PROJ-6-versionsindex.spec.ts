import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { patchDataset, readDataset, startAs, switchUser } from "./helpers"

/**
 * PROJ-6 Refinement 2026-11-22 — Versionsindex erster SEND im echten Browser
 * (inkl. echter XSD-Prüfung beim SEND über xmllint).
 */

const year = new Date().getFullYear()
const HINT = /Bei einem bereits laufenden Austausch die nächste Nummer eintragen, die der Empfänger erwartet/
const LOCKED = "Versionsindex wird bereits vom SEND-Zähler fortgeführt."

async function pickOption(page: Page, label: string, option: RegExp | string) {
  await page.getByRole("dialog").getByLabel(label).click()
  await page.getByRole("option", { name: option }).click()
}

async function editDmrl(page: Page, name: string) {
  await page.goto("/verwaltung/dmrl")
  await page.getByLabel(`DMRL ${name} bearbeiten`).click()
  return page.getByRole("dialog")
}

async function openSendDialog(page: Page, dmrlId: string) {
  await page.goto(`/dmrl/${dmrlId}`)
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" }).click()
  return page.getByRole("dialog")
}

async function sendTo(page: Page, dmrlId: string) {
  const dialog = await openSendDialog(page, dmrlId)
  await dialog.getByRole("combobox", { name: "Empfänger" }).click()
  await page.getByRole("option", { name: /C1234/ }).click()
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Senden" }).click()
  const download = await downloadPromise
  const content = readFileSync((await download.path())!, "utf8")
  await expect(dialog).toBeHidden()
  return { fileName: download.suggestedFilename(), content }
}

async function withdrawSend(page: Page, dmrlId: string) {
  await page.goto(`/dmrl/${dmrlId}`)
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND zurückziehen" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Begründung").fill("QA")
  await dialog.getByRole("button", { name: "Zurückziehen" }).click()
  await expect(dialog).toBeHidden()
}

test.describe("PROJ-6 Versionsindex erster SEND", () => {
  test("Anlegen: Vorbelegung 00001-<Jahr> mit Hinweistext, Format- und Jahresprüfung, Vorgabe wird gespeichert", async ({ page }) => {
    await startAs(page, "Administrator")
    // Fahrzeug-DMRL löschen, damit ein System frei ist
    await page.goto("/verwaltung/dmrl")
    await page.getByLabel("DMRL Geschütztes Transportfahrzeug löschen").click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click()

    await page.getByRole("button", { name: "DMRL anlegen" }).click()
    const dialog = page.getByRole("dialog")
    const field = dialog.getByLabel("Versionsindex erster SEND")
    await expect(field).toHaveValue(`00001-${year}`)
    await expect(dialog.getByText(HINT)).toBeVisible()
    await pickOption(page, "System", /Geschütztes Transportfahrzeug/)
    await pickOption(page, "Originator", /D0815/)

    for (const invalid of ["13-2026", "00000-2026", "ABCDE-2026"]) {
      await field.fill(invalid)
      await dialog.getByRole("button", { name: "Speichern" }).click()
      await expect(dialog.getByText("Versionsindex muss das Format NNNNN-JJJJ haben (00001–99999).")).toBeVisible()
    }
    await field.fill(`00013-${year - 1}`)
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(dialog.getByText(`Das Jahr muss das aktuelle Jahr (${year}) sein.`)).toBeVisible()

    await field.fill(`00013-${year}`)
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const data = await readDataset(page)
    const created = data.dmrls.find((d: { systemId: string }) => d.systemId === "sys-gtfdemo" || d.systemId.includes("gtf"))
    expect(created?.firstSendVersionIndex).toBe(`00013-${year}`)
  })

  test("Demo-Daten: PHUNGUN gesperrt (00001-2026), Fahrzeug änderbar", async ({ page }) => {
    await startAs(page, "Administrator")
    let dialog = await editDmrl(page, "PHUNGUN")
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toBeDisabled()
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toHaveValue("00001-2026")
    await expect(dialog.getByText(LOCKED)).toBeVisible()
    await dialog.getByRole("button", { name: "Abbrechen" }).click()

    dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toBeEnabled()
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toHaveValue(`00001-${year}`)
  })

  test("Laufender Austausch: Vorgabe nach Check-in änderbar, erster SEND 00013 (dmlref auf sich selbst), danach gesperrt; nach Zurückziehen 00014", async ({ page }) => {
    await startAs(page, "Administrator")
    // abgeschlossener Check-in sperrt die Vorgabe nicht
    await patchDataset(
      page,
      `data.history.push({ id: "h-qa-ci", dmrlId: "dmrl-gtfdemo", at: new Date().toISOString(), userId: data.users[0].id, action: "check_in", details: "QA" })`
    )
    let dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByLabel("Originator")).toBeDisabled() // im Workflow benutzt
    await dialog.getByLabel("Versionsindex erster SEND").fill(`00013-${year}`)
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    expect((await readDataset(page)).history.at(-1).details).toBe(
      `Kopfdaten geändert: Versionsindex erster SEND 00001-${year} → 00013-${year}`
    )

    await switchUser(page, "Ben Bearbeiter")
    dialog = await openSendDialog(page, "dmrl-gtfdemo")
    await expect(dialog.getByLabel("Vorschau")).toContainText(`00013-${year}`)
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    const first = await sendTo(page, "dmrl-gtfdemo")
    expect(first.fileName).toBe(`DML-GTFDEMO-D0815-C-${year}-00013_001-00.XML`)
    // Issue 4.2: dmlCode (eigener) und dmlRef tragen beide seqNumber 00013 (Verweis auf sich selbst)
    expect(first.content.match(/seqNumber="00013"/g)).toHaveLength(2)

    await switchUser(page, "Administrator")
    dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toBeDisabled()
    await expect(dialog.getByText(LOCKED)).toBeVisible()
    await dialog.getByRole("button", { name: "Abbrechen" }).click()

    await withdrawSend(page, "dmrl-gtfdemo")
    dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toBeDisabled() // auch nach Zurückziehen
    await dialog.getByRole("button", { name: "Abbrechen" }).click()

    await switchUser(page, "Ben Bearbeiter")
    const second = await sendTo(page, "dmrl-gtfdemo")
    expect(second.fileName).toBe(`DML-GTFDEMO-D0815-C-${year}-00014_001-00.XML`)
  })

  test("Abgelaufene Vorgabe: Bearbeiten speichert andere Kopfdaten mit Hinweis; SEND-Vorschau zeigt 00001 mit Hinweis", async ({ page }) => {
    await startAs(page, "Administrator")
    await patchDataset(page, `data.dmrls.find((d) => d.id === "dmrl-gtfdemo").firstSendVersionIndex = "00013-${year - 1}"`)
    const dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByText(`Vorgabe abgelaufen — der erste SEND erhält 00001-${year}.`)).toBeVisible()
    await dialog.getByLabel("Sicherheitseinstufung").fill("02")
    await dialog.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const stored = (await readDataset(page)).dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo")
    expect(stored).toMatchObject({ security: "02", firstSendVersionIndex: `00013-${year - 1}` })

    await switchUser(page, "Ben Bearbeiter")
    const send = await openSendDialog(page, "dmrl-gtfdemo")
    await expect(send.getByLabel("Vorschau")).toContainText(`00001-${year}`)
    await expect(send.getByText(new RegExp(`Der vorgegebene Versionsindex 00013-${year - 1} stammt aus einem vergangenen Jahr`))).toBeVisible()
  })

  test("XML-Export ohne SEND trägt die Vorgabe", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    await patchDataset(page, `data.dmrls.find((d) => d.id === "dmrl-gtfdemo").firstSendVersionIndex = "00013-${year}"`)
    await page.goto("/dmrl/dmrl-gtfdemo")
    await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("menuitem", { name: "Als XML exportieren" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`DML-GTFDEMO-D0815-C-${year}-00013_000-01.XML`)
  })

  test("Altbestand ohne Vorgabe bleibt ladbar; erster SEND 00001", async ({ page }) => {
    await startAs(page, "Administrator")
    await patchDataset(page, `data.dmrls.forEach((d) => delete d.firstSendVersionIndex)`)
    const dialog = await editDmrl(page, "Geschütztes Transportfahrzeug")
    await expect(dialog.getByLabel("Versionsindex erster SEND")).toHaveValue(`00001-${year}`)
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await switchUser(page, "Ben Bearbeiter")
    const send = await openSendDialog(page, "dmrl-gtfdemo")
    await expect(send.getByLabel("Vorschau")).toContainText(`00001-${year}`)
  })
})
