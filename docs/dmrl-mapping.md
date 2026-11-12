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
| language | /dml/dmentry/addresdm/language/@language | 2 Stellen, alphanumerisch |
| country | /dml/dmentry/addresdm/language/@country | 2 Stellen, alphanumerisch |
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

## Offen
- Mapping für Issue 4.2 und 5.0 (abweichende Elementnamen, z. B. `dmlEntry`, `dmRef`, `dmCode`-Attribute)
