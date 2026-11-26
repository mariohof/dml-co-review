import { describe, expect, it } from "vitest"

import { DEMO_FILES } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { checkSchemaLocation, issueFromSchemaLocation, readSchemaLocation } from "./schema-location"

const root = (attrs: string) => `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Kommentar -->\n<dml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ${attrs}>\n<dmlContent/></dml>`

describe("Schema-Angabe lesen (PROJ-22 E)", () => {
  it("liest noNamespaceSchemaLocation mit beliebigem Präfix und einfachen oder doppelten Anführungszeichen", () => {
    expect(readSchemaLocation(root('xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd"'))).toBe(
      "http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd"
    )
    expect(readSchemaLocation(root("x:noNamespaceSchemaLocation='a/S1000D_5-0/dml.xsd'"))).toBe("a/S1000D_5-0/dml.xsd")
  })

  it("nimmt bei schemaLocation die letzte URL; ohne Angabe oder leer → null", () => {
    expect(readSchemaLocation(root('xsi:schemaLocation="urn:x http://h/S1000D_4-2/dml.xsd"'))).toBe("http://h/S1000D_4-2/dml.xsd")
    expect(readSchemaLocation(root(""))).toBeNull()
    expect(readSchemaLocation(root('xsi:noNamespaceSchemaLocation=""'))).toBeNull()
    expect(readSchemaLocation("kein xml")).toBeNull()
  })

  it("ignoriert Angaben außerhalb des Wurzelelements", () => {
    expect(readSchemaLocation('<dml><x xsi:noNamespaceSchemaLocation="S1000D_5-0/dml.xsd"/></dml>')).toBeNull()
  })
})

describe("Issue aus der Schema-Angabe", () => {
  it.each([
    ["http://www.s1000d.org/S1000D_2-3/xml_schema_flat/dml.xsd", "2.3"],
    ["http://als.etd.ietd.svc/xsd/NSG/003.00/S1000D2.3/dml.xsd", "2.3"],
    ["http://www.s1000d.org/S1000D_4-2/xml_schema_flat/dml.xsd", "4.2"],
    ["https://www.s1000d.org/S1000D_5-0/xml_schema_flat/dml.xsd", "5.0"],
    ["http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd", "6.0"],
    ["http://www.s1000d.org/S1000D_6-0/xml_schema_flat/dml.xsd", "6.0"],
    ["C:\\schemas\\s1000d_6-0\\dml.xsd", "6.0"],
  ])("%s → %s", (location, issue) => {
    expect(issueFromSchemaLocation(location)).toBe(issue)
  })

  it.each(["dml.xsd", "http://www.s1000d.org/S1000D_4-1/xml_schema_flat/dml.xsd", "http://www.s1000d.org/S1000D_7/dml.xsd"])(
    "%s → nicht zuordenbar",
    (location) => {
      expect(issueFromSchemaLocation(location)).toBeNull()
    }
  )
})

describe("checkSchemaLocation", () => {
  const as = (issue: string) => root(`xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_${issue}/xml_schema_flat/dml.xsd"`)

  it("passende Angabe, fehlende oder unbekannte Angabe → kein Hinweis", () => {
    expect(checkSchemaLocation(as("6"), "6.0", "system")).toEqual([])
    expect(checkSchemaLocation(root(""), "6.0", "system")).toEqual([])
    expect(checkSchemaLocation(as("9-9"), "6.0", "system")).toEqual([])
  })

  it("abweichende Angabe → genau ein Hinweis (Gruppe XSD), für alle Issues", () => {
    expect(checkSchemaLocation(as("5-0"), "6.0", "system")).toEqual([
      {
        severity: "hinweis",
        group: "XSD",
        message:
          "Die Schema-Angabe der Datei verweist auf S1000D Issue 5.0, das System verwendet Issue 6.0 — bitte prüfen, ob die Datei in der richtigen Version erstellt wurde.",
      },
    ])
    expect(checkSchemaLocation(as("6"), "4.2", "auswahl")[0].message).toBe(
      "Die Schema-Angabe der Datei verweist auf S1000D Issue 6.0, gewählt ist Issue 4.2 — bitte Issue prüfen."
    )
    expect(checkSchemaLocation(as("2-3"), "5.0", "system")).toHaveLength(1)
  })

  it("die PHUNGUN-Demodateien (2.3, auch NSG-Pfad) ergeben bei Issue 2.3 keinen Hinweis", () => {
    for (const name of Object.values(DEMO_FILES)) expect(checkSchemaLocation(DEMO_XML_FILES[name], "2.3", "system"), name).toEqual([])
  })
})
