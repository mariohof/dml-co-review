import { DmlParseError, type ParsedDml } from "./dml-parser-2-3"
import { emptyEntryFields, type DmlCode, type DmlHeader, type DmlRef, type EntryFields } from "./schema"

/**
 * Liest eine S1000D-DML der Issues 4.2 und 5.0 (für unsere Felder identisch) mit dem Browser-DOMParser.
 * Mapping laut docs/dmrl-mapping.md, Abschnitt „Mapping Issue 4.2 / 5.0".
 */

function child(parent: Element | null | undefined, name: string): Element | null {
  if (!parent) return null
  for (const el of Array.from(parent.children)) if (el.tagName === name) return el
  return null
}

function path(parent: Element | null | undefined, ...names: string[]): Element | null {
  let current: Element | null | undefined = parent
  for (const name of names) {
    current = child(current, name)
    if (!current) return null
  }
  return current ?? null
}

const attr = (el: Element | null, name: string) => el?.getAttribute(name) ?? ""

/** Text aller simplePara-Elemente einer remarks-Struktur, durch Zeilenumbruch getrennt */
function remarksText(remarks: Element | null): string {
  if (!remarks) return ""
  const paras = Array.from(remarks.children).filter((el) => el.tagName === "simplePara")
  if (paras.length === 0) return (remarks.textContent ?? "").trim()
  return paras.map((p) => (p.textContent ?? "").trim()).join("\n")
}

function readDmlCode(el: Element | null): DmlCode {
  return {
    modelic: attr(el, "modelIdentCode"),
    sendid: attr(el, "senderIdent"),
    dmltype: attr(el, "dmlType"),
    diyear: attr(el, "yearOfDataIssue"),
    seqnum: attr(el, "seqNumber"),
  }
}

function readDmlRef(dmlStatus: Element | null): DmlRef | null {
  const dmlRef = child(dmlStatus, "dmlRef")
  if (!dmlRef) return null
  const ident = child(dmlRef, "dmlRefIdent")
  const issueInfo = child(ident, "issueInfo")
  return {
    dmlc: readDmlCode(child(ident, "dmlCode")),
    issno: issueInfo ? { issno: attr(issueInfo, "issueNumber"), inwork: attr(issueInfo, "inWork"), type: "" } : null,
  }
}

function readEntry(dmlEntry: Element): EntryFields {
  const dmRef = child(dmlEntry, "dmRef")
  const ident = child(dmRef, "dmRefIdent")
  const dmCode = child(ident, "dmCode")
  const issueInfo = child(ident, "issueInfo")
  const language = child(ident, "language")
  const items = child(dmRef, "dmRefAddressItems")
  const dmTitle = child(items, "dmTitle")
  const issueDate = child(items, "issueDate")
  const rpc = child(dmlEntry, "responsiblePartnerCompany")
  const answer = child(dmlEntry, "answer")

  const fields = emptyEntryFields()
  fields.dmentryType = attr(dmlEntry, "dmlEntryType")
  fields.modelic = attr(dmCode, "modelIdentCode")
  fields.sdc = attr(dmCode, "systemDiffCode")
  fields.chapnum = attr(dmCode, "systemCode")
  fields.section = attr(dmCode, "subSystemCode")
  fields.subsect = attr(dmCode, "subSubSystemCode")
  fields.subject = attr(dmCode, "assyCode")
  fields.discode = attr(dmCode, "disassyCode")
  fields.discodev = attr(dmCode, "disassyCodeVariant")
  fields.incode = attr(dmCode, "infoCode")
  fields.incodev = attr(dmCode, "infoCodeVariant")
  fields.itemloc = attr(dmCode, "itemLocationCode")
  fields.techname = (child(dmTitle, "techName")?.textContent ?? "").trim()
  fields.infoname = (child(dmTitle, "infoName")?.textContent ?? "").trim()
  fields.language = attr(language, "languageIsoCode")
  fields.country = attr(language, "countryIsoCode")
  fields.security = attr(child(dmlEntry, "security"), "securityClassification")
  fields.rpc = attr(rpc, "enterpriseCode")
  fields.rpcname = (child(rpc, "enterpriseName")?.textContent ?? "").trim()
  fields.issno = attr(issueInfo, "issueNumber")
  // DM-Ausgabetyp steht in 4.2/5.0 direkt am Eintrag (dmlEntry/@issueType); nur übernehmen, wenn eine Ausgabe angegeben ist
  fields.type = attr(dmlEntry, "issueType")
  fields.day = attr(issueDate, "day")
  fields.month = attr(issueDate, "month")
  fields.year = attr(issueDate, "year")
  fields.answer = attr(answer, "answerToEntry")
  fields.answer_comment = remarksText(child(answer, "remarks"))
  fields.remarks = remarksText(child(dmlEntry, "remarks"))
  return fields
}

export function parseDml4x(xml: string): ParsedDml {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.getElementsByTagName("parsererror").length > 0) throw new DmlParseError("XML ist nicht wohlgeformt")
  const root = doc.documentElement
  if (root.tagName !== "dml") throw new DmlParseError(`Wurzelelement <dml> erwartet, gefunden <${root.tagName}>`)
  const direction = root.getAttribute("listDirection") || "send"
  if (direction !== "send" && direction !== "reply") {
    throw new DmlParseError(`Ungültiges Attribut dml/@listDirection: "${direction}"`)
  }
  const section = child(root, "identAndStatusSection")
  if (!section) throw new DmlParseError("Element identAndStatusSection fehlt")
  const ident = path(section, "dmlAddress", "dmlIdent")
  const issueInfo = child(ident, "issueInfo")
  const issueDate = path(section, "dmlAddress", "dmlAddressItems", "issueDate")
  const dmlStatus = child(section, "dmlStatus")

  const header: DmlHeader = {
    direction,
    dmlc: readDmlCode(child(ident, "dmlCode")),
    issno: { issno: attr(issueInfo, "issueNumber"), inwork: attr(issueInfo, "inWork"), type: attr(dmlStatus, "issueType") },
    issdate: { day: attr(issueDate, "day"), month: attr(issueDate, "month"), year: attr(issueDate, "year") },
    security: attr(child(dmlStatus, "security"), "securityClassification"),
    dmlref: readDmlRef(dmlStatus),
    remarks: remarksText(child(dmlStatus, "remarks")),
  }

  const entries = Array.from(child(root, "dmlContent")?.children ?? [])
    .filter((el) => el.tagName === "dmlEntry")
    .map(readEntry)
  return { header, entries }
}
