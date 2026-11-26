import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { S1000D_ISSUES } from "@/lib/data/schema"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { MAX_XML_BYTES, type XsdResult } from "@/lib/xsd/types"

/**
 * Serverfunktion „XSD-Prüfung" (PROJ-11).
 * POST /api/xsd-pruefung?issue=2.3|4.2|5.0|6.0 — Body: XML-Datei roh (höchstens 5 MB).
 * Antwort: XsdResult (src/lib/xsd/types.ts). Nichts wird gespeichert oder protokolliert.
 * Kein Zugriffsschutz: Die App läuft nur lokal (localhost); Anfragen von fremden Webseiten werden abgewiesen —
 * sowohl über den Origin-Kopf als auch über den Host-Kopf (Schutz vor DNS-Rebinding, BUG-QA2-3).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const querySchema = z.object({ issue: z.enum(S1000D_ISSUES) })

const error = (status: number, message: string) => NextResponse.json({ error: message }, { status })

/** Zulässige Hostnamen: die App läuft nur lokal (Startskript bindet an 127.0.0.1) */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"])

/** Host-Kopf muss auf den eigenen Rechner zeigen — eine fremde Domain, die auf 127.0.0.1 auflöst, wird abgewiesen */
function foreignHost(request: NextRequest): boolean {
  const host = request.headers.get("host")
  if (!host) return true
  try {
    return !LOCAL_HOSTNAMES.has(new URL(`http://${host}`).hostname)
  } catch {
    return true
  }
}

/** Browser-Anfragen fremder Webseiten (Origin ≠ eigener Host) abweisen */
function foreignOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).host !== request.headers.get("host")
  } catch {
    return true
  }
}

export async function POST(request: NextRequest) {
  if (foreignHost(request) || foreignOrigin(request)) return error(403, "Anfrage nicht erlaubt.")

  const query = querySchema.safeParse({ issue: request.nextUrl.searchParams.get("issue") })
  if (!query.success) return error(400, "Unbekanntes S1000D-Issue (erlaubt: 2.3, 4.2, 5.0, 6.0).")
  const { issue } = query.data

  const declared = Number(request.headers.get("content-length") ?? "0")
  if (declared > MAX_XML_BYTES) return error(413, "Datei zu groß (höchstens 5 MB).")

  const body = new Uint8Array(await request.arrayBuffer())
  if (body.byteLength > MAX_XML_BYTES) return error(413, "Datei zu groß (höchstens 5 MB).")
  if (body.byteLength === 0) return error(400, "Die Datei ist leer.")

  const result: XsdResult = await validateWithXmllint(body, issue)
  return NextResponse.json(result, { status: result.state === "nicht_verfuegbar" ? 503 : 200 })
}
