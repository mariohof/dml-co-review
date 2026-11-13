import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset } from "@/lib/data/schema"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { OrganisationManagement } from "./organisation-management"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function renderPage(dataset: Dataset = buildDemoDataset()) {
  window.localStorage.clear()
  saveDataset(dataset)
  saveSessionUserId(DEMO_IDS.admin)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <OrganisationManagement />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const storedOrgs = () => {
  const result = loadDataset()
  return result.kind === "ok" ? result.data.organisations : []
}

describe("Organisationsverwaltung", () => {
  beforeEach(() => window.localStorage.clear())

  it("zeigt die Demo-Organisationen sortiert nach CAGE-Code, als benutzt, mit gesperrtem Löschen", async () => {
    renderPage()
    const rows = (await screen.findAllByRole("row")).slice(1)
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["C1234", "D0815"])
    expect(screen.getAllByText("im Workflow benutzt")).toHaveLength(2)
    expect(screen.getByLabelText("C1234 löschen")).toBeDisabled()
    expect(
      screen.getAllByLabelText("Die Organisation ist an Workflows beteiligt und kann nicht gelöscht werden.", { selector: "span" })
    ).toHaveLength(2)
  })

  it("sperrt beim Bearbeiten einer benutzten Organisation den CAGE-Code, der Name bleibt änderbar", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("C1234 bearbeiten"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("CAGE-Code")).toBeDisabled()
    expect(within(dialog).getByText("CAGE-Code wird in Workflows verwendet und kann nicht geändert werden.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Partner Systemtechnik AG" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    await waitFor(() => expect(storedOrgs().find((o) => o.code === "C1234")?.name).toBe("Partner Systemtechnik AG"))
  })

  it("legt eine Organisation an (CAGE-Code in Großbuchstaben) und löscht sie wieder", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Organisation anlegen" }))
    const dialog = await screen.findByRole("dialog")
    const code = within(dialog).getByLabelText("CAGE-Code")
    fireEvent.change(code, { target: { value: "x0001" } })
    expect(code).toHaveValue("X0001")
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Neue Firma" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    await waitFor(() => expect(storedOrgs().some((o) => o.code === "X0001")).toBe(true))

    fireEvent.click(await screen.findByLabelText("X0001 löschen"))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Löschen" }))
    await waitFor(() => expect(storedOrgs().some((o) => o.code === "X0001")).toBe(false))
  })

  it("meldet einen ungültigen und einen doppelten CAGE-Code", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Organisation anlegen" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("CAGE-Code"), { target: { value: "C12" } })
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Firma" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("CAGE-Code muss aus genau 5 Buchstaben/Ziffern bestehen.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("CAGE-Code"), { target: { value: "c1234" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("CAGE-Code bereits vergeben.")).toBeInTheDocument()
    expect(storedOrgs()).toHaveLength(2)
  })

  it("zeigt „Keine Organisationen gefunden\", wenn die Suche nichts findet", async () => {
    renderPage()
    const search = await screen.findByLabelText("Organisationen nach CAGE-Code oder Name suchen")
    fireEvent.change(search, { target: { value: "gibt es nicht" } })
    expect(screen.getByText("Keine Organisationen gefunden")).toBeInTheDocument()
  })
})
