import { Lock } from "lucide-react"

import { FormDescription } from "@/components/ui/form"

/** Hinweis unter einem gesperrten Formularfeld (gemeinsames Verwaltungsmuster) */
export function FieldLockHint({ reason }: { reason: string }) {
  return (
    <FormDescription className="flex items-center gap-1">
      <Lock className="h-3 w-3 shrink-0" aria-hidden />
      {reason}
    </FormDescription>
  )
}
