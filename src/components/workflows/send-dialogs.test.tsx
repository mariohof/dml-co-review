import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { DmrlView } from "@/components/dmrl/dmrl-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import type { XsdResult } from "@/lib/xsd/types"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }))
const download = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadTextFile: (...args: unknown[]) => download(...args) }))
const validate = vi.fn<(xml: string, issue: string) => Promise<XsdResult>>()
vi.mock("@/lib/xsd/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xsd/client")>()),
  validateXml: (xml: string, issue: string) => validate(xml, issue),
}))

function View({ dmrlId }: { dmrlId: string }) {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === dmrlId)!} />
}

function renderAs(userId: string, dmrlId: string = DEMO_IDS.dmrlVehicle) {
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

const stored = () => {
  const result = loadDataset()
  if (result.kind !== "ok") throw new Error("ungültig")
  return result.data
}
const dmrlOf = (id: string) => stored().dmrls.find((d) => d.id === id)!
const toolbar = () => screen.getByRole("toolbar", { name: "Aktionen" })
const year = new Date().getFullYear()

async function openSend() {
  fireEvent.click(within(toolbar()).getByRole("button", { name: "SEND" }))
  return screen.findByRole("dialog")
}

describe("SEND in der DMRL-Ansicht", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    download.mockClear()
    validate.mockReset()
  })

  it("Dialog zeigt Vorschau; ohne Partner Pflichtfeldfehler; Abbrechen ändert nichts", async () => {
    renderAs(DEMO_IDS.editorBen)
    const dialog = await openSend()
    const preview = within(dialog).getByLabelText("Vorschau")
    expect(preview).toHaveTextContent(`00001-${year}`)
    expect(preview).toHaveTextContent(`DML-GTFDEMO-D0815-C-${year}-00001_001-00.XML`)
    expect(preview).toHaveTextContent("10 gesamt · 10 neu (n) · 0 geändert (c) · 0 Löschung (d)")
    fireEvent.click(within(dialog).getByRole("button", { name: "Senden" }))
    expect(await within(dialog).findByText("Bitte einen Partner auswählen.")).toBeInTheDocument()
    expect(validate).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(dmrlOf(DEMO_IDS.dmrlVehicle).status).toBe("in_bearbeitung")
  })

  it("gültige Datei: archiviert, heruntergeladen, Status gesendet, Kopf zeigt neuen Versionsindex", async () => {
    validate.mockResolvedValue({ state: "gueltig", issue: "4.2" })
    renderAs(DEMO_IDS.editorBen)
    const dialog = await openSend()
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Partner" }))
    fireEvent.click(await screen.findByRole("option", { name: /C1234/ }))
    fireEvent.change(within(dialog).getByLabelText("Bemerkung (optional)"), { target: { value: "Bitte prüfen" } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Senden" }))
    })
    await waitFor(() => expect(dmrlOf(DEMO_IDS.dmrlVehicle).status).toBe("gesendet"))
    expect(validate).toHaveBeenCalledWith(expect.stringContaining("<simplePara>Bitte prüfen</simplePara>"), "4.2")
    const [fileName, xml] = download.mock.calls[0]
    expect(fileName).toBe(`DML-GTFDEMO-D0815-C-${year}-00001_001-00.XML`)
    expect(stored().archive.at(-1)?.content).toBe(xml)
    expect(await screen.findByText(`00001-${year}`)).toBeInTheDocument()
    expect(within(toolbar()).getByRole("button", { name: "SEND" })).toBeDisabled()
  })

  it("Schemafehler: Anwendungsfehler mit Bericht, nichts heruntergeladen/archiviert, Verlauf „fehlgeschlagen\"", async () => {
    validate.mockResolvedValue({ state: "schemafehler", issue: "4.2", findings: [{ line: 3, message: "Element 'x': not expected." }] })
    renderAs(DEMO_IDS.editorBen)
    const dialog = await openSend()
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Partner" }))
    fireEvent.click(await screen.findByRole("option", { name: /C1234/ }))
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Senden" }))
    })
    expect(await within(dialog).findByText("Anwendungsfehler — SEND abgebrochen")).toBeInTheDocument()
    expect(within(dialog).getByText("Element 'x': not expected.")).toBeInTheDocument()
    expect(download).not.toHaveBeenCalled()
    expect(stored().archive.filter((a) => a.dmrlId === DEMO_IDS.dmrlVehicle)).toHaveLength(0)
    expect(stored().history.at(-1)?.action).toBe("send_fehlgeschlagen")
    expect(dmrlOf(DEMO_IDS.dmrlVehicle).status).toBe("in_bearbeitung")
  })

  it("Prüfung nicht verfügbar: blockiert, nichts gespeichert, „Erneut versuchen\"", async () => {
    validate.mockResolvedValueOnce({ state: "nicht_verfuegbar", reason: "programm_fehlt" }).mockResolvedValueOnce({ state: "gueltig", issue: "4.2" })
    renderAs(DEMO_IDS.editorBen)
    const historyBefore = stored().history.length
    const dialog = await openSend()
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Partner" }))
    fireEvent.click(await screen.findByRole("option", { name: /C1234/ }))
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Senden" }))
    })
    expect(await within(dialog).findByText(/XSD-Prüfung nicht verfügbar/)).toBeInTheDocument()
    expect(stored().history).toHaveLength(historyBefore)
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Erneut versuchen" }))
    })
    await waitFor(() => expect(dmrlOf(DEMO_IDS.dmrlVehicle).status).toBe("gesendet"))
  })
})

describe("SEND zurückziehen", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
  })

  it("Administrator: Begründung Pflicht → PHUNGUN in Bearbeitung, Archiv markiert; Bearbeiter sieht die Aktion nicht", async () => {
    const view = renderAs(DEMO_IDS.editorAnna, DEMO_IDS.dmrlPhungun)
    expect(within(toolbar()).queryByRole("button", { name: "SEND zurückziehen" })).toBeNull()
    view.unmount()

    renderAs(DEMO_IDS.admin, DEMO_IDS.dmrlPhungun)
    fireEvent.click(within(toolbar()).getByRole("button", { name: "SEND zurückziehen" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("SEND 00002-2026 zurückziehen?")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Zurückziehen" }))
    expect(await within(dialog).findByText("Bitte eine Begründung angeben.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("Begründung"), { target: { value: "Partner antwortet nicht" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Zurückziehen" }))
    await waitFor(() => expect(dmrlOf(DEMO_IDS.dmrlPhungun).status).toBe("in_bearbeitung"))
    expect(stored().archive.find((a) => a.versionIndex === "00002-2026" && a.direction === "send")?.withdrawn?.reason).toBe(
      "Partner antwortet nicht"
    )
  })
})
