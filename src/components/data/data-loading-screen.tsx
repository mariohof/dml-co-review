import { Skeleton } from "@/components/ui/skeleton"

export function DataLoadingScreen() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 sm:p-8" role="status" aria-live="polite">
      <span className="sr-only">Daten werden geladen…</span>
      <Skeleton className="h-10 w-2/3 sm:w-1/3" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
