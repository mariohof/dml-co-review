import { act, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { beforeEach, describe, expect, it } from "vitest"

import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadSessionUserId, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { SessionProvider, useSession } from "./session-provider"

type Api = { session: ReturnType<typeof useSession>; store: ReturnType<typeof useDataStore> }
const probe: { api: Api | null } = { api: null }
const api = new Proxy({} as Api, { get: (_target, key: keyof Api) => probe.api?.[key] })

function Probe() {
  const session = useSession()
  const store = useDataStore()
  useEffect(() => {
    probe.api = { session, store }
  })
  return (
    <div>
      <span data-testid="user">{session.currentUser?.name ?? "—"}</span>
      <span data-testid="role">{session.currentUser?.role ?? "—"}</span>
      <span data-testid="notice">{session.loginNotice ?? ""}</span>
    </div>
  )
}

function renderApp() {
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </DataStoreProvider>
  )
}

describe("Anmelde-Bereitsteller", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
  })

  it("startet ohne Anmeldung", async () => {
    renderApp()
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("—"))
  })

  it("meldet per Klick ohne Passwort an und merkt sich die Anmeldung", async () => {
    renderApp()
    await screen.findByTestId("user")
    act(() => {
      api.session.login(DEMO_IDS.editorAnna)
    })
    expect(screen.getByTestId("user")).toHaveTextContent("Anna Bearbeitung")
    expect(loadSessionUserId()).toBe(DEMO_IDS.editorAnna)
  })

  it("stellt eine gespeicherte Anmeldung nach dem Neuladen wieder her", async () => {
    saveSessionUserId(DEMO_IDS.admin)
    renderApp()
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Administrator"))
  })

  it("wendet eine Rollenänderung sofort an", async () => {
    saveSessionUserId(DEMO_IDS.editorAnna)
    renderApp()
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("bearbeiter"))
    act(() => {
      api.store.update((data) => ({
        ...data,
        users: data.users.map((u) => (u.id === DEMO_IDS.editorAnna ? { ...u, role: "administrator" as const } : u)),
      }))
    })
    expect(screen.getByTestId("role")).toHaveTextContent("administrator")
  })

  it("meldet einen deaktivierten Benutzer ab und zeigt einen Hinweis", async () => {
    saveSessionUserId(DEMO_IDS.editorBen)
    renderApp()
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Ben Bearbeiter"))
    act(() => {
      api.store.update((data) => ({
        ...data,
        users: data.users.map((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u)),
      }))
    })
    expect(screen.getByTestId("user")).toHaveTextContent("—")
    expect(screen.getByTestId("notice")).toHaveTextContent("Ihr Benutzer ist nicht mehr aktiv.")
    await waitFor(() => expect(loadSessionUserId()).toBeNull())
  })

  it("lehnt die Anmeldung eines inaktiven Benutzers ab", async () => {
    const demo = buildDemoDataset()
    demo.users = demo.users.map((u) => (u.id === DEMO_IDS.editorBen ? { ...u, active: false } : u))
    saveDataset(demo)
    renderApp()
    await screen.findByTestId("user")
    act(() => {
      expect(api.session.login(DEMO_IDS.editorBen)).toBe(false)
    })
    expect(screen.getByTestId("user")).toHaveTextContent("—")
  })

  it("behält die Anmeldung beim Zurücksetzen der Demo-Daten", async () => {
    saveSessionUserId(DEMO_IDS.editorAnna)
    renderApp()
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Anna Bearbeitung"))
    act(() => {
      api.store.resetToDemo()
    })
    expect(screen.getByTestId("user")).toHaveTextContent("Anna Bearbeitung")
    expect(loadSessionUserId()).toBe(DEMO_IDS.editorAnna)
  })
})
