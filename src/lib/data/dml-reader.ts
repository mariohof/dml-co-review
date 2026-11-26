import { parseDml23, type ParsedDml } from "./dml-parser-2-3"
import { parseDml4x } from "./dml-parser-4x"
import type { S1000dIssue } from "./schema"

export { DmlParseError, type ParsedDml } from "./dml-parser-2-3"

/** DML-Leser je Issue (PROJ-8 Tech Design B): 2.3 eigene Struktur, 4.2/5.0/6.0 gemeinsame Struktur */
export function readDml(xml: string, issue: S1000dIssue): ParsedDml {
  return issue === "2.3" ? parseDml23(xml) : parseDml4x(xml)
}
