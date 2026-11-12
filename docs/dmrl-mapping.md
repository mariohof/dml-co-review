# DMRL-Feldmapping (CSV ↔ S1000D DML)

Quelle: `261111_DMRLMapping.md` (Product Owner). XPaths entsprechen der Elementstruktur von S1000D Issue 2.3 (`dml.xsd`).

## Datenmoduleintrag

| DMRL Feld | XPath Exchange-DMRL | Regel |
| --- | --- | --- |
| dmentryType | /dml/dmentry/@type | **Eintragstyp:** leer, n, c, d (Änderungsart des Eintrags in der Abstimmung) |
| modelic | /dml/dmentry/addresdm/dmc/avee/modelic | 2-14 Stellen, alphanumerisch |
| sdc | /dml/dmentry/addresdm/dmc/avee/sdc | 1-4 Stellen, alphanumerisch |
| chapnum | /dml/dmentry/addresdm/dmc/avee/chapnum | 2-3 Stellen, alphanumerisch |
| section | /dml/dmentry/addresdm/dmc/avee/section | 1 Stelle, alphanumerisch |
| subsect | /dml/dmentry/addresdm/dmc/avee/subsect | 1 Stelle, alphanumerisch |
| subject | /dml/dmentry/addresdm/dmc/avee/subject | 2-4 Stellen, alphanumerisch |
| discode | /dml/dmentry/addresdm/dmc/avee/discode | 2 Stellen, alphanumerisch |
| discodev | /dml/dmentry/addresdm/dmc/avee/discodev | 1-3 Stellen, alphanumerisch |
| incode | /dml/dmentry/addresdm/dmc/avee/incode | 3 Stellen, alphanumerisch |
| incodev | /dml/dmentry/addresdm/dmc/avee/incodev | 1 Stelle, alphanumerisch |
| itemloc | /dml/dmentry/addresdm/dmc/avee/itemloc | 1 Stelle, alphanumerisch |
| techname | /dml/dmentry/addresdm/dmtitle/techname | alphanumerisch |
| infoname | /dml/dmentry/addresdm/dmtitle/infoname | alphanumerisch |
| language | /dml/dmentry/addresdm/language/@language | 2 Stellen, ISO 639-1 (klein, z. B. `de`) |
| country | /dml/dmentry/addresdm/language/@country | 2 Stellen, ISO 3166 Alpha-2 (groß, z. B. `DE`) |
| security | /dml/dmentry/security/@class | 2 Stellen, führende Nullen |
| rpc | /dml/dmentry/rpc (Elementinhalt) | alphanumerisch, Firmencode |
| rpcname | /dml/dmentry/rpc/@rpcname | alphanumerisch, Firmenname (optional) |
| issno | /dml/dmentry/addresdm/issno/@issno | 3 Stellen, führende Nullen |
| type | /dml/dmentry/addresdm/issno/@type | **DM-Ausgabetyp:** new, changed, revised, deleted (deleted = DM gelöscht, manuell vom Bearbeiter gesetzt) |
| day | /dml/dmentry/addresdm/issdate/@day | 2 Stellen, führende Nullen |
| month | /dml/dmentry/addresdm/issdate/@month | 2 Stellen, führende Nullen |
| year | /dml/dmentry/addresdm/issdate/@year | 4 Stellen, führende Nullen |
| answer | /dml/dmentry/answer/@answer | y, n |
| answer_comment | /dml/dmentry/answer/remarks | alphanumerisch |
| remarks | /dml/dmentry/remarks | alphanumerisch, eigene Bemerkung zum Eintrag (optional) |

### Ergänzungen aus den Beispieldateien
- `rpc`: Elementinhalt = Firmencode (z. B. `D7177`), Attribut `@rpcname` = Firmenname (optional)
- `/dml/dmentry/remarks`: eigene Bemerkung zum Eintrag (getrennt von `answer/remarks`)
- **Zwei Typ-Felder:** `/dml/dmentry/@type` = Eintragstyp (n/c/d, Abstimmung) ≠ `/dml/dmentry/addresdm/issno/@type` = DM-Ausgabetyp (new/…/deleted, Datenmodul)
- REPLY-Übernahme (betrifft nur den Eintragstyp): `answer="y"` → `dmentry/@type` wird entfernt (genehmigt, auch bei `d` — Eintrag bleibt bestehen); `answer="n"` → Typ bleibt, Eintrag muss überarbeitet und erneut gesendet werden
- `answer` + `answer/remarks` werden nur vom Partner (REPLY) gefüllt; in einer REPLY-DMRL hat jeder `dmentry` mit `@type` die Elemente `answer` und `remarks`

## DMRL-Statusdaten (Kopf)

| Feld | XPath | Bemerkung |
| --- | --- | --- |
| direction | /dml/@direction | `send` (Bearbeiter) oder `reply` (Partner) |
| dmlc/modelic | /dml/dmlc/modelic | Model Ident Code |
| dmlc/sendid | /dml/dmlc/sendid | Code des Absenders (z. B. D0815 = Bearbeiter, C1234 = Partner) |
| dmlc/dmltype | /dml/dmlc/dmltype/@type | z. B. `c` |
| dmlc/diyear | /dml/dmlc/diyear | Jahr (4-stellig) |
| dmlc/seqnum | /dml/dmlc/seqnum | laufende Nummer, 5-stellig, führende Nullen → Versionsindex `seqnum-diyear` |
| issno | /dml/issno/@issno, @inwork, @type | z. B. `001`, `00`, `new` |
| issdate | /dml/issdate/@day, @month, @year | Ausgabedatum |
| security | /dml/security/@class | 2-stellig |
| dmlref | /dml/dmlref/dmlc (+ optional issno) | Verweis auf vorherige DMRL im Austausch; initialer SEND: dmlref = eigener dmlc |
| remarks | /dml/remarks | Bemerkung zur DMRL |

## Beispieldateien (Issue 2.3, System PHUNGUN)
1. `01_DML-PHUNGUN-D0815-C-2026-00001_001-00.XML` — initialer SEND, 11 Einträge (alle `n`)
2. `02_DML-PHUNGUN-C1234-C-2026-00001-001-00.XML` — REPLY des Partners C1234, alle `answer="y"`
3. `03_DML-PHUNGUN-D0815-C-2026-00002_001-00.XML` — zweiter SEND, Einträge `d` (gelöscht) und `n` (neu), dmlref → REPLY C1234-00001

Dateinamensschema: `DML-{modelic}-{sendid}-{dmltype}-{diyear}-{seqnum}_{issno}-{inwork}.XML`

## Mapping Issue 4.2 / 5.0

Abgeleitet aus `schemas/s1000d/issue-4.2/dml.xsd` und `issue-5.0/dml.xsd` (für diese Felder identisch) und der Beispieldatei `docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML`. Präfix `E` = `/dml/dmlContent/dmlEntry`, `R` = `E/dmRef/dmRefIdent`.

### Datenmoduleintrag
| CSV-Feld | Issue 2.3 | Issue 4.2 / 5.0 |
| --- | --- | --- |
| dmentryType | dmentry/@type | E/@dmlEntryType |
| modelic | …/avee/modelic | R/dmCode/@modelIdentCode |
| sdc | …/avee/sdc | R/dmCode/@systemDiffCode |
| chapnum | …/avee/chapnum | R/dmCode/@systemCode |
| section | …/avee/section | R/dmCode/@subSystemCode |
| subsect | …/avee/subsect | R/dmCode/@subSubSystemCode |
| subject | …/avee/subject | R/dmCode/@assyCode |
| discode | …/avee/discode | R/dmCode/@disassyCode |
| discodev | …/avee/discodev | R/dmCode/@disassyCodeVariant |
| incode | …/avee/incode | R/dmCode/@infoCode |
| incodev | …/avee/incodev | R/dmCode/@infoCodeVariant |
| itemloc | …/avee/itemloc | R/dmCode/@itemLocationCode |
| techname | addresdm/dmtitle/techname | E/dmRef/dmRefAddressItems/dmTitle/techName |
| infoname | addresdm/dmtitle/infoname | E/dmRef/dmRefAddressItems/dmTitle/infoName |
| language | addresdm/language/@language | R/language/@languageIsoCode |
| country | addresdm/language/@country | R/language/@countryIsoCode |
| security | dmentry/security/@class | E/security/@securityClassification |
| rpc | dmentry/rpc | E/responsiblePartnerCompany/@enterpriseCode |
| rpcname | dmentry/rpc/@rpcname | E/responsiblePartnerCompany/enterpriseName |
| issno | addresdm/issno/@issno | R/issueInfo/@issueNumber (+ `@inWork="00"`) |
| type (DM-Ausgabetyp) | addresdm/issno/@type | E/@issueType |
| day / month / year | addresdm/issdate/@day/@month/@year | E/dmRef/dmRefAddressItems/issueDate/@day/@month/@year |
| answer | dmentry/answer/@answer | E/answer/@answerToEntry |
| answer_comment | dmentry/answer/remarks | E/answer/remarks/simplePara |
| remarks | dmentry/remarks | E/remarks/simplePara |

### Kopf
| Feld | Issue 2.3 | Issue 4.2 / 5.0 |
| --- | --- | --- |
| direction | /dml/@direction | /dml/@listDirection |
| dmlc | /dml/dmlc/(modelic, sendid, dmltype/@type, diyear, seqnum) | …/dmlIdent/dmlCode/@modelIdentCode, @senderIdent, @dmlType, @yearOfDataIssue, @seqNumber |
| issno | /dml/issno/@issno, @inwork, @type | …/dmlIdent/issueInfo/@issueNumber, @inWork; …/dmlStatus/@issueType |
| issdate | /dml/issdate | …/dmlAddressItems/issueDate |
| security | /dml/security/@class | …/dmlStatus/security/@securityClassification |
| dmlref | /dml/dmlref/dmlc (+ issno) | …/dmlStatus/dmlRef/dmlRefIdent/dmlCode (+ issueInfo) |
| brexDmRef | — | …/dmlStatus/brexDmRef/dmRef (Pflicht) — Standard-BREX: 4.2 `S1000D-F-04-10-0301-00A-022A-D`, 5.0 `S1000D-G-04-10-0301-00A-022A-D` |
| remarks | /dml/remarks | …/dmlStatus/remarks/simplePara |

(`…` = `/dml/identAndStatusSection/dmlAddress` bzw. `/dml/identAndStatusSection`)

### Wertebereiche laut Schema
- `securityClassification`: 4.2/5.0 `01`–`20`, 2.3 `01`–`24` → Anwendung verwendet `01`–`20`
- `issueNumber`: 4.2 `\d{3}`, 5.0 `\d{3,5}`; `inWork` `\d{2}`
- `languageIsoCode` `[a-z]{2,3}`, `countryIsoCode` `[A-Z]{2}`
- `issueType`: new, changed, deleted, revised, status, rinstate-changed, rinstate-revised, rinstate-status
- `dmlEntryType`: c, d, n; `dmlType`: c, p, s; `answerToEntry`: y, n
- Jede DML braucht mindestens einen Eintrag (alle Issues)

## XSD-Schemas
- Ablage: `schemas/s1000d/issue-{2.3,4.2,5.0}/` (`dml.xsd` + eingebundene Schemas)
- Issue 5.0: Import von `xml.xsd` auf lokale Kopie umgestellt (statt `http://www.w3.org/2001/xml.xsd`), damit `xmllint --nonet` offline validiert
- Alle drei Schemas kompilieren mit `xmllint --nonet`; die PHUNGUN-Beispieldateien sind gegen Issue 2.3 gültig, `docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML` gegen 4.2 und `docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML` gegen 5.0

## Offen
- Ausgabedaten der Einträge (`issno`, DM-Ausgabetyp, Datum) im SEND-XML: derzeit enthalten (PROJ-12), ggf. später anpassen (NSG sieht sie nicht vor)
