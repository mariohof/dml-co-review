import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { SystemManagement } from "./system-management"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function renderPage() {
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <SystemManagement />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const storedSystems = () => {
  const result = loadDataset()
  return result.kind === "ok" ? result.data.systems : []
}

describe("Systemverwaltung", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    saveSessionUserId(DEMO_IDS.admin)
  })

  it("listet die Demo-Systeme sortiert nach Bezeichnung mit MI, Issue und DMRL-Link", async () => {
    renderPage()
    const rows = (await screen.findAllByRole("row")).slice(1)
    expect(rows.map((row) => within(row).getAllByRole("cell")[1].textContent)).toEqual(["S1000DBIKE", "GTFDEMO", "PHUNGUN", "THSDEMO"])
    expect(screen.getAllByRole("link", { name: /vorhanden/ })).toHaveLength(4)
    expect(screen.getByLabelText("PHUNGUN löschen")).toBeDisabled()
    expect(screen.getByLabelText("Transporthubschrauber löschen")).toBeDisabled()
  })

  it("sperrt bei DMRL ohne Workflow Bezeichnung und MI; Issue und Beschreibung bleiben änderbar", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("Geschütztes Transportfahrzeug bearbeiten"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("Bezeichnung")).toBeDisabled()
    expect(within(dialog).getByLabelText("Model Ident Code")).toBeDisabled()
    expect(within(dialog).getAllByText("Fest, da eine DMRL existiert.")).toHaveLength(2)
    expect(within(dialog).getByRole("combobox")).not.toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText("Beschreibung (optional)"), { target: { value: "Geändert" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    await waitFor(() => expect(storedSystems().find((s) => s.id === DEMO_IDS.sysVehicle)?.description).toBe("Geändert"))
  })

  it("sperrt bei benutzten Systemen zusätzlich die S1000D-Issue", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("PHUNGUN bearbeiten"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("combobox")).toBeDisabled()
    expect(within(dialog).getAllByText("Wird in Workflows verwendet und kann nicht geändert werden.")).toHaveLength(3)
  })

  it("meldet ungültigen und doppelten Model Ident Code und zählt die Beschreibung", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "System anlegen" }))
    const dialog = await screen.findByRole("dialog")
    const mi = within(dialog).getByLabelText("Model Ident Code")
    fireEvent.change(mi, { target: { value: "ph-un" } })
    expect(mi).toHaveValue("PH-UN")
    fireEvent.change(within(dialog).getByLabelText("Bezeichnung"), { target: { value: "Neues System" } })
    fireEvent.change(within(dialog).getByLabelText("Beschreibung (optional)"), { target: { value: "abc" } })
    expect(within(dialog).getByText("3 / 500 Zeichen")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("Model Ident Code muss aus 2–14 Buchstaben/Ziffern bestehen.")).toBeInTheDocument()
    expect(within(dialog).getByText("Bitte eine S1000D-Issue wählen.")).toBeInTheDocument()
    fireEvent.change(mi, { target: { value: "phungun" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("Model Ident Code bereits vergeben.")).toBeInTheDocument()
    expect(storedSystems()).toHaveLength(4)
  })

  it("zeigt „Keine Systeme gefunden\" bei erfolgloser Suche und findet über den MI", async () => {
    renderPage()
    const search = await screen.findByLabelText("Systeme nach Bezeichnung oder Model Ident Code suchen")
    fireEvent.change(search, { target: { value: "thsdemo" } })
    expect(screen.getAllByRole("row")).toHaveLength(2)
    fireEvent.change(search, { target: { value: "gibt es nicht" } })
    expect(screen.getByText("Keine Systeme gefunden")).toBeInTheDocument()
  })
})
