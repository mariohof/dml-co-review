import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset } from "@/lib/data/schema"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { DmrlManagement } from "./dmrl-management"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function renderPage(dataset: Dataset = buildDemoDataset()) {
  window.localStorage.clear()
  saveDataset(dataset)
  saveSessionUserId(DEMO_IDS.admin)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <DmrlManagement />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const editorsOf = (dmrlId: string) => {
  const result = loadDataset()
  return result.kind === "ok" ? result.data.dmrls.find((d) => d.id === dmrlId)?.editorUserIds : undefined
}

describe("DMRL-Berechtigungen", () => {
  it("zeigt die berechtigten Bearbeiter in der Spalte „Bearbeiter\"", async () => {
    renderPage()
    const rows = (await screen.findAllByRole("row")).slice(1)
    const editorsCell = (row: HTMLElement) => within(row).getAllByRole("cell")[7].textContent
    expect(rows.map(editorsCell)).toEqual(["Anna BearbeitungBen Bearbeiter", "Anna Bearbeitung", "Ben Bearbeiter"])
  })

  it("vergibt eine Berechtigung über die Mehrfachauswahl", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("Berechtigungen für Transporthubschrauber"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Berechtigungen — Transporthubschrauber")).toBeInTheDocument()
    expect(within(dialog).queryByText("Administrator")).toBeNull()
    const anna = within(dialog).getByRole("checkbox", { name: /Anna Bearbeitung/ })
    expect(anna).not.toBeChecked()
    expect(within(dialog).getByRole("checkbox", { name: /Ben Bearbeiter/ })).toBeChecked()
    fireEvent.click(anna)
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    await waitFor(() => expect(editorsOf(DEMO_IDS.dmrlAircraft)).toEqual([DEMO_IDS.editorAnna, DEMO_IDS.editorBen]))
  })

  it("lässt bei „Abbrechen\" alles unverändert", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("Berechtigungen für PHUNGUN"))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Anna Bearbeitung/ }))
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(editorsOf(DEMO_IDS.dmrlPhungun)).toEqual([DEMO_IDS.editorAnna])
  })

  it("sperrt den Sperrinhaber und kennzeichnet inaktive Bearbeiter", async () => {
    const demo = buildDemoDataset()
    demo.users = demo.users.map((u) => (u.id === DEMO_IDS.editorAnna ? { ...u, active: false } : u))
    demo.dmrls = demo.dmrls.map((d) =>
      d.id === DEMO_IDS.dmrlVehicle ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-13T08:00:00.000Z", entries: [] } } : d
    )
    renderPage(demo)
    fireEvent.click(await screen.findByLabelText("Berechtigungen für Geschütztes Transportfahrzeug"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("checkbox", { name: /Ben Bearbeiter/ })).toBeDisabled()
    expect(
      within(dialog).getByText("Ben Bearbeiter hat die DMRL ausgecheckt und kann erst nach dem Check-in entfernt werden.")
    ).toBeInTheDocument()
    const anna = within(dialog).getByRole("checkbox", { name: /Anna Bearbeitung/ })
    expect(within(dialog).getByText("inaktiv")).toBeInTheDocument()
    expect(anna).not.toBeDisabled()
    fireEvent.click(anna)
    expect(anna).toBeDisabled() // abgewählt: inaktive können nicht neu hinzugefügt werden
  })

  it("weist darauf hin, wenn es keine aktiven Bearbeiter gibt", async () => {
    const demo = buildDemoDataset()
    demo.users = demo.users.map((u) => (u.role === "bearbeiter" ? { ...u, active: false } : u))
    renderPage(demo)
    fireEvent.click(await screen.findByLabelText("Berechtigungen für PHUNGUN"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Keine aktiven Bearbeiter vorhanden/)).toBeInTheDocument()
  })
})
