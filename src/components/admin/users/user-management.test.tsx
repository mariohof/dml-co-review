import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { UserManagement } from "./user-management"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function renderPage() {
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <UserManagement />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const storedUsers = () => {
  const result = loadDataset()
  return result.kind === "ok" ? result.data.users : []
}

describe("Benutzerverwaltung", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    saveSessionUserId(DEMO_IDS.admin)
  })

  it("listet alle Benutzer sortiert mit Rolle, Status und Kennzeichen Systemkonto", async () => {
    renderPage()
    const rows = await screen.findAllByRole("row")
    const names = rows.slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent)
    expect(names).toEqual(["AdministratorSystemkonto(Sie)", "Anna Bearbeitung", "Ben Bearbeiter"])
    expect(screen.getByLabelText("Administrator bearbeiten")).toBeDisabled()
  })

  it("filtert nach Name und zeigt „Keine Benutzer gefunden\"", async () => {
    renderPage()
    const search = await screen.findByLabelText("Benutzer nach Name suchen")
    fireEvent.change(search, { target: { value: "ben" } })
    expect(screen.getAllByRole("row")).toHaveLength(2)
    fireEvent.change(search, { target: { value: "zzz" } })
    expect(screen.getByText("Keine Benutzer gefunden")).toBeInTheDocument()
  })

  it("zeigt Fehlermeldungen für leere Pflichtfelder und doppelte Namen", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Benutzer anlegen" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("Bitte einen Namen eingeben.")).toBeInTheDocument()
    expect(within(dialog).getByText("Bitte eine Rolle wählen.")).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "anna bearbeitung" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("Dieser Name ist bereits vergeben.")).toBeInTheDocument()
    expect(storedUsers()).toHaveLength(3)
  })

  it("verhindert das Deaktivieren bei offenem SEND und nennt die DMRL", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("Anna Bearbeitung deaktivieren"))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Deaktivieren nicht möglich")).toBeInTheDocument()
    expect(within(dialog).getByText(/wartet auf REPLY zu SEND 00002-2026/)).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: "Deaktivieren" })).toBeNull()
  })

  it("deaktiviert und aktiviert einen Benutzer nach Bestätigung", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("Ben Bearbeiter deaktivieren"))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Deaktivieren" }))
    await waitFor(() => expect(storedUsers().find((u) => u.id === DEMO_IDS.editorBen)?.active).toBe(false))
    expect(screen.getByText("inaktiv")).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Ben Bearbeiter aktivieren"))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Aktivieren" }))
    await waitFor(() => expect(storedUsers().find((u) => u.id === DEMO_IDS.editorBen)?.active).toBe(true))
  })

  it("bietet keine Möglichkeit zum Löschen", async () => {
    renderPage()
    await screen.findAllByRole("row")
    expect(screen.queryByRole("button", { name: /löschen/i })).toBeNull()
  })
})
