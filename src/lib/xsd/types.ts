import { z } from "zod"

import { S1000D_ISSUES } from "@/lib/data/schema"

/**
 * Vertrag der XSD-Prüfung (PROJ-11 Tech Design C/D) zwischen Browser und Serverfunktion.
 * Anfrage: POST {XSD_ENDPOINT}?issue=2.3 | 4.2 | 5.0, Body = XML-Datei (roh, höchstens 5 MB).
 * Antwort: JSON gemäß `xsdResultSchema`.
 */

export const XSD_ENDPOINT = "/api/xsd-pruefung"
export const MAX_XML_BYTES = 5 * 1024 * 1024
/** Zeitlimit im Browser (Server bricht xmllint nach 20 s ab) */
export const XSD_CLIENT_TIMEOUT_MS = 30_000

export const xsdFindingSchema = z.object({
  /** Zeile laut xmllint */
  line: z.number().int().positive().optional(),
  /** Originalmeldung von xmllint (unübersetzt) */
  message: z.string(),
})

export const XSD_UNAVAILABLE_REASONS = ["programm_fehlt", "schema_fehlt", "zeitlimit", "unerwartet", "nicht_erreichbar", "zugriff_abgelehnt"] as const

export const xsdResultSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("gueltig"), issue: z.enum(S1000D_ISSUES) }),
  z.object({ state: z.literal("schemafehler"), issue: z.enum(S1000D_ISSUES), findings: z.array(xsdFindingSchema).min(1) }),
  z.object({ state: z.literal("nicht_wohlgeformt"), issue: z.enum(S1000D_ISSUES), findings: z.array(xsdFindingSchema).min(1) }),
  z.object({ state: z.literal("nicht_verfuegbar"), reason: z.enum(XSD_UNAVAILABLE_REASONS) }),
])

export type XsdFinding = z.infer<typeof xsdFindingSchema>
export type XsdResult = z.infer<typeof xsdResultSchema>
export type XsdUnavailableReason = (typeof XSD_UNAVAILABLE_REASONS)[number]
