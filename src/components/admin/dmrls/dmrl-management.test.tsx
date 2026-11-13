import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { DmrlManagement } from "./dmrl-management"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function renderPage() {
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

const stored = () => {
  const result = loadDataset()
  if (result.kind !== "ok") throw new Error("Datenbestand ungültig")
  return result.data
}

describe("DMRL-Verwaltung", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    saveSessionUserId(DEMO_IDS.admin)
  })

  it("listet die DMRLs sortiert nach System mit Kopfangaben und Status", async () => {
    renderPage()
    const rows = (await screen.findAllByRole("row")).slice(1)
    expect(rows.map((row) => within(row).getAllByRole("cell")[1].textContent)).toEqual(["GTFDEMO", "PHUNGUN", "THSDEMO"])
    const phungun = rows[1]
    expect(within(phungun).getByText("D0815")).toBeInTheDocument()
    expect(within(phungun).getByText("Gesendet")).toBeInTheDocument()
    expect(within(phungun).getByText("32 Einträge")).toBeInTheDocument()
  })

  it("sperrt „DMRL anlegen\", solange kein System ohne DMRL existiert", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "DMRL anlegen" })).toBeDisabled()
    expect(screen.getByLabelText("Kein System ohne DMRL vorhanden — legen Sie zuerst ein System an.")).toBeInTheDocument()
  })

  it("sperrt bei PHUNGUN Löschen sowie Originator und DML-Typ; die Sicherheitseinstufung wird mit Verlauf geändert", async () => {
    renderPage()
    expect(await screen.findByLabelText("DMRL PHUNGUN löschen")).toBeDisabled()
    fireEvent.click(screen.getByLabelText("DMRL PHUNGUN bearbeiten"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("System")).toBeDisabled()
    expect(within(dialog).getByLabelText("Originator")).toBeDisabled()
    expect(within(dialog).getByLabelText("DML-Typ")).toBeDisabled()
    const security = within(dialog).getByLabelText("Sicherheitseinstufung")
    fireEvent.change(security, { target: { value: "21" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    expect(await within(dialog).findByText("Sicherheitseinstufung muss zweistellig sein (01–20).")).toBeInTheDocument()
    fireEvent.change(security, { target: { value: "02" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }))
    await waitFor(() => expect(stored().dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)?.security).toBe("02"))
    expect(stored().history.at(-1)?.details).toBe("Kopfdaten geändert: Sicherheitseinstufung 01 → 02")
  })

  it("löscht eine DMRL ohne Workflow mit Einträgen; danach ist „DMRL anlegen\" möglich", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("DMRL Geschütztes Transportfahrzeug löschen"))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/mit allen Einträgen und Berechtigungen/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Löschen" }))
    await waitFor(() => expect(stored().dmrls.some((d) => d.id === DEMO_IDS.dmrlVehicle)).toBe(false))
    expect(stored().entries.some((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)).toBe(false)
    expect(screen.getByRole("button", { name: "DMRL anlegen" })).not.toBeDisabled()
  })

  it("findet DMRLs über den Originator", async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText("DMRLs nach System, Model Ident Code oder Originator suchen"), {
      target: { value: "c1234" },
    })
    expect(screen.getByText("Keine DMRLs gefunden")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("DMRLs nach System, Model Ident Code oder Originator suchen"), {
      target: { value: "d0815" },
    })
    expect(screen.getAllByRole("row")).toHaveLength(4)
  })
})
