import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface NoPermissionProps {
  title?: string
  description?: string
}

/** Anzeige „Keine Berechtigung" bzw. „nicht gefunden" mit Link zum Dashboard (PROJ-2) */
export function NoPermission({
  title = "Keine Berechtigung",
  description = "Sie haben keine Berechtigung für diese Seite.",
}: NoPermissionProps) {
  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <ShieldAlert className="mb-2 h-10 w-10 text-muted-foreground" aria-hidden />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/">Zum Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
