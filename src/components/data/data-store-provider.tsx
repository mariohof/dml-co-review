"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { buildDemoDataset } from "@/lib/data/demo-data"
import { datasetSchema, type Dataset } from "@/lib/data/schema"
import { loadDataset, saveDataset } from "@/lib/data/storage"
import { DataErrorScreen } from "./data-error-screen"
import { DataLoadingScreen } from "./data-loading-screen"

type StoreState =
  | { status: "loading" }
  | { status: "ready"; data: Dataset }
  | { status: "invalid"; reason: string }

interface DataStoreContextValue {
  data: Dataset
  /** Wendet eine Änderung an und speichert das komplette Paket. Gibt false zurück, wenn nicht gespeichert wurde. */
  update: (change: (current: Dataset) => Dataset) => boolean
  /** Stellt den Demo-Ausgangszustand wieder her. */
  resetToDemo: () => boolean
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null)

/** Erzeugt den Demo-Bestand und speichert ihn. */
function createAndSaveDemo(): StoreState {
  let demo: Dataset
  try {
    demo = buildDemoDataset()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: "invalid", reason: `Die Demo-Daten konnten nicht erzeugt werden: ${message}` }
  }
  const saved = saveDataset(demo)
  if (!saved.ok) {
    toast.error(saved.message)
  }
  // Auch wenn das Speichern scheitert, kann mit den Demo-Daten im Speicher gearbeitet werden.
  return { status: "ready", data: demo }
}

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({ status: "loading" })

  // localStorage existiert nur im Browser → Laden nach dem ersten Rendern.
  useEffect(() => {
    const result = loadDataset()
    // Externes System (localStorage) erst nach dem Mounten lesbar; einmaliges Setzen ist beabsichtigt.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (result.kind === "ok") setState({ status: "ready", data: result.data })
    else if (result.kind === "empty") setState(createAndSaveDemo())
    else setState({ status: "invalid", reason: result.reason })
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const update = useCallback(
    (change: (current: Dataset) => Dataset): boolean => {
      if (state.status !== "ready") return false
      const next = change(state.data)
      const check = datasetSchema.safeParse(next)
      if (!check.success) {
        toast.error("Die Änderung ist ungültig und wurde nicht gespeichert.")
        return false
      }
      const saved = saveDataset(check.data)
      if (!saved.ok) {
        toast.error(saved.message)
        return false
      }
      setState({ status: "ready", data: check.data })
      return true
    },
    [state]
  )

  const resetToDemo = useCallback((): boolean => {
    let demo: Dataset
    try {
      demo = buildDemoDataset()
    } catch {
      toast.error("Die Demo-Daten konnten nicht erzeugt werden.")
      return false
    }
    const saved = saveDataset(demo)
    if (!saved.ok) {
      toast.error(saved.message)
      return false
    }
    setState({ status: "ready", data: demo })
    return true
  }, [])

  const value = useMemo<DataStoreContextValue | null>(
    () => (state.status === "ready" ? { data: state.data, update, resetToDemo } : null),
    [state, update, resetToDemo]
  )

  if (state.status === "loading") return <DataLoadingScreen />
  if (state.status === "invalid") {
    return (
      <DataErrorScreen
        reason={state.reason}
        onReload={() => {
          resetToDemo()
        }}
      />
    )
  }

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>
}

/** Zugriff auf den zentralen Datenspeicher. Nur innerhalb von DataStoreProvider verwendbar. */
export function useDataStore(): DataStoreContextValue {
  const ctx = useContext(DataStoreContext)
  if (!ctx) throw new Error("useDataStore muss innerhalb von DataStoreProvider verwendet werden")
  return ctx
}
