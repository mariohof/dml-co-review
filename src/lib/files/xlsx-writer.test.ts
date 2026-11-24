import { strFromU8, unzipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { cleanCellText, columnLetter, columnWidth, MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, writeXlsx } from "./xlsx-writer"

const unpack = (bytes: Uint8Array) => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, data]) => [name, strFromU8(data)]))

/** Zelltexte eines Blatts in Zeilenreihenfolge (Inline-Strings; leere Zellen als "") */
function readCells(sheet: string): string[][] {
  return [...sheet.matchAll(/<row r="\d+">(.*?)<\/row>/g)].map(([, row]) =>
    [...row.matchAll(/<c r="[A-Z]+\d+" s="\d"(?:\/>| t="inlineStr"><is><t xml:space="preserve">(.*?)<\/t><\/is><\/c>)/g)].map(([, text]) =>
      (text ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    )
  )
}

const sample = () =>
  writeXlsx({
    sheetName: "Einträge",
    header: ["dmc", "techname", "remarks"],
    rows: [
      ["00A", "Fähigkeitsträger <Übersicht>", "=SUMME(1;2)"],
      ["2026-11-24", "", "+49 & @mention"],
    ],
  })

describe("Excel-Schreiber", () => {
  it("erzeugt ein gültiges Paket mit genau einem Blatt", () => {
    const files = unpack(sample())
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ])
    expect(files["xl/workbook.xml"].match(/<sheet /g)).toHaveLength(1)
    expect(files["xl/workbook.xml"]).toContain('<sheet name="Einträge" sheetId="1" r:id="rId1"/>')
  })

  it("schreibt alle Werte als Text — führende Nullen, Datumsähnliches und Umlaute unverändert", () => {
    const sheet = unpack(sample())["xl/worksheets/sheet1.xml"]
    expect(readCells(sheet)).toEqual([
      ["dmc", "techname", "remarks"],
      ["00A", "Fähigkeitsträger <Übersicht>", "=SUMME(1;2)"],
      ["2026-11-24", "", "+49 & @mention"],
    ])
    // keine Zahlen- oder Formelzellen, nur Textformat (numFmtId 49)
    expect(sheet).not.toMatch(/<v>|<f>|t="n"|t="str"/)
    const styles = unpack(sample())["xl/styles.xml"]
    expect(styles.match(/numFmtId="49"/g)).toHaveLength(2)
  })

  it("Formelzeichen = + - @ bleiben Text ohne Apostroph (keine Formel)", () => {
    const sheet = unpack(writeXlsx({ sheetName: "T", header: ["a"], rows: [["=1+1"], ["+1"], ["-1"], ["@A1"]] }))["xl/worksheets/sheet1.xml"]
    expect(readCells(sheet).slice(1)).toEqual([["=1+1"], ["+1"], ["-1"], ["@A1"]])
    expect(sheet).not.toContain("<f>")
    expect(sheet).not.toContain("'=")
  })

  it("fixiert die Kopfzeile, Kopfzeile fett, Autofilter über alle Spalten und Zeilen", () => {
    const files = unpack(sample())
    const sheet = files["xl/worksheets/sheet1.xml"]
    expect(sheet).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>')
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>')
    expect(sheet).toMatch(/<row r="1"><c r="A1" s="2" /)
    expect(sheet).toMatch(/<row r="2"><c r="A2" s="1" /)
    expect(files["xl/workbook.xml"]).toContain(`<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Einträge'!$A$1:$C$3</definedName>`)
  })

  it("nur Kopfzeile bei leerer Tabelle", () => {
    const sheet = unpack(writeXlsx({ sheetName: "Einträge", header: ["a", "b"], rows: [] }))["xl/worksheets/sheet1.xml"]
    expect(readCells(sheet)).toEqual([["a", "b"]])
    expect(sheet).toContain('<autoFilter ref="A1:B1"/>')
  })

  it("Spaltenbreiten aus dem längsten Inhalt, begrenzt", () => {
    expect(columnWidth(["ab"])).toBe(MIN_COLUMN_WIDTH)
    expect(columnWidth(["x".repeat(20)])).toBe(22)
    expect(columnWidth(["x".repeat(500)])).toBe(MAX_COLUMN_WIDTH)
    expect(columnWidth(["kurz\n" + "x".repeat(15)])).toBe(17)
    const sheet = unpack(writeXlsx({ sheetName: "T", header: ["a", "b"], rows: [["x".repeat(20), "y".repeat(500)]] }))["xl/worksheets/sheet1.xml"]
    expect(sheet).toContain('<col min="1" max="1" width="22" style="1" customWidth="1"/>')
    expect(sheet).toContain(`<col min="2" max="2" width="${MAX_COLUMN_WIDTH}" style="1" customWidth="1"/>`)
    // voller Inhalt bleibt in der Zelle
    expect(readCells(sheet)[1][1]).toBe("y".repeat(500))
  })

  it("entfernt in XML unzulässige Steuerzeichen, behält Tab und Zeilenumbruch", () => {
    expect(cleanCellText("a\u0000b\u0007c\u001Fd\te\nf￿")).toBe("abcd\te\nf")
    expect(cleanCellText("ok 😀")).toBe("ok 😀") // gültiges Surrogatpaar bleibt
    expect(cleanCellText("x\uD83Dy")).toBe("xy") // einzelnes Surrogat entfällt
    const sheet = unpack(writeXlsx({ sheetName: "T", header: ["a"], rows: [["a\u0001b"]] }))["xl/worksheets/sheet1.xml"]
    expect(readCells(sheet)[1]).toEqual(["ab"])
  })

  it("maskiert Excel-Zeichencodes _xHHHH_ im Text", () => {
    const sheet = unpack(writeXlsx({ sheetName: "T", header: ["a"], rows: [["A_x000D_B"]] }))["xl/worksheets/sheet1.xml"]
    expect(sheet).toContain("A_x005F_x000D_B")
  })

  it("ergänzt fehlende Zellen einer Zeile als leere Textzellen", () => {
    const sheet = unpack(writeXlsx({ sheetName: "T", header: ["a", "b", "c"], rows: [["1"]] }))["xl/worksheets/sheet1.xml"]
    expect(sheet).toContain('<row r="2"><c r="A2" s="1" t="inlineStr"><is><t xml:space="preserve">1</t></is></c><c r="B2" s="1"/><c r="C2" s="1"/></row>')
  })

  it("Spaltenbuchstaben über Z hinaus", () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual(["A", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"])
  })

  it("lehnt ungültige Blattnamen und leere Kopfzeile ab", () => {
    expect(() => writeXlsx({ sheetName: "a/b", header: ["a"], rows: [] })).toThrow("Ungültiger Blattname")
    expect(() => writeXlsx({ sheetName: "x".repeat(32), header: ["a"], rows: [] })).toThrow("Ungültiger Blattname")
    expect(() => writeXlsx({ sheetName: "T", header: [], rows: [] })).toThrow()
  })
})
