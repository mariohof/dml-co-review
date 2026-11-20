import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs, switchUser } from "./helpers"

/**
 * PROJ-12 SEND-Export im echten Browser — mit echter XSD-Prüfung (PROJ-11, xmllint über die Serverfunktion).
 * Deckt alle drei Issues ab: Fahrzeug 4.2, Hubschrauber 5.0, PHUNGUN 2.3 (nach Zurückziehen).
 */

const year = new Date().getFullYear()

async function sendTo(page: Page, dmrlId: string, remarks = "") {
  await page.goto(`/dmrl/${dmrlId}`)
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("combobox", { name: "Empfänger" }).click()
  await page.getByRole("option", { name: /C1234/ }).click()
  if (remarks) await dialog.getByLabel("Bemerkung (optional)").fill(remarks)
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Senden" }).click()
  const download = await downloadPromise
  const content = readFileSync((await download.path())!, "utf8")
  await expect(dialog).toBeHidden()
  return { fileName: download.suggestedFilename(), content }
}

test.describe("SEND-Export (PROJ-12)", () => {
  test("Fahrzeug (4.2) und Hubschrauber (5.0): schemagültig gesendet, archiviert, Status gesendet", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")

    const vehicle = await sendTo(page, "dmrl-gtfdemo", "Bitte prüfen & bestätigen")
    expect(vehicle.fileName).toBe(`DML-GTFDEMO-D0815-C-${year}-00001_001-00.XML`)
    expect(vehicle.content).toContain('listDirection="send"')
    expect(vehicle.content).toContain("<simplePara>Bitte prüfen &amp; bestätigen</simplePara>")
    await expect(page.getByText(`00001-${year}`).first()).toBeVisible()
    await expect(page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" })).toBeDisabled()

    const aircraft = await sendTo(page, "dmrl-thsdemo")
    expect(aircraft.fileName).toBe(`DML-THSDEMO-D0815-C-${year}-00001_001-00.XML`)
    expect(aircraft.content).toContain('systemDiffCode="G"')

    const data = await readDataset(page)
    const archived = data.archive.filter((a: { direction: string; dmrlId: string }) => a.direction === "send" && a.dmrlId !== "dmrl-phungun")
    expect(archived.map((a: { content: string }) => a.content)).toEqual([vehicle.content, aircraft.content])
    expect(data.dmrls.filter((d: { status: string }) => d.status === "gesendet")).toHaveLength(3)
  })

  test("PHUNGUN (2.3): Administrator zieht SEND 00002 zurück, Bearbeiterin sendet 00003", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/dmrl/dmrl-phungun")
    await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND zurückziehen" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Begründung").fill("Empfänger antwortet nicht")
    await dialog.getByRole("button", { name: "Zurückziehen" }).click()
    await expect(dialog).toBeHidden()

    await switchUser(page, "Anna Bearbeitung")
    const result = await sendTo(page, "dmrl-phungun")
    expect(result.fileName).toBe(`DML-PHUNGUN-D0815-C-${year}-${year === 2026 ? "00003" : "00001"}_001-00.XML`)
    expect(result.content).toContain('<dml direction="send"')
    // dmlref auf den letzten REPLY C1234-00001
    expect(result.content).toMatch(/<dmlref>\s*<dmlc>\s*<modelic>PHUNGUN<\/modelic>\s*<sendid>C1234<\/sendid>/)
  })
})
