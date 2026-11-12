"use client"

import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface DataErrorScreenProps {
  reason: string
  onReload: () => void
}

export function DataErrorScreen({ reason, onReload }: DataErrorScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Daten können nicht geladen werden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            <AlertTitle>Gespeicherte Daten unbrauchbar</AlertTitle>
            <AlertDescription>{reason}</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Sie können die Demo-Daten neu laden. Dabei werden die vorhandenen Daten in diesem Browser durch den
            Demo-Ausgangszustand ersetzt.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={onReload} className="w-full sm:w-auto">
            Demo-Daten neu laden
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
