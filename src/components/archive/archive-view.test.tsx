import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import type { Dataset } from "@/lib/data/schema"
import { saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { ArchiveView } from "./archive-view"
import { ArchivedFileView } from "./archived-file-view"

let search = new URLSearchParams()
const replace = vi.fn((url: string) => {
  search = new URLSearchParams(url.split("?")[1] ?? "")
})
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/dmrl/dmrl-phungun/archiv",
  useSearchParams: () => search,
}))
const downloadBytes = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadBytes: (...args: unknown[]) => downloadBytes(...args), downloadTextFile: vi.fn() }))

function Page({ dmrlId, archiveId }: { dmrlId: string; archiveId?: string }) {
  const { data } = useDataStore()
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)!
  return archiveId ? <ArchivedFileView dmrl={dmrl} archiveId={archiveId} /> : <ArchiveView dmrl={dmrl} />
}

function renderPage(dmrlId: string, options: { archiveId?: string; tab?: string; data?: Dataset } = {}) {
  window.localStorage.clear()
  saveDataset(options.data ?? buildDemoDataset())
  saveSessionUserId(DEMO_IDS.editorAnna)
  search = new URLSearchParams(options.tab ? `ansicht=${options.tab}` : "")
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <Page dmrlId={dmrlId} archiveId={options.archiveId} />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

describe("Archiv — Austausch", () => {
  beforeEach(() => downloadBytes.mockClear())

  it("PHUNGUN: drei Stände mit Partner, Bearbeiter, Bezug, Anzahl; Kette; keine Lösch-/Änderungsaktionen", async () => {
    renderPage(DEMO_IDS.dmrlPhungun)
    expect(await screen.findByLabelText("Austauschkette")).toHaveTextContent("SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026")
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("SEND00002-2026")
    expect(rows[0]).toHaveTextContent("C1234 Partner Systemtechnik GmbH")
    expect(rows[0]).toHaveTextContent("Anna Bearbeitung")
    expect(rows[0]).toHaveTextContent("C1234 00001-2026")
    expect(rows[0]).toHaveTextContent("32 Einträge")
    expect(rows[1]).toHaveTextContent("REPLY00001-2026")
    expect(rows[1]).toHaveTextContent(/\d+ freigegeben · 0 zu überarbeiten/)
    expect(rows[2]).toHaveTextContent("eigener Stand (erster SEND)")
    expect(screen.queryByRole("button", { name: /löschen|bearbeiten|ändern/i })).toBeNull()
  })

  it("Herunterladen liefert die Originaldatei byte-genau mit Original-Dateinamen", async () => {
    renderPage(DEMO_IDS.dmrlPhungun)
    fireEvent.click(await screen.findByRole("button", { name: `${DEMO_FILES.send1} herunterladen` }))
    const [fileName, bytes] = downloadBytes.mock.calls[0]
    expect(fileName).toBe(DEMO_FILES.send1)
    expect(new TextDecoder().decode(bytes as Uint8Array)).toBe(DEMO_XML_FILES[DEMO_FILES.send1])
  })

  it("zurückgezogener SEND ist gekennzeichnet", async () => {
    const data = buildDemoDataset()
    data.archive = data.archive.map((a) =>
      a.id === DEMO_IDS.archiveSend2 ? { ...a, withdrawn: { at: "2026-11-13T10:00:00.000Z", userId: DEMO_IDS.admin, reason: "Partner antwortet nicht" } } : a
    )
    data.dmrls = data.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, status: "in_bearbeitung" } : d))
    data.entries = data.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlPhungun ? { ...e, status: "in_bearbeitung" } : e))
    renderPage(DEMO_IDS.dmrlPhungun, { data })
    expect(await screen.findByText(/zurückgezogen am 13\.11\.2026, \d\d:\d\d von Administrator — Partner antwortet nicht/)).toBeInTheDocument()
  })

  it("leere Hinweise für eine DMRL ohne Austausch, Freigabe und Verlauf", async () => {
    const view = renderPage(DEMO_IDS.dmrlVehicle)
    expect(await screen.findByText("Noch kein Austausch mit einem Partner")).toBeInTheDocument()
    view.unmount()
    renderPage(DEMO_IDS.dmrlVehicle, { tab: "freigaben" })
    expect(await screen.findByText("Die DMRL wurde noch nie freigegeben")).toBeInTheDocument()
  })
})

describe("Archiv — Registerkarten und Verlauf", () => {
  it("Registerkarte steht in der Adresse", async () => {
    renderPage(DEMO_IDS.dmrlPhungun)
    const tab = await screen.findByRole("tab", { name: "Verlauf" })
    fireEvent.mouseDown(tab)
    expect(replace).toHaveBeenCalledWith("/dmrl/dmrl-phungun/archiv?ansicht=verlauf", { scroll: false })
  })

  it("Verlauf PHUNGUN: SEND, REPLY übernommen, SEND; Filter nach SEND", async () => {
    renderPage(DEMO_IDS.dmrlPhungun, { tab: "verlauf" })
    const table = await screen.findByRole("table", { name: "Verlauf" })
    const actions = within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[2].textContent)
    expect(actions).toEqual(["SEND", "REPLY übernommen", "SEND"])
    fireEvent.click(screen.getByRole("combobox", { name: "Verlauf nach Aktionsart filtern" }))
    fireEvent.click(await screen.findByRole("option", { name: "SEND" }))
    expect(within(screen.getByRole("table", { name: "Verlauf" })).getAllByRole("row").slice(1)).toHaveLength(2)
  })
})

describe("Archivierter Stand", () => {
  it("REPLY: Kopfdaten, Einträge mit Antwort und ohne Status, nur lesend", async () => {
    renderPage(DEMO_IDS.dmrlPhungun, { archiveId: DEMO_IDS.archiveReply1 })
    expect(await screen.findByRole("heading", { name: /REPLY C1234 00001-2026/ })).toBeInTheDocument()
    expect(screen.getByLabelText("Kopfdaten")).toHaveTextContent("REPLY (Antwort des Partners)")
    expect(screen.getByRole("columnheader", { name: "Antwort" })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull()
    expect(screen.queryByLabelText("Einträge je Status")).toBeNull()
    expect(screen.getAllByText("genehmigt (y)").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Herunterladen" })).toBeInTheDocument()
  })

  it("unbekannter Stand: „Archivstand nicht gefunden\"", async () => {
    renderPage(DEMO_IDS.dmrlPhungun, { archiveId: "gibt-es-nicht" })
    expect(await screen.findByText("Archivstand nicht gefunden")).toBeInTheDocument()
  })
})
