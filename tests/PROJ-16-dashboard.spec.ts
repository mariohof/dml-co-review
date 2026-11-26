import { expect, test } from "@playwright/test"

import { startAs, switchUser } from "./helpers"

/** PROJ-16 Dashboard im echten Browser */

const kpi = (page: import("@playwright/test").Page, label: string) =>
  page.getByRole("group", { name: "Kennzahlen" }).getByRole("button", { name: new RegExp(`^${label}`) })

test("Kennzahlen, Kachel-Filter, Issue-Filter, Suche, Auswahl, Benutzerwechsel", async ({ page }) => {
  await startAs(page, "Administrator")
  await expect(kpi(page, "Bestände")).toContainText("4")
  await expect(kpi(page, "Offene SEND")).toContainText("1")
  await expect(kpi(page, "Offene Änderungen")).toContainText("32")
  await expect(kpi(page, "Freigegeben")).toContainText("0")

  await kpi(page, "Offene SEND").click()
  await expect(page).toHaveURL(/kachel=send/)
  await expect(page.getByText("1 sichtbare Bestände")).toBeVisible()
  await expect(kpi(page, "Offene SEND")).toHaveAttribute("aria-pressed", "true")
  await kpi(page, "Offene SEND").click()
  await expect(page.getByText("4 sichtbare Bestände")).toBeVisible()

  await page.getByRole("combobox", { name: "Filter S1000D-Issue" }).click()
  await page.getByRole("option", { name: "Issue 4.2" }).click()
  await expect(page.getByText("1 sichtbare Bestände")).toBeVisible()
  await expect(page.getByRole("link", { name: "Geschütztes Transportfahrzeug", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Filter zurücksetzen" }).click()

  await page.getByLabel("DMRLs nach System oder MI suchen").fill("PHUN")
  await expect(page.getByText("1 sichtbare Bestände")).toBeVisible()
  await page.getByRole("link", { name: "Auswahl PHUNGUN" }).click()
  await expect(page.getByRole("heading", { name: "PHUNGUN" })).toBeVisible()

  await page.goto("/")
  await switchUser(page, "Ben Bearbeiter")
  await expect(kpi(page, "Bestände")).toContainText("2")
  await expect(page.getByRole("link", { name: "PHUNGUN", exact: true })).toHaveCount(0)
})

// Regression BUG-QA2-4: schnelle Filteränderungen — nach „Zurück" muss der zuletzt gesetzte Filter erscheinen
test("Filter bleibt bei Zurück-Navigation erhalten (BUG-QA2-4)", async ({ page }) => {
  await startAs(page, "Administrator")
  await kpi(page, "Offene SEND").click()
  await kpi(page, "Offene SEND").click()
  await page.getByLabel("DMRLs nach System oder MI suchen").fill("PHUN")
  await expect(page.getByText("1 sichtbare Bestände")).toBeVisible()
  await page.getByRole("link", { name: "Auswahl PHUNGUN" }).click()
  await expect(page.getByRole("heading", { name: "PHUNGUN" })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/suche=PHUN/)
  await expect(page.getByText("1 sichtbare Bestände")).toBeVisible()
})

test("Mobil (375 px): „Auswahl\" ist ohne Scrollen sichtbar (BUG-QA1-3)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await startAs(page, "Administrator")
  const button = page.getByRole("link", { name: "Auswahl PHUNGUN" })
  await button.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 200)) // nur senkrecht scrollen
  await expect(button).toBeInViewport()
  const box = (await button.boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  await page.screenshot({ path: "test-results/dashboard-375.png", fullPage: true })
})
