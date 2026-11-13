import type { DmlCode, DmlHeader, DmlRef, EntryFields, S1000dIssue } from "./schema"

/**
 * DML-Schreiber je Issue (PROJ-12 Tech Design C) — Gegenstück zum DML-Leser (PROJ-8).
 * Feste Struktur nach docs/dmrl-mapping.md und den Schemas dml.xsd 2.3 / 4.2 / 5.0; keine XML-Bibliothek.
 * Genutzt von SEND (PROJ-12), Freigabestand (PROJ-14) und Export (PROJ-18).
 */

export interface DmlDocument {
  header: DmlHeader
  entries: EntryFields[]
}

export interface DmlWriteOptions {
  /** Antworten (answer/answer_comment) schreiben — nicht beim SEND (NSG) */
  answers: boolean
}

/** Standard-BREX je Issue (Model Ident Code S1000D) */
const BREX: Record<Exclude<S1000dIssue, "2.3">, string> = { "4.2": "F", "5.0": "G" }

const SCHEMA_LOCATION: Record<S1000dIssue, string> = {
  "2.3": "http://www.s1000d.org/S1000D_2-3/xml_schema_flat/dml.xsd",
  "4.2": "http://www.s1000d.org/S1000D_4-2/xml_schema_flat/dml.xsd",
  "5.0": "http://www.s1000d.org/S1000D_5-0/xml_schema_flat/dml.xsd",
}

/** Text und Attributwerte maskieren; Steuerzeichen, die XML 1.0 nicht erlaubt, entfernen */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

type Attrs = Record<string, string | undefined>

/** Kleiner Baustein für eingerückte Ausgabe */
class XmlOut {
  private lines: string[] = []
  private depth = 0

  private attrs(attrs: Attrs) {
    return Object.entries(attrs)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([name, value]) => ` ${name}="${escapeXml(value!)}"`)
      .join("")
  }

  private pad() {
    return "   ".repeat(this.depth)
  }

  empty(name: string, attrs: Attrs = {}) {
    this.lines.push(`${this.pad()}<${name}${this.attrs(attrs)}/>`)
  }

  text(name: string, value: string, attrs: Attrs = {}) {
    this.lines.push(`${this.pad()}<${name}${this.attrs(attrs)}>${escapeXml(value)}</${name}>`)
  }

  open(name: string, attrs: Attrs = {}) {
    this.lines.push(`${this.pad()}<${name}${this.attrs(attrs)}>`)
    this.depth++
  }

  close(name: string) {
    this.depth--
    this.lines.push(`${this.pad()}</${name}>`)
  }

  raw(line: string) {
    this.lines.push(line)
  }

  toString() {
    return `${this.lines.join("\n")}\n`
  }
}

const hasDate = (f: { day: string; month: string; year: string }) => !!(f.day && f.month && f.year)
const paras = (value: string) => value.split(/\r?\n/).filter((line) => line.trim() !== "")

// ---------------------------------------------------------------- Issue 2.3

function dmlc23(out: XmlOut, dmlc: DmlCode) {
  out.open("dmlc")
  out.text("modelic", dmlc.modelic)
  out.text("sendid", dmlc.sendid)
  out.empty("dmltype", { type: dmlc.dmltype })
  out.text("diyear", dmlc.diyear)
  out.text("seqnum", dmlc.seqnum)
  out.close("dmlc")
}

function dmlref23(out: XmlOut, ref: DmlRef) {
  out.open("dmlref")
  dmlc23(out, ref.dmlc)
  if (ref.issno) out.empty("issno", { issno: ref.issno.issno, inwork: ref.issno.inwork })
  out.close("dmlref")
}

function entry23(out: XmlOut, f: EntryFields, options: DmlWriteOptions) {
  out.open("dmentry", { type: f.dmentryType })
  out.open("addresdm")
  out.open("dmc")
  out.open("avee")
  for (const name of ["modelic", "sdc", "chapnum", "section", "subsect", "subject", "discode", "discodev", "incode", "incodev", "itemloc"] as const) {
    out.text(name, f[name])
  }
  out.close("avee")
  out.close("dmc")
  out.open("dmtitle")
  out.text("techname", f.techname)
  if (f.infoname) out.text("infoname", f.infoname)
  out.close("dmtitle")
  if (f.issno) out.empty("issno", { issno: f.issno, type: f.type })
  if (hasDate(f)) out.empty("issdate", { day: f.day, month: f.month, year: f.year })
  if (f.language) out.empty("language", { language: f.language, country: f.country })
  out.close("addresdm")
  if (f.security) out.empty("security", { class: f.security })
  out.text("rpc", f.rpc, { rpcname: f.rpcname })
  if (options.answers && f.answer) {
    if (f.answer_comment) {
      out.open("answer", { answer: f.answer })
      out.text("remarks", f.answer_comment)
      out.close("answer")
    } else {
      out.empty("answer", { answer: f.answer })
    }
  }
  if (f.remarks) out.text("remarks", f.remarks)
  out.close("dmentry")
}

function write23(doc: DmlDocument, options: DmlWriteOptions): string {
  const { header } = doc
  const out = new XmlOut()
  out.raw('<?xml version="1.0" encoding="UTF-8"?>')
  out.open("dml", {
    direction: header.direction,
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "xsi:noNamespaceSchemaLocation": SCHEMA_LOCATION["2.3"],
  })
  dmlc23(out, header.dmlc)
  out.empty("issno", { issno: header.issno.issno, inwork: header.issno.inwork, type: header.issno.type })
  out.empty("issdate", { day: header.issdate.day, month: header.issdate.month, year: header.issdate.year })
  out.empty("security", { class: header.security })
  if (header.dmlref) dmlref23(out, header.dmlref)
  for (const entry of doc.entries) entry23(out, entry, options)
  if (header.remarks) out.text("remarks", header.remarks)
  out.close("dml")
  return out.toString()
}

// ---------------------------------------------------------------- Issue 4.2 / 5.0

function dmlCode4x(out: XmlOut, dmlc: DmlCode) {
  out.empty("dmlCode", {
    modelIdentCode: dmlc.modelic,
    senderIdent: dmlc.sendid,
    dmlType: dmlc.dmltype,
    yearOfDataIssue: dmlc.diyear,
    seqNumber: dmlc.seqnum,
  })
}

function remarks4x(out: XmlOut, value: string) {
  const lines = paras(value)
  if (lines.length === 0) return
  out.open("remarks")
  for (const line of lines) out.text("simplePara", line)
  out.close("remarks")
}

function brex4x(out: XmlOut, issue: Exclude<S1000dIssue, "2.3">) {
  // S1000D-F-04-10-0301-00A-022A-D (4.2) bzw. S1000D-G-04-10-0301-00A-022A-D (5.0)
  out.open("brexDmRef")
  out.open("dmRef")
  out.open("dmRefIdent")
  out.empty("dmCode", {
    modelIdentCode: "S1000D",
    systemDiffCode: BREX[issue],
    systemCode: "04",
    subSystemCode: "1",
    subSubSystemCode: "0",
    assyCode: "0301",
    disassyCode: "00",
    disassyCodeVariant: "A",
    infoCode: "022",
    infoCodeVariant: "A",
    itemLocationCode: "D",
  })
  out.close("dmRefIdent")
  out.close("dmRef")
  out.close("brexDmRef")
}

function entry4x(out: XmlOut, f: EntryFields, options: DmlWriteOptions) {
  out.open("dmlEntry", { dmlEntryType: f.dmentryType, issueType: f.type })
  out.open("dmRef")
  out.open("dmRefIdent")
  out.empty("dmCode", {
    modelIdentCode: f.modelic,
    systemDiffCode: f.sdc,
    systemCode: f.chapnum,
    subSystemCode: f.section,
    subSubSystemCode: f.subsect,
    assyCode: f.subject,
    disassyCode: f.discode,
    disassyCodeVariant: f.discodev,
    infoCode: f.incode,
    infoCodeVariant: f.incodev,
    itemLocationCode: f.itemloc,
  })
  if (f.issno) out.empty("issueInfo", { issueNumber: f.issno, inWork: "00" })
  if (f.language) out.empty("language", { languageIsoCode: f.language, countryIsoCode: f.country })
  out.close("dmRefIdent")
  out.open("dmRefAddressItems")
  out.open("dmTitle")
  out.text("techName", f.techname)
  if (f.infoname) out.text("infoName", f.infoname)
  out.close("dmTitle")
  if (hasDate(f)) out.empty("issueDate", { year: f.year, month: f.month, day: f.day })
  out.close("dmRefAddressItems")
  out.close("dmRef")
  if (f.security) out.empty("security", { securityClassification: f.security })
  if (f.rpcname) {
    out.open("responsiblePartnerCompany", { enterpriseCode: f.rpc })
    out.text("enterpriseName", f.rpcname)
    out.close("responsiblePartnerCompany")
  } else {
    out.empty("responsiblePartnerCompany", { enterpriseCode: f.rpc })
  }
  if (options.answers && f.answer) {
    if (paras(f.answer_comment).length > 0) {
      out.open("answer", { answerToEntry: f.answer })
      remarks4x(out, f.answer_comment)
      out.close("answer")
    } else {
      out.empty("answer", { answerToEntry: f.answer })
    }
  }
  remarks4x(out, f.remarks)
  out.close("dmlEntry")
}

function write4x(doc: DmlDocument, issue: Exclude<S1000dIssue, "2.3">, options: DmlWriteOptions): string {
  const { header } = doc
  const out = new XmlOut()
  out.raw('<?xml version="1.0" encoding="UTF-8"?>')
  out.open("dml", {
    listDirection: header.direction,
    "xmlns:dc": "http://www.purl.org/dc/elements/1.1/",
    "xmlns:rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "xsi:noNamespaceSchemaLocation": SCHEMA_LOCATION[issue],
  })
  out.open("identAndStatusSection")
  out.open("dmlAddress")
  out.open("dmlIdent")
  dmlCode4x(out, header.dmlc)
  out.empty("issueInfo", { issueNumber: header.issno.issno, inWork: header.issno.inwork })
  out.close("dmlIdent")
  out.open("dmlAddressItems")
  out.empty("issueDate", { year: header.issdate.year, month: header.issdate.month, day: header.issdate.day })
  out.close("dmlAddressItems")
  out.close("dmlAddress")
  out.open("dmlStatus", { issueType: header.issno.type })
  out.empty("security", { securityClassification: header.security })
  if (header.dmlref) {
    out.open("dmlRef")
    out.open("dmlRefIdent")
    dmlCode4x(out, header.dmlref.dmlc)
    if (header.dmlref.issno) out.empty("issueInfo", { issueNumber: header.dmlref.issno.issno, inWork: header.dmlref.issno.inwork })
    out.close("dmlRefIdent")
    out.close("dmlRef")
  }
  brex4x(out, issue)
  remarks4x(out, header.remarks)
  out.close("dmlStatus")
  out.close("identAndStatusSection")
  out.open("dmlContent")
  for (const entry of doc.entries) entry4x(out, entry, options)
  out.close("dmlContent")
  out.close("dml")
  return out.toString()
}

/** DML-XML je Issue erzeugen (UTF-8, mit XML-Deklaration); Einträge in der übergebenen Reihenfolge */
export function writeDml(doc: DmlDocument, issue: S1000dIssue, options: DmlWriteOptions): string {
  return issue === "2.3" ? write23(doc, options) : write4x(doc, issue, options)
}
