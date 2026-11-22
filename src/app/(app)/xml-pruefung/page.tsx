import { XmlCheckTool } from "@/components/xml-check/xml-check-tool"

/** Seite „Werkzeug" mit der Funktion „XML prüfen" (PROJ-20, Benennung seit 2026-11-22) — für alle angemeldeten Benutzer, ohne DMRL-Berechtigung */
export default function XmlCheckPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">XML prüfen</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-darkest">Werkzeug.</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Eine beliebige DMRL-XML prüfen und als CSV im Check-out-Format herunterladen. Die CSV lässt sich in Excel bearbeiten und über den Check-in in
          eine DMRL übernehmen.
        </p>
      </div>
      <XmlCheckTool />
    </div>
  )
}
