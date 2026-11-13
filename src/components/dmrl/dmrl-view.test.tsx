import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { emptyEntryFields, type Dataset, type EntrySnapshot } from "@/lib/data/schema"
import { saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { DmrlView } from "./dmrl-view"
import { EntryTable } from "./entry-table"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function View({ dmrlId }: { dmrlId: string }) {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === dmrlId)!} />
}

function renderView(dmrlId: string, userId: string = DEMO_IDS.admin, dataset: Dataset = buildDemoDataset()) {
  window.localStorage.clear()
  saveDataset(dataset)
  saveSessionUserId(userId)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <View dmrlId={dmrlId} />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const dataRows = () => screen.getAllByRole("button", { name: /^Eintrag .* anzeigen$/ })

describe("DMRL-Ansicht PHUNGUN (Demo)", () => {
  beforeEach(() => renderView(DEMO_IDS.dmrlPhungun))

  it("zeigt Kopfbereich mit Stammdaten, Versionsindex, letztem SEND und Banner „Nicht freigegeben\"", async () => {
    expect(await screen.findByRole("heading", { name: "PHUNGUN" })).toBeInTheDocument()
    expect(screen.getByText("00002-2026")).toBeInTheDocument()
    expect(screen.getByText("Musterbehörde Technische Dokumentation")).toBeInTheDocument()
    expect(screen.getByText(/Letzter SEND 00002-2026 an/)).toHaveTextContent("C1234 Partner Systemtechnik GmbH")
    expect(screen.getByText(/durch Anna Bearbeitung/)).toBeInTheDocument()
    expect(screen.getByText("Nicht freigegeben")).toBeInTheDocument()
    expect(screen.getByText("Darf nicht in einem Technische-Publikation-Projekt verwendet werden.")).toBeInTheDocument()
  })

  it("zeigt die Zählerleiste: 32 Einträge, davon 32 gesendet", () => {
    const counters = screen.getByLabelText("Einträge je Status")
    expect(within(counters).getByText("Gesamt").nextSibling).toHaveTextContent("32")
    expect(within(counters).getAllByText("Gesendet")[0].nextSibling).toHaveTextContent("32")
  })

  it("listet 32 Einträge sortiert nach DMC; Löschungen sind durchgestrichen", () => {
    const rows = dataRows()
    expect(rows).toHaveLength(32)
    const dmcs = rows.map((row) => within(row).getAllByRole("cell")[0].textContent ?? "")
    expect(dmcs).toEqual([...dmcs].sort((a, b) => a.localeCompare(b, "de")))
    const deletion = rows.find((row) => within(row).queryByText("Löschung"))!
    expect(within(deletion).getAllByRole("cell")[0]).toHaveClass("line-through")
  })

  it("filtert über die Zählerleiste und die Suche; „Keine Einträge gefunden\" mit „Filter zurücksetzen\"", () => {
    fireEvent.change(screen.getByLabelText("Einträge nach DMC, Tech Name oder Info Name suchen"), {
      target: { value: "gibt es nicht" },
    })
    expect(screen.getByText("Keine Einträge gefunden")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Filter zurücksetzen" })[0])
    expect(dataRows()).toHaveLength(32)
    const counters = screen.getByLabelText("Einträge je Status")
    fireEvent.click(within(counters).getAllByRole("button")[0]) // In Bearbeitung: 0
    expect(screen.getByText("Keine Einträge gefunden")).toBeInTheDocument()
  })

  it("öffnet per Klick das Detailfenster mit allen Feldern, ohne Bearbeitung", () => {
    fireEvent.click(dataRows()[0])
    const sheet = screen.getByRole("dialog")
    expect(within(sheet).getByText("Tech Name")).toBeInTheDocument()
    expect(within(sheet).getByText("DM-Ausgabetyp (issno/@type)")).toBeInTheDocument()
    expect(within(sheet).getByText("Kommentar des Partners")).toBeInTheDocument()
    expect(within(sheet).queryByRole("textbox")).toBeNull()
  })

  it("öffnet das Detailfenster auch per Tastatur", () => {
    fireEvent.keyDown(dataRows()[1], { key: "Enter" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("zeigt die Aktionsleiste; Aktionen ohne Feature sind gesperrt; Administrator sieht „SEND zurückziehen\"", () => {
    const toolbar = screen.getByRole("toolbar", { name: "Aktionen" })
    expect(within(toolbar).getByRole("button", { name: "REPLY importieren" })).toBeEnabled()
    expect(within(toolbar).getByRole("button", { name: "Archiv" })).toBeEnabled()
    for (const label of ["Check-out", "SEND", "Exportieren"]) {
      expect(within(toolbar).getByRole("button", { name: label })).toBeDisabled()
    }
    expect(within(toolbar).getByLabelText(/Die DMRL wartet auf die Antwort des Partners/)).toBeInTheDocument()
    expect(within(toolbar).getByLabelText("Es wird noch auf die Antwort zum SEND 00002-2026 gewartet.")).toBeInTheDocument()
    expect(within(toolbar).getByRole("button", { name: "SEND zurückziehen" })).toBeEnabled()
    // Check-in sieht nur der Sperrinhaber (PROJ-10)
    expect(within(toolbar).queryByRole("button", { name: "Check-in" })).toBeNull()
  })

  it("bietet keine Möglichkeit, Einträge direkt zu ändern", () => {
    expect(screen.queryByRole("button", { name: /bearbeiten|löschen|hinzufügen/i })).toBeNull()
  })
})

describe("DMRL-Ansicht: weitere Zustände", () => {
  it("zeigt „— noch nicht gesendet —\", Partner-Bemerkung, Sperre und „DM gelöscht\"", async () => {
    const demo = buildDemoDataset()
    demo.dmrls = demo.dmrls.map((d) =>
      d.id === DEMO_IDS.dmrlVehicle
        ? { ...d, partnerRemarks: "Bitte prüfen.", lock: { userId: DEMO_IDS.editorBen, since: "2026-11-13T08:30:00.000Z", entries: [] } }
        : d
    )
    demo.entries = demo.entries.map((e, i) =>
      e.dmrlId === DEMO_IDS.dmrlVehicle && i === demo.entries.findIndex((x) => x.dmrlId === DEMO_IDS.dmrlVehicle)
        ? { ...e, fields: { ...e.fields, type: "deleted" } }
        : e
    )
    renderView(DEMO_IDS.dmrlVehicle, DEMO_IDS.admin, demo)
    expect(await screen.findByText("— noch nicht gesendet —")).toBeInTheDocument()
    expect(screen.getByText("Bitte prüfen.")).toBeInTheDocument()
    expect(screen.getByText(/Ausgecheckt von Ben Bearbeiter seit 13\.11\.2026/)).toBeInTheDocument()
    expect(screen.getByText("DM gelöscht")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sperre aufheben" })).toBeInTheDocument()
  })

  it("zeigt ohne Einträge den Hinweis auf Check-out/Check-in", async () => {
    const demo = buildDemoDataset()
    demo.entries = demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlAircraft)
    renderView(DEMO_IDS.dmrlAircraft, DEMO_IDS.editorBen, demo)
    expect(await screen.findByText("Noch keine Einträge — Einträge werden über Check-out/Check-in erfasst.")).toBeInTheDocument()
  })
})

describe("Eintragstabelle: Seiten", () => {
  it("zeigt 50 Einträge je Seite und blättert", () => {
    const entries: EntrySnapshot[] = Array.from({ length: 60 }, (_, i) => ({
      id: `e${i}`,
      status: "in_bearbeitung",
      fields: { ...emptyEntryFields(), modelic: "TEST", chapnum: String(i).padStart(3, "0"), techname: `Teil ${i}` },
    }))
    render(<EntryTable entries={entries} />)
    expect(dataRows()).toHaveLength(50)
    expect(screen.getByText("Seite 1 von 2")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Nächste Seite"))
    expect(dataRows()).toHaveLength(10)
    expect(screen.getByText("Seite 2 von 2")).toBeInTheDocument()
  })
})
