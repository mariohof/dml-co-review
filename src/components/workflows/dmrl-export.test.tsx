import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { DmrlView } from "@/components/dmrl/dmrl-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset } from "@/lib/data/schema"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import type { XsdResult } from "@/lib/xsd/types"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }))
const download = vi.fn()
const downloadBytes = vi.fn()
vi.mock("@/lib/files/download", () => ({
  downloadTextFile: (...args: unknown[]) => download(...args),
  downloadBytes: (...args: unknown[]) => downloadBytes(...args),
}))
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: (...args: unknown[]) => toastError(...args),
    loading: vi.fn(() => "t"),
    dismiss: vi.fn(),
  }),
}))
const validate = vi.fn<() => Promise<XsdResult>>()
vi.mock("@/lib/xsd/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xsd/client")>()),
  validateXml: () => validate(),
}))

function View({ dmrlId }: { dmrlId: string }) {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === dmrlId)!} />
}

function renderView(dmrlId: string, data: Dataset = buildDemoDataset()) {
  window.localStorage.clear()
  saveDataset(data)
  saveSessionUserId(DEMO_IDS.editorAnna)
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

async function choose(format: "Als CSV exportieren" | "Als XML exportieren" | "Als Excel exportieren") {
  const trigger = within(screen.getByRole("toolbar", { name: "Aktionen" })).getByRole("button", { name: "Exportieren" })
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
  await act(async () => {
    fireEvent.click(await screen.findByRole("menuitem", { name: format }))
  })
}

describe("Exportieren in der DMRL-Ansicht", () => {
  beforeEach(() => {
    download.mockReset()
    downloadBytes.mockReset()
    validate.mockReset()
    toastError.mockReset()
  })

  it("CSV bei Status gesendet: Download, keine Änderung am Datenbestand", async () => {
    renderView(DEMO_IDS.dmrlPhungun)
    const before = JSON.stringify(loadDataset())
    await choose("Als CSV exportieren")
    expect(download).toHaveBeenCalledWith(expect.stringMatching(/^DML-PHUNGUN-D0815-C-Export-\d{4}-\d\d-\d\d\.csv$/), expect.any(String), "text/csv;charset=utf-8")
    expect(JSON.stringify(loadDataset())).toBe(before)
  })

  it("Excel bei Status gesendet: sofortiger Download ohne XSD-Prüfung, keine Änderung am Datenbestand", async () => {
    renderView(DEMO_IDS.dmrlPhungun)
    const before = JSON.stringify(loadDataset())
    await choose("Als Excel exportieren")
    expect(downloadBytes).toHaveBeenCalledWith(
      expect.stringMatching(/^DML-PHUNGUN-D0815-C-Export-\d{4}-\d\d-\d\d\.xlsx$/),
      expect.any(Uint8Array),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    expect(validate).not.toHaveBeenCalled()
    expect(JSON.stringify(loadDataset())).toBe(before)
  })

  it("XML: nach bestandener XSD-Prüfung Download; Archiv und Verlauf unverändert", async () => {
    validate.mockResolvedValue({ state: "gueltig", issue: "2.3" })
    renderView(DEMO_IDS.dmrlPhungun)
    const before = JSON.stringify(loadDataset())
    await choose("Als XML exportieren")
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0][0]).toBe("DML-PHUNGUN-D0815-C-2026-00002_000-01.XML")
    expect(JSON.stringify(loadDataset())).toBe(before)
  })

  it("XML mit Schemafehler: Anwendungsfehler mit Bericht, kein Download", async () => {
    validate.mockResolvedValue({ state: "schemafehler", issue: "2.3", findings: [{ line: 4, message: "Element 'x': not expected." }] })
    renderView(DEMO_IDS.dmrlPhungun)
    await choose("Als XML exportieren")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Anwendungsfehler")).toBeInTheDocument()
    expect(within(dialog).getByText("Element 'x': not expected.")).toBeInTheDocument()
    expect(download).not.toHaveBeenCalled()
  })

  it("XML ohne Einträge bzw. Prüfung nicht verfügbar: Meldung, kein Download", async () => {
    const data = buildDemoDataset()
    data.entries = data.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlPhungun)
    data.dmrls = data.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, status: "in_bearbeitung" } : d))
    const view = renderView(DEMO_IDS.dmrlPhungun, data)
    await choose("Als XML exportieren")
    expect(toastError).toHaveBeenCalledWith("Die DMRL hat keine Einträge.")
    expect(validate).not.toHaveBeenCalled()
    view.unmount()

    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "programm_fehlt" })
    renderView(DEMO_IDS.dmrlPhungun)
    await choose("Als XML exportieren")
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/^XSD-Prüfung nicht verfügbar/), expect.anything()))
    expect(download).not.toHaveBeenCalled()
  })
})
