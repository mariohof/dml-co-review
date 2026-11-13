import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminPageProps {
  title: string
  description: string
  /** Hauptaktion rechts oben (z. B. „Benutzer anlegen") */
  action?: React.ReactNode
  /** Filterzeile (z. B. Suchfeld) */
  toolbar?: React.ReactNode
  children: React.ReactNode
}

/** Seitenrahmen der Verwaltungsseiten (gemeinsames Verwaltungsmuster, PROJ-3 Tech Design E) */
export function AdminPage({ title, description, action, toolbar, children }: AdminPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Verwaltung</p>
        <h1 className="text-2xl font-semibold text-brand-darkest">{title}</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
        <CardContent className="space-y-4">
          {toolbar}
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
