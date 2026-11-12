import { Construction } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PagePlaceholderProps {
  title: string
  feature: string
}

/** Vorläufige Seite für Bereiche, deren Feature noch nicht umgesetzt ist */
export function PagePlaceholder({ title, feature }: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-darkest">{title}</h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Construction className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle className="text-base">Noch nicht verfügbar</CardTitle>
            <CardDescription>Dieser Bereich wird mit {feature} umgesetzt.</CardDescription>
          </div>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
