import { XmlCheckTool } from "@/components/xml-check/xml-check-tool"

/** Werkzeug „XML prüfen" (PROJ-20) — für alle angemeldeten Benutzer, ohne DMRL-Berechtigung */
export default function XmlCheckPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Werkzeug</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-darkest">XML prüfen.</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Eine beliebige DMRL-XML prüfen und als CSV im Check-out-Format herunterladen. Die CSV lässt sich in Excel bearbeiten und über den Check-in in
          eine DMRL übernehmen.
        </p>
      </div>
      <XmlCheckTool />
    </div>
  )
}
