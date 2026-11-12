import type { DmlCode, DmlHeader, DmlRef, EntryFields } from "./schema"
import { emptyEntryFields } from "./schema"

/**
 * Liest eine S1000D-Issue-2.3-DML (dml.xsd) mit dem im Browser eingebauten DOMParser.
 * Mapping laut docs/dmrl-mapping.md.
 */

export class DmlParseError extends Error {}

/** Direktes Kind-Element mit dem angegebenen Namen */
function child(parent: Element | null | undefined, name: string): Element | null {
  if (!parent) return null
  for (const el of Array.from(parent.children)) {
    if (el.tagName === name) return el
  }
  return null
}

/** Folgt einem Pfad direkter Kind-Elemente */
function path(parent: Element | null | undefined, ...names: string[]): Element | null {
  let current: Element | null | undefined = parent
  for (const name of names) {
    current = child(current, name)
    if (!current) return null
  }
  return current ?? null
}

const text = (el: Element | null) => el?.textContent ?? ""
const attr = (el: Element | null, name: string) => el?.getAttribute(name) ?? ""

function readDmlCode(dmlc: Element | null): DmlCode {
  return {
    modelic: text(child(dmlc, "modelic")),
    sendid: text(child(dmlc, "sendid")),
    dmltype: attr(child(dmlc, "dmltype"), "type"),
    diyear: text(child(dmlc, "diyear")),
    seqnum: text(child(dmlc, "seqnum")),
  }
}

function readIssno(el: Element | null) {
  return { issno: attr(el, "issno"), inwork: attr(el, "inwork"), type: attr(el, "type") }
}

function readDmlRef(dmlref: Element | null): DmlRef | null {
  if (!dmlref) return null
  const issno = child(dmlref, "issno")
  return { dmlc: readDmlCode(child(dmlref, "dmlc")), issno: issno ? readIssno(issno) : null }
}

function readEntry(dmentry: Element): EntryFields {
  const avee = path(dmentry, "addresdm", "dmc", "avee")
  const dmtitle = path(dmentry, "addresdm", "dmtitle")
  const language = path(dmentry, "addresdm", "language")
  const issno = path(dmentry, "addresdm", "issno")
  const issdate = path(dmentry, "addresdm", "issdate")
  const rpc = child(dmentry, "rpc")
  const answer = child(dmentry, "answer")

  const fields = emptyEntryFields()
  fields.dmentryType = attr(dmentry, "type")
  for (const name of [
    "modelic",
    "sdc",
    "chapnum",
    "section",
    "subsect",
    "subject",
    "discode",
    "discodev",
    "incode",
    "incodev",
    "itemloc",
  ] as const) {
    fields[name] = text(child(avee, name))
  }
  fields.techname = text(child(dmtitle, "techname"))
  fields.infoname = text(child(dmtitle, "infoname"))
  fields.language = attr(language, "language")
  fields.country = attr(language, "country")
  fields.security = attr(child(dmentry, "security"), "class")
  fields.rpc = text(rpc).trim()
  fields.rpcname = attr(rpc, "rpcname")
  fields.issno = attr(issno, "issno")
  fields.type = attr(issno, "type")
  fields.day = attr(issdate, "day")
  fields.month = attr(issdate, "month")
  fields.year = attr(issdate, "year")
  fields.answer = attr(answer, "answer")
  fields.answer_comment = text(child(answer, "remarks"))
  fields.remarks = text(child(dmentry, "remarks"))
  return fields
}

export interface ParsedDml {
  header: DmlHeader
  entries: EntryFields[]
}

export function parseDml23(xml: string): ParsedDml {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new DmlParseError("XML ist nicht wohlgeformt")
  }
  const root = doc.documentElement
  if (root.tagName !== "dml") {
    throw new DmlParseError(`Wurzelelement <dml> erwartet, gefunden <${root.tagName}>`)
  }
  const direction = root.getAttribute("direction")
  if (direction !== "send" && direction !== "reply") {
    throw new DmlParseError(`Ungültiges Attribut dml/@direction: "${direction ?? ""}"`)
  }

  const issdate = child(root, "issdate")
  const header: DmlHeader = {
    direction,
    dmlc: readDmlCode(child(root, "dmlc")),
    issno: readIssno(child(root, "issno")),
    issdate: { day: attr(issdate, "day"), month: attr(issdate, "month"), year: attr(issdate, "year") },
    security: attr(child(root, "security"), "class"),
    dmlref: readDmlRef(child(root, "dmlref")),
    remarks: text(child(root, "remarks")),
  }

  const entries = Array.from(root.children)
    .filter((el) => el.tagName === "dmentry")
    .map(readEntry)

  return { header, entries }
}
