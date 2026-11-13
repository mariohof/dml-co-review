import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset } from "@/lib/data/schema"
import { saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { Dashboard } from "./dashboard"

let search = new URLSearchParams()
const replace = vi.fn((url: string) => {
  search = new URLSearchParams(url.split("?")[1] ?? "")
})
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/",
  useSearchParams: () => search,
}))

function renderDashboard(userId: string, query = "", data: Dataset = buildDemoDataset()) {
  window.localStorage.clear()
  saveDataset(data)
  saveSessionUserId(userId)
  search = new URLSearchParams(query)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const tile = (label: string) => within(screen.getByRole("group", { name: "Kennzahlen" })).getByRole("button", { name: new RegExp(`^${label}`) })
const tableRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1)

describe("Dashboard", () => {
  it("Administrator: Kacheln 3 / 1 / 20 / 0, Tabelle mit allen Spalten und „Auswahl\"", async () => {
    renderDashboard(DEMO_IDS.admin)
    expect(await screen.findByText("3 sichtbare Bestände")).toBeInTheDocument()
    expect(tile("Bestände")).toHaveTextContent("3")
    expect(tile("Offene SEND")).toHaveTextContent("1")
    expect(tile("Offene Änderungen")).toHaveTextContent("20")
    expect(tile("Freigegeben")).toHaveTextContent("0")
    const phungun = tableRows().find((row) => within(row).queryByText("PHUNGUN"))!
    expect(phungun).toHaveTextContent("PHUNGUN–D0815–C")
    expect(phungun).toHaveTextContent("00002-2026")
    expect(phungun).toHaveTextContent("0 / 32 freigegeben")
    expect(within(phungun).getByRole("link", { name: "Auswahl PHUNGUN" })).toHaveAttribute("href", `/dmrl/${DEMO_IDS.dmrlPhungun}`)
    expect(tableRows().find((row) => within(row).queryByText("Geschütztes Transportfahrzeug"))).toHaveTextContent("—")
  })

  it("Kachel „Offene SEND\" filtert und ist hervorgehoben; erneuter Klick hebt auf", async () => {
    renderDashboard(DEMO_IDS.admin)
    fireEvent.click(await screen.findByRole("button", { name: /^Offene SEND/ }))
    expect(replace).toHaveBeenLastCalledWith("/?kachel=send", { scroll: false })
    expect(tile("Offene SEND")).toHaveAttribute("aria-pressed", "true")
    expect(tableRows()).toHaveLength(1)
    expect(screen.getByText("1 sichtbare Bestände")).toBeInTheDocument()
    fireEvent.click(tile("Offene SEND"))
    expect(replace).toHaveBeenLastCalledWith("/", { scroll: false })
  })

  it("Issue 4.2 und Suche „PHUN\" aus der Adresse; keine Treffer; Zurücksetzen und sofort tippen", async () => {
    const view = renderDashboard(DEMO_IDS.admin, "issue=4.2")
    expect(await screen.findByText("1 sichtbare Bestände")).toBeInTheDocument()
    expect(tableRows()[0]).toHaveTextContent("Geschütztes Transportfahrzeug")
    view.unmount()
    const second = renderDashboard(DEMO_IDS.admin, "suche=PHUN")
    expect(tableRows()).toHaveLength(1)
    second.unmount()
    renderDashboard(DEMO_IDS.admin, "suche=gibtsnicht")
    expect(screen.getByText("Keine DMRL entspricht dem Filter")).toBeInTheDocument()
    // Regression: nach „Filter zurücksetzen" darf der alte Filter beim Tippen nicht zurückkehren
    fireEvent.click(screen.getByRole("button", { name: "Filter zurücksetzen" }))
    fireEvent.change(screen.getByLabelText("DMRLs nach System oder MI suchen"), { target: { value: "PHUN" } })
    expect(tableRows()).toHaveLength(1)
    expect(replace).toHaveBeenLastCalledWith("/?suche=PHUN", { scroll: false })
  })

  it("Bearbeiterin sieht nur ihre DMRLs; Aufgaben verlinken auf die DMRL; ohne Aufgaben kein Bereich", async () => {
    const data = buildDemoDataset()
    const first = data.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)!
    data.entries = data.entries.map((e) => (e.id === first.id ? { ...e, status: "zu_ueberarbeiten" } : e))
    const view = renderDashboard(DEMO_IDS.editorAnna, "", data)
    expect(await screen.findByText("2 sichtbare Bestände")).toBeInTheDocument()
    const tasks = screen.getByRole("list", { name: "Meine Aufgaben" })
    expect(within(tasks).getByRole("link", { name: "1 Eintrag zu überarbeiten: PHUNGUN" })).toHaveAttribute("href", `/dmrl/${DEMO_IDS.dmrlPhungun}`)
    expect(screen.getByText("1 zu überarbeiten")).toBeInTheDocument()
    view.unmount()

    // Ben: Fluggerät + Fahrzeug, keine Aufgaben
    renderDashboard(DEMO_IDS.editorBen)
    expect(await screen.findByText(/sichtbare Bestände/)).toBeInTheDocument()
    expect(screen.queryByText("Meine Aufgaben")).toBeNull()
  })

  it("Sperre unter dem Status: „ausgecheckt von …\"", async () => {
    const data = buildDemoDataset()
    data.dmrls = data.dmrls.map((d) =>
      d.id === DEMO_IDS.dmrlVehicle ? { ...d, lock: { userId: DEMO_IDS.editorBen, since: "2026-11-12T08:00:00.000Z", entries: [] } } : d
    )
    renderDashboard(DEMO_IDS.admin, "", data)
    expect(await screen.findByText("ausgecheckt von Ben Bearbeiter")).toBeInTheDocument()
  })

  it("leere Hinweise: Administrator ohne DMRL", async () => {
    const data = buildDemoDataset()
    data.dmrls = []
    data.entries = []
    data.archive = []
    data.history = []
    renderDashboard(DEMO_IDS.admin, "", data)
    expect(await screen.findByText(/Noch keine DMRL angelegt/)).toBeInTheDocument()
  })
})
