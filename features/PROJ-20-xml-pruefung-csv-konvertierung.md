# PROJ-20: XML-Prüfung & Excel-Konvertierung

## Status: Architected
**Created:** 2026-11-14
**Last Updated:** 2026-11-26


> **Refinement 2026-11-26 (3) — MS-Excel mit 37 Spalten statt CSV:** Vorgabe Product Owner. Das Werkzeug liefert die konvertierte DMRL nur noch als **MS-Excel-Datei (.xlsx)**, keine CSV mehr. Aufbau **genau wie der Check-out (PROJ-9)**: ein Tabellenblatt „Einträge“, **37 Spalten** (inkl. `dmc` und Informationsfelder `orig` bis `io-pm`), alle Zellen als Text, Kopfzeile fett und fixiert, Autofilter, nach DMC sortiert. `dmc` ist gefüllt; die Informationsfelder sind **leer**, weil keine DMRL-XML sie enthält. Damit lässt sich die Datei unverändert als Check-in-Datei verwenden. **Bewusste Folge** (ersetzt die Lösung von BUG-QA13-1): Beim Check-in in eine DMRL mit gespeicherten Informationsfeldern werden diese **geleert**, denn das ist das normale Check-in-Verhalten (PROJ-10). Darauf weist ein Hinweis an der Download-Schaltfläche hin. Der **Prüfbericht bleibt CSV** (wie bei Check-in und REPLY). Dateiname: Name der XML-Datei mit `.xlsx`. Geänderte Stellen sind mit *(Refinement 2026-11-26 (3))* markiert. Tech Design und QA-Abschnitte weiter unten beschreiben den CSV-Stand.

> ~~**Refinement 2026-11-26 (2) — CSV mit 28 Spalten (Anlass BUG-QA13-1):** Die konvertierte CSV hat **28 Spalten** (Aufbau vom 21.11.2026: bis `remarks`, inkl. `answer_timestamp`) — **ohne** `dmc` und **ohne** die Informationsfelder `orig` bis `io-pm`. Grund: Eine Empfänger-XML enthält keine Informationsfelder; eine 37-Spalten-CSV mit leeren Informationsfeldern würde beim Check-in alle gespeicherten Werte der DMRL leeren. Mit 28 Spalten greift die Check-in-Regel „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten“ (PROJ-10); am Check-in ändert sich nichts. Ersetzt den Stand des ersten Refinements vom selben Tag (37 Spalten, Informationsfelder leer). Check-out, Export und Freigabestand behalten 37 Spalten (PROJ-9).~~ — ersetzt durch Refinement 2026-11-26 (3)

> ~~**Refinement 2026-11-26 (über `/refine PROJ-9`) — 37 Spalten:** Die konvertierte CSV hat 37 Spalten (wie Check-out); `dmc` ist gefüllt, die Informationsfelder `orig` bis `io-pm` sind leer (nicht in der Empfänger-XML).~~ — ersetzt durch Refinement 2026-11-26 (2)

> **Refinement 2026-11-21 (über PROJ-13) — `answer_timestamp`:** Die konvertierte CSV hat 28 Spalten (wie Check-out); `answer_timestamp` ist leer, da eine Empfänger-XML keinen Übernahme-Zeitpunkt enthält.

> **Refinement 2026-11-22 — Benennung „Werkzeug“:** Menüpunkt in der Kopfzeile und Seitenüberschrift heißen **„Werkzeug“** (bisher „XML prüfen“). Die Adresse `/xml-pruefung` und die Funktion bleiben unverändert. Die kleine Zeile über der Überschrift (bisher „Werkzeug“) lautet jetzt „XML prüfen“, damit die Funktion weiterhin auf einen Blick erkennbar ist und „Werkzeug“ nicht doppelt steht.

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung) — nur angemeldete Benutzer
- Requires: PROJ-8 (Fachliches Regelwerk) — Regeln für die Einträge
- Requires: PROJ-11 (XSD-Validierung) — Schema-Prüfung je Issue
- Nutzt: PROJ-9 (Check-out MS-Excel) — Excel-Aufbau und Excel-Schreiber *(Refinement 2026-11-26 (3))*; PROJ-10 (Check-in) — Prüfbericht und Zielverwendung der Excel-Datei
- **Erfordert Anpassung von PROJ-10 und PROJ-8 (per `/refine PROJ-10`):** Weichen `answer`/`answer_comment` in der eingecheckten CSV vom Stand der DMRL ab, wird das nicht mehr als Fehler abgewiesen (heute Regel K). Stattdessen fragt der Check-in, ob die Antworten übernommen werden. Übernommene Antworten sind **nur Information**: Der Eintragsstatus bleibt *in Bearbeitung*, freigegeben wird weiterhin nur durch einen REPLY; die Übernahme steht im Verlauf.
- Betrifft PROJ-11 (XSD-Validierung, Refinement 2026-11-16): genauere Meldung, warum die XSD-Prüfung nicht erreichbar ist (Server beendet / fremde Adresse) — gilt überall, wo die XSD-Prüfung genutzt wird
- ~~Wird genutzt von: PROJ-21 (XML gegen DMRL prüfen)~~ — PROJ-21 entfällt (2026-11-16): Der Bedarf ist mit PROJ-20 abgedeckt

## Beschreibung
Ein **eigenständiges Werkzeug** (Menüpunkt und Seite „Werkzeug“, Funktion „XML prüfen“): Der Benutzer lädt eine beliebige DMRL-XML hoch (z. B. von einem Empfänger, aus einem Altprojekt oder einem anderen System), wählt die S1000D-Issue, und die Datei wird gegen das Schema (XSD) und das fachliche Regelwerk geprüft. Das Ergebnis ist eine Zusammenfassung der Datei mit Prüfbericht und eine **MS-Excel-Datei im Check-out-Format** *(Refinement 2026-11-26 (3))*, die sich in Excel bearbeiten und über den normalen Check-in in eine DMRL im System übernehmen lässt.

Das Werkzeug **speichert nichts**: keine DMRL, kein Archiv, kein Verlauf, keine Sperre.

## Ablauf
1. Menüpunkt **„Werkzeug“** in der Kopfzeile (neben „Dashboard“) öffnen
2. **S1000D-Issue wählen** (2.3, 4.2 oder 5.0); ohne Auswahl ist keine Prüfung möglich
3. **XML-Datei auswählen** (höchstens 5 MB, wie PROJ-11) und „Prüfen“
4. Prüfung: Wohlgeformtheit und XSD (PROJ-11), dann Einlesen der Einträge und Regelprüfung
5. Ergebnis: **Zusammenfassung**, **Prüfbericht**, Schaltfläche **„Excel-Datei herunterladen“** *(Refinement 2026-11-26 (3))* (und „Prüfbericht herunterladen“, weiterhin CSV)
6. Neue Datei prüfen → vorheriges Ergebnis wird ersetzt

## Prüfung
| Stufe | Inhalt | Bei Fehler |
|---|---|---|
| Wohlgeformtheit | gültiges XML | Prüfbericht, **keine Excel-Datei** |
| XSD | `dml.xsd` der gewählten Issue (PROJ-11) | Prüfbericht, Excel-Datei mit Warnung |
| Einlesen | Kopf und Einträge mit dem Leser der gewählten Issue | nicht lesbar (z. B. falsche Issue gewählt): Meldung, **keine Excel-Datei** |
| Regelwerk | Regeln wie beim **Check-in** (PROJ-8): Format (A), Pflichtfelder (B), eindeutiger DMC (C), SNS ↔ Benennung (E), Infocode ↔ Infoname (I). **Ausnahme Pflichtfelder:** Die Ausgabedaten des Datenmoduls (`addresdm/issno` mit `@issno`/`@type` und `addresdm/issdate` mit Tag/Monat/Jahr) sind wie beim REPLY-Import **optional** — in einer DMRL-XML fehlen sie oft. Ein angefangenes Datum muss vollständig sein. | Prüfbericht, Excel-Datei mit Warnung |
| MI | statt Regel D: **alle Einträge haben denselben MI**; der MI wird in der Zusammenfassung angezeigt | Prüfbericht, Excel-Datei mit Warnung |

**Fehlende Ausgabedaten in der Excel-Datei ergänzen** (Refinement 2 und 3, 2026-11-16; bis 2026-11-26 in der CSV): **Auslöser** ist ein leerer Ausgabetyp `addresdm/issno/@type` — egal ob die Ausgabenummer `@issno` vorhanden ist oder `issno` ganz fehlt. Dann werden in der **Excel-Datei** gesetzt:
| Feld (Spalte) | XPath (Issue 2.3; 4.2/5.0 entsprechend) | Wert | Bedingung |
|---|---|---|---|
| `type` | `/dml/dmentry/addresdm/issno/@type` | aus dem Eintragstyp abgeleitet: `n` → `new`, `c` → `changed`, `d` → `deleted`; ist der Eintragstyp leer → `new` | immer (Auslöser) |
| `dmentryType` | `/dml/dmentry/@type` | `n` | nur wenn leer; vorhandenes `c`/`d` bleibt |
| `issno` | `/dml/dmentry/addresdm/issno/@issno` | `001` | nur wenn leer; eine vorhandene Ausgabenummer bleibt |
| `day`/`month`/`year` | `/dml/dmentry/addresdm/issdate` | Datum der Prüfung | nur wenn `issdate` fehlt (alle drei leer); ein vorhandenes Datum bleibt |

- Bei Issue 4.2/5.0 entsprechen die Felder `dmlEntry/@issueType` (Ausgabetyp) und `dmlEntry/@dmlEntryType` (Eintragstyp); die Ableitung gilt für alle drei Issues gleich. `new`, `changed` und `deleted` sind in allen drei Schemas und in Regel A gültig.
- Die **Prüfung** (XSD, Regelwerk) läuft auf den **Originaldaten** der XML; die Ergänzung betrifft nur die heruntergeladene Excel-Datei. Die XML-Datei wird nicht verändert, gespeichert wird nichts.
- Statt des Sammelhinweises erscheint **ein Hinweis** (kein Fehler): „Bei N Einträgen fehlten Ausgabedaten — in der Excel-Datei ergänzt: Ausgabetyp aus dem Eintragstyp (n → new, c → changed, d → deleted; ohne Eintragstyp new und Eintragstyp n), Ausgabenummer 001 und Datum TT.MM.JJJJ (nur wo leer).“
- **Ausgabetyp vorhanden, aber Ausgabenummer und/oder Datum fehlen:** keine Ergänzung (bei `changed`/`deleted` wäre `001` meist falsch — die Nummer klärt der Bearbeiter); es bleibt der Sammelhinweis „Bei N Einträgen fehlen Ausgabedaten (Ausgabenummer, Ausgabetyp, Datum) — beim Check-in sind sie Pflicht.“
- Check-in (PROJ-10) und REPLY-Import (PROJ-13) bleiben unverändert — dort wird nichts ergänzt.

Ist die XSD-Prüfung **nicht verfügbar**, wird trotzdem eingelesen und nach Regelwerk geprüft. Der Bericht weist deutlich auf „XSD-Prüfung nicht durchgeführt“ hin, die Excel-Datei ist mit Warnung herunterladbar. Die Meldung nennt die **Ursache mit Handlungsanweisung** (Refinement 2026-11-16):
- **Server läuft nicht** (Anfrage kommt nicht an): „Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).“
- **Zugriff abgelehnt** (App über eine andere Adresse als `localhost`/`127.0.0.1` geöffnet): „Zugriff abgelehnt — bitte die Anwendung über http://localhost:<Port> öffnen.“
- xmllint fehlt, Schema fehlt, Zeitlimit: Meldungen wie bisher (PROJ-11).

Neben der Meldung gibt es die Schaltfläche **„Erneut prüfen“** (wie „Erneut versuchen“ beim REPLY-Import): Sie wiederholt die Prüfung derselben Datei mit derselben Issue. Das bisherige Ergebnis nach Regelwerk bleibt bis dahin sichtbar.

## Ergebnis
**Zusammenfassung (Kopfdaten der Datei)**
- Dateiname, gewählte Issue, Richtung (SEND/REPLY, soweit aus der Datei erkennbar)
- DML-Code, Ausgabestand (`issno`/`inwork`), Datum, Sicherheitseinstufung, Verweis auf die Bezugs-DMRL (`dmlref`), soweit vorhanden
- MI (bzw. „uneinheitlich“), Anzahl Einträge, Anzahl Empfängerantworten freigegeben / zu überarbeiten / ohne Antwort (immer angezeigt, auch bei SEND-Dateien ohne Antworten)
- Gesamtergebnis: **„Keine Fehler“** oder **„N Fehler, M Hinweise“**
- Lange Codes (Dateiname, DML-Code, Bezugs-DMRL) brechen **nach einem Bindestrich** um, nicht mitten in einer Codegruppe (z. B. Zeile 1 `DML-TWLBORFLOS-DN463-C-2026-`, Zeile 2 `00001`). Umsetzung rein per CSS, es werden keine Zeichen eingefügt; nur wenn eine Codegruppe allein nicht in die Zeile passt, wird sie getrennt

**Prüfbericht:** gleiche Darstellung und gleicher Download wie beim Check-in (PROJ-10), gruppiert nach XSD und Regeln.

**Excel-Datei** *(Refinement 2026-11-26 (3))*
- Format: nur **MS-Excel (.xlsx)**; eine CSV der Einträge wird nicht mehr angeboten
- Aufbau: **genau wie der Check-out (PROJ-9)**: ein Tabellenblatt „Einträge“, **37 Spalten** in der Reihenfolge des Check-outs (bis `remarks`, dann `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm`), alle Zellen (auch ganze Spalten) als Text, Kopfzeile fett und fixiert, Autofilter, keine Kopfdaten, nach DMC sortiert, inkl. `answer`/`answer_comment`
- `dmc`: aus den DMC-Teilen gebildet (Schreibweise wie in der Anwendung). Informationsfelder `orig` bis `io-pm`: **leer** (nicht in der DMRL-XML); `answer_timestamp`: leer
- Dateiname: Name der XML-Datei mit Endung `.xlsx`, z. B. `DML-PHUNGUN-C1234-C-2026-00002_001-00.xlsx`
- Fehlende Ausgabedaten mit Standardwerten ergänzt (siehe „Prüfung“); alle übrigen Werte unverändert aus der XML
- Hinweis an der Schaltfläche (immer): „Die Informationsfelder (orig bis io-pm) sind leer — beim Check-in werden gespeicherte Werte der DMRL dadurch geleert.“
- Bei Fehlern zusätzlich: „Die Excel-Datei enthält Fehler aus der Prüfung — ein Check-in wird abgewiesen, bis sie behoben sind.“

## User Stories
- Als **Bearbeiter** möchte ich eine DMRL-XML eines Empfängers prüfen, ohne sie in eine DMRL im System zu übernehmen, damit ich Fehler früh erkenne und zurückmelden kann.
- Als **Bearbeiter** möchte ich eine fremde oder alte DMRL-XML in eine MS-Excel-Datei im Check-out-Format umwandeln *(Refinement 2026-11-26 (3))*, damit ich sie in Excel bearbeiten und unverändert per Check-in in eine DMRL im System übernehmen kann.
- Als **Bearbeiter** möchte ich auch bei Fehlern eine Excel-Datei erhalten, damit ich die Fehler in Excel korrigieren kann.
- Als **Bearbeiter** möchte ich auf einen Blick sehen, was in der Datei steht (DML-Code, MI, Anzahl Einträge, Antworten), ohne sie in einem XML-Editor zu öffnen.
- Als **Administrator** möchte ich das Werkzeug ebenfalls nutzen können, z. B. zur Vorbereitung einer neuen DMRL.
- Als **Product Owner** möchte ich in der Demo zeigen, dass fehlerhafte XML-Dateien zuverlässig erkannt werden — auch außerhalb des SEND/REPLY-Workflows.

## Out of Scope
- Prüfung gegen eine DMRL im System (Abgleich mit Einträgen, SEND-Bezug, MI des Systems) — **entfällt** (ehemals PROJ-21, verworfen 2026-11-16); der Abgleich mit einer DMRL erfolgt beim Check-in der konvertierten Excel-Datei (PROJ-10)
- Automatische Übernahme in eine DMRL; die Übernahme läuft nur über Check-out → Datei ersetzen → Check-in (PROJ-9/10)
- Automatische Erkennung der Issue (bewusst manuelle Auswahl)
- Eintragsvorschau als Tabelle
- Konvertierung in andere Richtungen (CSV/Excel → XML, Issue → andere Issue)
- CSV der konvertierten Einträge (zusätzlich oder wahlweise zur Excel-Datei) *(Refinement 2026-11-26 (3))*
- Informationsfelder aus einer bestehenden DMRL übernehmen oder beim Check-in einer Werkzeug-Datei schützen *(Refinement 2026-11-26 (3))*
- Prüfbericht als Excel *(Refinement 2026-11-26 (3))*
- Speichern von Prüfergebnissen, Archiv- oder Verlaufseinträge
- Mehrere Dateien auf einmal
- Andere Datentypen als DMRL/DML (z. B. Datenmodule, PM, BREX)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugang
- [ ] Angenommen ein Bearbeiter oder Administrator ist angemeldet, wenn er die Kopfzeile ansieht, dann gibt es den Menüpunkt „Werkzeug“ (neben „Dashboard“), der zum Werkzeug führt; der Menüpunkt „XML prüfen“ existiert nicht mehr
- [ ] Angenommen das Werkzeug ist geöffnet, wenn die Seite angezeigt wird, dann lautet die Überschrift „Werkzeug.“, darüber steht die Zeile „XML prüfen“, und die Adresse ist weiterhin `/xml-pruefung`
- [ ] Angenommen niemand ist angemeldet, wenn die Adresse des Werkzeugs aufgerufen wird, dann erscheint die Anmeldeseite
- [ ] Angenommen ein Bearbeiter ohne jede DMRL-Berechtigung ist angemeldet, wenn er das Werkzeug öffnet, dann kann er es uneingeschränkt nutzen

### Auswahl und Prüfung
- [ ] Angenommen das Werkzeug ist geöffnet, wenn keine Issue gewählt ist, dann ist „Prüfen“ nicht möglich und ein Hinweis fordert zur Auswahl der Issue auf
- [ ] Angenommen eine Issue ist gewählt, wenn eine Datei über 5 MB oder eine Datei, die keine XML ist, ausgewählt wird, dann wird sie mit verständlicher Meldung abgewiesen
- [ ] Angenommen eine gültige DMRL-XML und die passende Issue, wenn „Prüfen“ gewählt wird, dann erscheinen Zusammenfassung, Prüfbericht „Keine Fehler“ und „Excel-Datei herunterladen“ *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine nicht wohlgeformte XML, wenn geprüft wird, dann zeigt der Bericht den Fehler mit Zeile, und es gibt keine Excel-Datei
- [ ] Angenommen eine XML mit Schemafehlern, wenn geprüft wird, dann listet der Bericht die XSD-Fehler mit Zeile, und die Excel-Datei ist mit Warnung herunterladbar
- [ ] Angenommen eine XML einer anderen Issue als der gewählten, wenn geprüft wird, dann meldet der Bericht Schemafehler bzw. „Datei passt nicht zur gewählten Issue“; ist sie nicht lesbar, gibt es keine Excel-Datei
- [ ] Angenommen eine XML mit Regelverstößen (z. B. doppelter DMC, fehlendes Pflichtfeld, unterschiedliche Benennung zum selben SNS), wenn geprüft wird, dann listet der Bericht die Verstöße je Eintrag wie beim Check-in, und die Excel-Datei ist mit Warnung herunterladbar
- [ ] Angenommen die Einträge haben unterschiedliche MI, wenn geprüft wird, dann meldet der Bericht „MI uneinheitlich“ mit den betroffenen Einträgen, und die Zusammenfassung zeigt „uneinheitlich“
- [ ] Angenommen die XSD-Prüfung ist nicht verfügbar, wenn geprüft wird, dann wird nach Regelwerk geprüft, der Bericht weist auf „XSD-Prüfung nicht durchgeführt“ hin, und die Excel-Datei ist mit Warnung herunterladbar
- [ ] Angenommen eine DMRL-XML, deren Einträge keine Ausgabedaten (`issno`, `type`, `issdate`) enthalten, wenn geprüft wird, dann erscheinen dafür keine Pflichtfeld-Fehler, sondern ein einziger Hinweis „Bei N Einträgen fehlten Ausgabedaten — in der Excel-Datei ergänzt …“ *(geändert Refinement 2)*
- [ ] Angenommen bei einem Eintrag fehlt `addresdm/issno` ganz und der Eintragstyp ist `n`, wenn die Excel-Datei heruntergeladen wird, dann stehen dort `issno` = `001`, `type` = `new` und — falls `issdate` fehlt — das Datum der Prüfung (TT/MM/JJJJ in `day`/`month`/`year`)
- [ ] Angenommen bei einem Eintrag ist `issno/@type` leer und der Eintragstyp ist `c`, wenn die Excel-Datei heruntergeladen wird, dann steht in `type` der Wert `changed` und der Eintragstyp bleibt `c` *(neu Refinement 3)*
- [ ] Angenommen bei einem Eintrag ist `issno/@type` leer und der Eintragstyp ist `d`, wenn die Excel-Datei heruntergeladen wird, dann steht in `type` der Wert `deleted` und der Eintragstyp bleibt `d` *(neu Refinement 3)*
- [ ] Angenommen bei einem Eintrag ist `issno/@type` leer und der Eintragstyp ist leer, wenn die Excel-Datei heruntergeladen wird, dann stehen in `type` der Wert `new` und in `dmentryType` der Wert `n`
- [ ] Angenommen bei einem Eintrag ist `@issno` vorhanden (z. B. `002`), aber `@type` und `issdate` fehlen, wenn die Excel-Datei heruntergeladen wird, dann bleibt `issno` = `002`, `type` wird aus dem Eintragstyp abgeleitet und das Datum der Prüfung wird ergänzt *(neu Refinement 3)*
- [ ] Angenommen bei einem Eintrag ist `issno/@type` leer, aber `issdate` ist vollständig vorhanden, wenn die Excel-Datei heruntergeladen wird, dann bleibt das vorhandene Datum erhalten
- [ ] Angenommen bei einem Eintrag ist `issno/@type` vorhanden, aber `@issno` oder `issdate` fehlt, wenn geprüft wird, dann wird nichts ergänzt und der Hinweis „… fehlen Ausgabedaten … beim Check-in sind sie Pflicht“ zählt diesen Eintrag *(geändert Refinement 3)*
- [ ] Angenommen eine DMRL-XML ohne Ausgabedaten und sonst ohne Fehler wurde konvertiert, wenn die Excel-Datei unverändert in eine passend ausgecheckte DMRL eingecheckt wird, dann gibt es keine Pflichtfeld-Fehler zu den Ausgabedaten
- [ ] Angenommen ein Eintrag hat ein unvollständiges Ausgabedatum (z. B. nur das Jahr), wenn geprüft wird, dann meldet der Bericht wie beim REPLY-Import einen Fehler „Ausgabedatum ist unvollständig“
- [ ] Angenommen der Server der Anwendung läuft nicht mehr (Seite noch offen), wenn geprüft wird, dann nennt der Hinweis „XSD-Prüfung nicht durchgeführt“ die Ursache „Server läuft nicht“ mit der Anweisung, die Anwendung neu zu starten
- [ ] Angenommen die Anwendung wurde über eine andere Adresse als `localhost`/`127.0.0.1` geöffnet, wenn geprüft wird, dann nennt der Hinweis die Ursache „Zugriff abgelehnt“ mit der Anweisung, die Anwendung über http://localhost:<Port> zu öffnen
- [ ] Angenommen die XSD-Prüfung war nicht verfügbar, wenn „Erneut prüfen“ gewählt wird und die Prüffunktion wieder erreichbar ist, dann wird dieselbe Datei mit derselben Issue vollständig geprüft und das Ergebnis ersetzt

### Ergebnis und Excel-Datei *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine Prüfung ist abgeschlossen, wenn die Zusammenfassung angezeigt wird, dann enthält sie Dateiname, Issue, DML-Code, Ausgabestand, Datum, Sicherheitseinstufung, MI, Anzahl Einträge und Anzahl Antworten je Art
- [ ] Angenommen eine lesbare Datei, wenn „Excel-Datei herunterladen“ gewählt wird, dann wird eine MS-Excel-Datei (.xlsx) mit dem Namen der XML-Datei und Endung `.xlsx` heruntergeladen, die sich per Doppelklick in MS Excel ohne Reparaturmeldung öffnen lässt *(Refinement 2026-11-26 (3))*
- [ ] Angenommen die Excel-Datei des Werkzeugs wird geöffnet, dann enthält sie genau ein Tabellenblatt „Einträge“, dessen Zeile 1 genau die **37 Feldnamen** in derselben Reihenfolge wie beim Check-out enthält; die Kopfzeile ist fett und fixiert und hat einen Autofilter; alle Zellen sind als Text formatiert; die Einträge sind nach DMC sortiert *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine Datei wurde konvertiert, wenn die Excel-Datei geöffnet wird, dann ist `dmc` je Zeile gefüllt (Schreibweise wie in der Anwendung) und die Spalten `orig` bis `io-pm` sowie `answer_timestamp` sind leer *(Refinement 2026-11-26 (3))*
- [ ] Angenommen ein Eintrag hat `security` = `01` und `issno` = `001`, wenn die Excel-Datei geöffnet wird, dann stehen die Werte mit führenden Nullen als Text in den Zellen *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine Prüfung ist abgeschlossen, wenn das Ergebnis angezeigt wird, dann gibt es keine Schaltfläche „CSV herunterladen“ mehr, und an „Excel-Datei herunterladen“ steht der Hinweis, dass die Informationsfelder leer sind und beim Check-in gespeicherte Werte geleert werden *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine DMRL hat gespeicherte Informationsfelder (z. B. `orig`), wenn die Excel-Datei des Werkzeugs unverändert in die ausgecheckte DMRL eingecheckt wird, dann werden die Informationsfelder wie bei jedem Check-in aus der Datei übernommen, also geleert, und die Check-in-Zusammenfassung nennt „Informationsfelder bei N Einträgen aktualisiert“ *(Refinement 2026-11-26 (3))* — ersetzt das Kriterium zu BUG-QA13-1 aus Refinement (2)
- [ ] Angenommen eine Empfänger-XML mit Antworten, wenn sie konvertiert wird, dann stehen Antwort und Begründung je Eintrag in den Spalten `answer` und `answer_comment`
- [ ] Angenommen ein Eintrag enthält einen Wert, der mit `=`, `+`, `-` oder `@` beginnt, wenn die Excel-Datei in Excel geöffnet wird, dann wird er als Text angezeigt, keine Formel ausgewertet, und beim Check-in unverändert gelesen (wie beim Check-out) *(Refinement 2026-11-26 (3))*
- [ ] Angenommen eine fehlerfreie Datei wurde konvertiert, wenn die Excel-Datei unverändert in eine passend ausgecheckte DMRL eingecheckt wird, dann besteht sie die Regelprüfung des Check-ins (Abweichungen nur aus dem Abgleich mit der DMRL, z. B. MI des Systems); enthält sie Empfängerantworten, fragt der Check-in, ob sie übernommen werden (nach Anpassung PROJ-10)
- [ ] Angenommen eine Prüfung ist abgeschlossen, wenn „Prüfbericht herunterladen“ gewählt wird, dann wird der Bericht wie beim Check-in als CSV heruntergeladen — unverändert *(Refinement 2026-11-26 (3))*

### Keine Wirkung auf den Datenbestand
- [ ] Angenommen eine Datei wurde geprüft und konvertiert, wenn danach Dashboard, DMRLs, Archiv und Verlauf angesehen werden, dann ist nichts verändert, gesperrt oder protokolliert
- [ ] Angenommen ein Ergebnis wird angezeigt, wenn die Seite verlassen oder neu geladen wird, dann ist das Ergebnis weg (nichts gespeichert)

### Darstellung
- [ ] Angenommen das Werkzeug wird bei 375, 768 und 1440 px Breite genutzt, wenn eine Prüfung mit Fehlern angezeigt wird, dann scrollt die Seite nicht waagerecht
- [ ] Angenommen ein langer DML-Code oder Dateiname passt nicht in eine Zeile der Zusammenfassung, wenn sie angezeigt wird, dann bricht er nach einem Bindestrich um, nicht mitten in einer Codegruppe; es werden keine Zeichen eingefügt

## Edge Cases
- **XML einer anderen Issue gewählt** (z. B. 4.2-Datei, Issue 2.3 gewählt): XSD meldet Fehler; ist die Datei mit dem Leser der gewählten Issue nicht lesbar, Meldung „Datei passt nicht zur gewählten Issue — bitte Issue prüfen“ und keine Excel-Datei.
- **XML ohne Einträge:** schemagültig nicht möglich (mind. ein Eintrag); bei Schemafehler Bericht und Excel-Datei nur mit Kopfzeile plus Warnung.
- **DMRL-XML ohne Ausgabedaten** (`issno`, `type`, Datum fehlen — im Schema optional, z. B. SEND einer neuen DMRL oder Empfänger-REPLY): keine Pflichtfeld-Fehler; in der Excel-Datei werden `001`, der aus dem Eintragstyp abgeleitete Ausgabetyp und das Datum der Prüfung (und `n` bei leerem Eintragstyp) ergänzt, ein Hinweis nennt die Anzahl. Die Excel-Datei wird ohne Warnung angeboten, sofern keine anderen Fehler vorliegen; beim Check-in sind die Ausgabedaten damit vorhanden (PROJ-10 unverändert streng). *(geändert Refinement 2 und 3; vorher nur Sammelhinweis, davor Pflichtfeld-Fehler)*
- **Nur ein Teil der Ausgabedaten:** kein Fehler, da jedes Feld einzeln optional ist; nur ein angefangenes Datum muss vollständig sein. Ist der **Ausgabetyp leer** (z. B. `@issno` ohne `@type`), wird ergänzt (Ausgabetyp abgeleitet, Datum nur wenn leer, vorhandene Ausgabenummer bleibt). Ist der **Ausgabetyp vorhanden** und fehlen Ausgabenummer oder Datum: **keine Ergänzung** — Sammelhinweis „beim Check-in sind sie Pflicht“. *(geändert Refinement 3)*
- **Eintrag mit Eintragstyp `c` oder `d`, aber ohne Ausgabetyp:** Ausgabetyp `changed` bzw. `deleted`; fehlt auch `@issno`, wird `001` ergänzt; der Eintragstyp bleibt `c`/`d` (vorhandene Werte nie überschreiben). *(geändert Refinement 3; vorher immer `new`)*
- **Eintragstyp mit unbekanntem Wert** (nicht `n`/`c`/`d`, z. B. Tippfehler): Regel A meldet den Fehler wie bisher; ist der Ausgabetyp leer, wird `new` gesetzt und der Eintragstyp bleibt unverändert — die Excel-Datei hat ohnehin eine Fehlerwarnung.
- **Prüfung kurz vor Mitternacht, Download danach:** Es gilt das Datum der Prüfung (Ergebnis wird beim Prüfen erzeugt).
- **Unvollständiges Datum ohne `issno`** (z. B. nur Jahr): Fehler „Ausgabedatum ist unvollständig“ wie bisher; `issno`/`type` werden ergänzt, das Datum nicht (es ist nicht ganz leer) — die Excel-Datei hat ohnehin eine Fehlerwarnung.
- **Keine DMRL-XML** (wohlgeformt, aber z. B. ein Datenmodul): Schemafehler am Wurzelelement; nicht lesbar → keine Excel-Datei.
- **Kodierung:** XML in UTF-8, UTF-16 oder ISO-8859-1 laut Deklaration wird korrekt gelesen (wie REPLY, PROJ-13); Umlaute erscheinen in der Excel-Datei korrekt.
- **Externe Verweise / Entities** in der XML werden nicht nachgeladen (wie PROJ-11).
- **Sehr viele Einträge** (bis 5 MB): Prüfung und Konvertierung funktionieren; da nichts gespeichert wird, ist der Browser-Speicher (BUG-QA2-2) nicht betroffen.
- **Prüfung läuft, Benutzer wählt neue Datei oder verlässt die Seite:** laufende Prüfung wird verworfen, kein veraltetes Ergebnis.
- **Benutzerwechsel in der Kopfzeile** während ein Ergebnis angezeigt wird: Werkzeug bleibt nutzbar (keine Berechtigung nötig).
- **XSD-Prüfung nicht erreichbar, weil der Server beendet wurde** (Browser-Tab noch offen): Regelprüfung läuft im Browser weiter; Hinweis „Server läuft nicht“ mit „Erneut prüfen“. *(Ursache des Falls TWLBORFLOS vom 2026-11-16; xmllint selbst prüft die Datei fehlerfrei.)*
- **App über Rechnername oder Netzwerkadresse geöffnet:** Serverfunktion lehnt ab (Schutz aus BUG-QA2-3); Hinweis „Zugriff abgelehnt — bitte über http://localhost:<Port> öffnen“.
- **Doppelte DMC:** Bericht meldet Regel C; die Excel-Datei enthält beide Einträge (Check-in würde sie abweisen).
- **Werkzeug-Excel in eine DMRL mit gespeicherten Informationsfeldern einchecken:** Die Informationsfelder werden geleert (37-Spalten-Datei mit leeren Feldern, normales Check-in-Verhalten); die Check-in-Zusammenfassung nennt die Anzahl. Wer die Werte behalten will, trägt sie vor dem Check-in in die Werkzeug-Datei ein (z. B. aus einem aktuellen Check-out kopiert). Hauptfall ist ein Altbestand in eine neue DMRL; dort ist nichts gespeichert *(Refinement 2026-11-26 (3))*. *(ersetzt Refinement 2026-11-26 (2): 28-Spalten-CSV, Werte blieben erhalten)*
- **Ältere Werkzeug-CSV (28 Spalten) vom 26.11.2026:** wird beim Check-in weiter angenommen (PROJ-10, CSV und 28 Spalten zulässig); gespeicherte Informationsfelder bleiben dann erhalten *(Refinement 2026-11-26 (3))*.

## Technical Requirements (optional)
- Prüfung einer 5-MB-Datei in wenigen Sekunden
- Kein Speichern im Browser-Speicher (localStorage) — Ergebnis nur auf der Seite
- XSD-Prüfung über die bestehende Serverfunktion (PROJ-11), inkl. Host-/Origin-Schutz
- Browser: Chrome (Firefox, Safari nach Möglichkeit)

## Open Questions
- [x] Wie behandelt der Check-in eingehende `answer`/`answer_comment` aus einer konvertierten Empfänger-XML? → Optional übernehmen mit Abfrage, nur als Information (Status bleibt *in Bearbeitung*); Umsetzung per `/refine PROJ-10` (2026-11-14)
- [x] Antwortzählung bei SEND-Dateien ausblenden? → Nein, immer anzeigen (2026-11-14)
- [x] Sollen die genaueren XSD-Meldungen (PROJ-11) auch im REPLY-Import und beim SEND-Export ein „Erneut prüfen“ bekommen? → Nicht nötig: beide haben bereits „Erneut versuchen“; die genaueren Meldungen wirken dort über den gemeinsamen Baustein (2026-11-16)
- [x] Fehlende Ausgabedaten ergänzen? → Ja, nur in der CSV des Werkzeugs, nur wenn `issno` ganz fehlt; Datum und Eintragstyp nur, wenn leer (2026-11-16) — Auslöser in Refinement 3 geändert: leerer Ausgabetyp
- [x] Ausgabetyp immer `new` oder aus dem Eintragstyp ableiten? → Ableiten: n → new, c → changed, d → deleted; ohne Eintragstyp new + n (2026-11-16, Refinement 3)
- [x] Ergänzung auch bei vorhandener Ausgabenummer und leerem Ausgabetyp? → Ja; Datum dann ebenfalls ergänzen, wenn leer; vorhandene Ausgabenummer bleibt (2026-11-16, Refinement 3)
- [x] `001` ergänzen, wenn nur die Ausgabenummer fehlt (Ausgabetyp vorhanden)? → Nein, Sammelhinweis wie bisher (2026-11-16, Refinement 3)
- [x] Soll das Werkzeug eine Excel-Datei statt/neben der CSV liefern (offene Frage aus PROJ-9/PROJ-10, 2026-11-25)? → Ja, nur Excel mit 37 Spalten wie beim Check-out, keine CSV mehr; Prüfbericht bleibt CSV (2026-11-26, Refinement 3)
- [x] `/refine PROJ-10` (und Regel K in PROJ-8) durchgeführt (2026-11-14): eine Abfrage für alle abweichenden Antworten, standardmäßig aus; übernommene Antwortänderung zählt als Änderung. Umsetzung von PROJ-10/PROJ-8 muss vor der Gesamtabnahme von PROJ-20 erfolgen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zwei Features: eigenständiges Werkzeug (PROJ-20) und Prüfung aus der DMRL-Ansicht mit Abgleich (PROJ-21) — *überholt, siehe 2026-11-16* | Unterschiedlicher Einstieg und unterschiedliche Prüftiefe; getrennt umsetz- und testbar | 2026-11-14 |
| Priorität P1 | MVP (P0) ist vollständig freigegeben; Erweiterung für die nächste Ausbaustufe | 2026-11-14 |
| CSV im Check-out-Format, Prüfung nach Check-in-Regeln | Die CSV soll per Check-in in eine DMRL übernommen werden können (z. B. Altbestand eines Empfängers) | 2026-11-14 |
| Issue wird immer manuell gewählt | Wunsch Product Owner; eindeutig und nachvollziehbar, keine Fehlinterpretation | 2026-11-14 |
| MI: Einheitlichkeit in der Datei statt Abgleich mit einem System | Kein System im Werkzeug; der Abgleich mit dem System erfolgt beim Check-in in die Ziel-DMRL | 2026-11-14 |
| CSV auch bei XSD- oder Regelfehlern (mit Warnung), nicht bei nicht wohlgeformten/nicht lesbaren Dateien | Fehler lassen sich in Excel korrigieren; der Check-in prüft ohnehin erneut | 2026-11-14 |
| XSD nicht verfügbar → Regelprüfung und CSV mit Warnung | Nichts wird gespeichert; der Check-in prüft erneut. Abweichend von REPLY (PROJ-13), wo eine Übernahme ohne XSD blockiert ist | 2026-11-14 |
| Zugang für alle angemeldeten Benutzer über eigenen Menüpunkt, ohne DMRL-Berechtigung | Werkzeug liest und ändert keine Daten des Systems | 2026-11-14 |
| Ergebnis: Zusammenfassung + Prüfbericht, keine Eintragstabelle | Schlank; Details stehen im Bericht und in der CSV | 2026-11-14 |
| Nichts wird gespeichert (kein Archiv, kein Verlauf) | Reines Hilfswerkzeug außerhalb des Workflows; schont den Browser-Speicher (BUG-QA2-2) | 2026-11-14 |
| Empfängerantworten aus der CSV werden beim Check-in optional (mit Abfrage) übernommen, nur als Information — Status bleibt *in Bearbeitung* | Altbestand mit Antworten soll übernehmbar sein; Freigabe bleibt laut PRD an einen REPLY gebunden | 2026-11-14 |
| Änderung am Check-in wird per `/refine PROJ-10` (und PROJ-8 Regel K) spezifiziert, nicht in PROJ-20 | Single Responsibility; PROJ-10/PROJ-8 sind freigegeben und werden danach erneut umgesetzt und getestet | 2026-11-14 |
| Antwortzählung in der Zusammenfassung immer anzeigen, auch bei SEND-Dateien | Wunsch Product Owner; einheitliche Darstellung | 2026-11-14 |
| Ausgabedaten (`issno`/`type`/`issdate`) im Werkzeug optional, wie beim REPLY-Import; ein Sammelhinweis statt Fehler je Eintrag | In echten DMRL-XML fehlen sie oft (im Schema optional); 575 Pflichtfeld-Fehler bei 115 Einträgen verdecken echte Fehler (Fall TWLBORFLOS) | 2026-11-16 |
| Check-in (PROJ-10) bleibt streng: Ausgabedaten dort Pflicht | Wunsch Product Owner; der Sammelhinweis kündigt die Abweisung beim Check-in an | 2026-11-16 |
| „XSD nicht erreichbar“ nennt die Ursache (Server läuft nicht / Zugriff abgelehnt) mit Handlungsanweisung, plus „Erneut prüfen“ | Die bisherige Meldung „Prüffunktion ist nicht erreichbar“ ließ offen, was zu tun ist; die Ursachen sind behebbar. Gilt überall, wo die XSD-Prüfung genutzt wird (PROJ-11) | 2026-11-16 |
| PROJ-21 (XML gegen DMRL prüfen) entfällt | Wunsch Product Owner: alles Nötige funktioniert mit PROJ-20 — Werkzeug prüft die Datei, der Check-in der CSV gleicht mit der DMRL ab. ID PROJ-21 wird nicht neu vergeben | 2026-11-16 |
| Fehlt `addresdm/issno` ganz, ergänzt das Werkzeug in der CSV `issno=001`, `type=new`, `issdate`=Datum der Prüfung (nur wenn leer) und `dmentry/@type=n` (nur wenn leer) | Wunsch Product Owner: konvertierte CSV soll ohne Nacharbeit den Check-in bestehen; Werte entsprechen einem neuen Datenmodul. Vorhandene Werte werden nie überschrieben | 2026-11-16 |
| Ergänzung nur in der CSV, Prüfung auf den Originaldaten | Prüfbericht zeigt den echten Zustand der Datei; nichts wird gespeichert | 2026-11-16 |
| Auslöser nur bei vollständig fehlendem `issno`; bei Teildaten keine Ergänzung | Teildaten deuten auf eine fehlerhafte Pflege hin, die der Bearbeiter bewusst klären soll | 2026-11-16 |
| Keine Ergänzung im REPLY-Import und Check-in | Wunsch Product Owner; der Abstimmungs-Workflow bleibt unverändert | 2026-11-16 |
| Ausgabetyp aus dem Eintragstyp ableiten (n → new, c → changed, d → deleted) statt immer `new`; ohne Eintragstyp `new` + `n` | Wunsch Product Owner: ein geänderter/gelöschter Eintrag mit Ausgabetyp `new` wäre fachlich widersprüchlich. Ersetzt den festen Wert `new` aus Refinement 2 | 2026-11-16 |
| Auslöser der Ergänzung ist ein leerer Ausgabetyp (nicht mehr nur ein ganz fehlendes `issno`); Ausgabenummer `001` und Datum nur, wenn leer | Wunsch Product Owner; der Ausgabetyp ist aus dem Eintragstyp eindeutig ableitbar. Lockert die Regel „bei Teildaten keine Ergänzung“ aus Refinement 2 | 2026-11-16 |
| Fehlt nur die Ausgabenummer (Ausgabetyp vorhanden), wird nichts ergänzt | Bei `changed`/`deleted` wäre `001` meist falsch; die Nummer klärt der Bearbeiter | 2026-11-16 |
| Werkzeug liefert die konvertierte DMRL nur noch als MS-Excel (.xlsx), keine CSV mehr | Vorgabe Product Owner; gleiches Format wie Check-out (PROJ-9), direkt in Excel bearbeitbar, keine CSV-Importprobleme (führende Nullen, Kodierung) | 2026-11-26 |
| Excel mit 37 Spalten genau wie beim Check-out (`dmc` gefüllt, Informationsfelder leer) | Vorgabe Product Owner: Die heruntergeladene Datei soll ohne Umbau als Check-in-Datei dienen. Ersetzt die 28-Spalten-Lösung zu BUG-QA13-1 | 2026-11-26 |
| Leere Informationsfelder werden beim Check-in übernommen, also gespeicherte Werte geleert; Hinweis an der Download-Schaltfläche. PROJ-10 bleibt unverändert | Entscheidung Product Owner: normales Check-in-Verhalten, im Hauptfall (Altbestand in eine neue DMRL) unschädlich. Verworfen: leere Felder beim Check-in schützen (bewusstes Löschen unmöglich), Werkzeug-Datei per Kennung erkennen (mehr Aufwand in PROJ-10 und Excel-Schreiber) | 2026-11-26 |
| Prüfbericht des Werkzeugs bleibt CSV | Einheitlich mit den Prüfberichten von Check-in und REPLY | 2026-11-26 |
| Feature-Titel „XML-Prüfung & Excel-Konvertierung“; Dateiname der Spec und Adresse `/xml-pruefung` bleiben | Titel beschreibt das neue Ergebnis; Verweise bleiben gültig | 2026-11-26 |
| Lange Codes in der Zusammenfassung nach Bindestrichen umbrechen, rein per CSS (kein eingefügtes Zeichen) — bereits umgesetzt | Umbruch mitten in Codegruppen (z. B. `0000` / `1`) ist schwer lesbar; Wunsch Product Owner: nur CSS | 2026-11-16 |
| Menüpunkt und Seitenüberschrift heißen „Werkzeug“ statt „XML prüfen“ | Wunsch Product Owner | 2026-11-22 |
| ~~CSV des Werkzeugs mit 28 Spalten (ohne `dmc` und Informationsfelder) statt 37~~ — überholt durch Refinement 3 (2026-11-26) | BUG-QA13-1: leere Informationsfelder einer Empfänger-XML würden beim Check-in gespeicherte Werte leeren; mit 28 Spalten bleiben sie über die bestehende Check-in-Regel erhalten, ohne Änderung am Check-in. Alternativen verworfen: leere Werte beim Check-in nicht übernehmen (bewusstes Leeren unmöglich), eigener 29-Spalten-Aufbau mit `dmc` (vierte Dateifassung) | 2026-11-26 |
| ~~Kein zusätzlicher Hinweis im Werkzeug zur fehlenden `dmc`-Spalte~~ — überholt durch Refinement 3 | Der Check-in meldet „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten“; die Werkzeug-CSV ist Zwischenstand für den Check-in | 2026-11-26 |
| Adresse `/xml-pruefung` bleibt | Lesezeichen und Verweise bleiben gültig; die Adresse beschreibt weiterhin die Funktion | 2026-11-22 |
| Zeile über der Überschrift wechselt von „Werkzeug“ zu „XML prüfen“ | Vermeidet „Werkzeug“ doppelt; die Funktion bleibt auf der Seite benannt | 2026-11-22 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Serverfunktion; XSD über die bestehende Funktion aus PROJ-11 | xmllint ist bereits sicher angebunden (Host-/Origin-Schutz, Zeitlimit, keine externen Entities); alles Weitere geht im Browser | 2026-11-14 |
| Einlesen, Regelprüfung und CSV im Browser mit den Bausteinen von Check-in, REPLY und Check-out | Gleiche Regeln und gleiches CSV-Format wie der Check-in, an den die CSV später geht; kein doppelter Code | 2026-11-14 |
| Prüfkern als eigener Baustein ohne Bildschirmbezug | PROJ-21 nutzt denselben Kern und ergänzt nur den Abgleich mit einer DMRL | 2026-11-14 |
| Regeln einzeln aufrufen (A, B Check-in, C, E, I) statt der Sammelprüfung | Die Sammelprüfung enthält Regel D (MI des Systems), die im Werkzeug ohne System nicht anwendbar ist | 2026-11-14 |
| „MI einheitlich“: häufigster MI ist der Datei-MI, Abweichungen als Befund in der bestehenden Gruppe „Model Ident Code“ | Benennt die wenigen abweichenden Einträge statt aller; keine neue Regelgruppe im Prüfbericht nötig | 2026-11-14 |
| Ergebnis nur im Arbeitsspeicher der Seite, kein localStorage | Spec: nichts speichern; schont den Browser-Speicher (BUG-QA2-2) | 2026-11-14 |
| Laufende Prüfung über eine fortlaufende Prüfnummer verwerfen | Verhindert veraltete Ergebnisse bei neuer Datei, Issue-Wechsel oder Verlassen der Seite | 2026-11-14 |
| Eigene Adresse /xml-pruefung, nur Anmeldesperre, keine DMRL-Berechtigung | Werkzeug liest und ändert keine Systemdaten (Spec) | 2026-11-14 |
| Keine neuen Pakete | Alle benötigten Bausteine sind vorhanden | 2026-11-14 |
| Ausgabedaten optional über die bestehende REPLY-Variante der Pflichtfeldregel; Sammelhinweis im Prüfkern | Keine neue Regel, gleiche Meldungen wie beim REPLY-Import; ein Hinweis statt 5 Fehler je Eintrag | 2026-11-16 |
| Neuer Grund „Zugriff abgelehnt“; „nicht erreichbar“ nur für „Server läuft nicht“; sonstige Fehlerantworten als „unerwartet“ | Jede Meldung führt zu genau einer Handlung (neu starten / über localhost öffnen); Unterscheidung im Browser möglich, Serverfunktion bleibt unverändert | 2026-11-16 |
| Port in der Meldung „Zugriff abgelehnt“ aus der aktuellen Seite | Funktioniert für Startskript (8877) und Entwicklungsserver (3000) gleichermaßen | 2026-11-16 |
| Ergänzung als eigener Schritt nach der Regelprüfung, CSV aus ergänzter Kopie; Originaleinträge bleiben im Ergebnis | Bericht und Zusammenfassung zeigen den echten Zustand der Datei; nur die CSV erhält Standardwerte (Spec Refinement 2) | 2026-11-16 |
| Prüfdatum einmal je Prüfung (lokales Datum), für Tests vorgebbar | Einheitliches Datum für alle Einträge, unabhängig vom Download-Zeitpunkt; Tests unabhängig vom Kalendertag | 2026-11-16 |
| Zwei getrennte Hinweise (ergänzt / nicht ergänzt) statt eines gemeinsamen | Jeder Hinweis führt zu einer klaren Aussage: „erledigt“ bzw. „beim Check-in Pflicht“ | 2026-11-16 |
| Keine Änderung an Check-in, Regeln, CSV-Schreiber und Seite | Ergänztes `n` passt zu Regel F (neue Einträge), `001`/`new` zu Regel A; Änderung bleibt auf den Prüfkern beschränkt | 2026-11-16 |
| „Erneut prüfen“ behält das bisherige Ergebnis bis zum neuen | Kein leerer Bildschirm bei erneutem Ausfall; gleiche Logik gegen veraltete Ergebnisse wie „Prüfen“ | 2026-11-16 |
| Ableitung als eine feste Zuordnungstabelle im Schritt „Ausgabedaten ergänzen“, nicht in Lesern oder Regelwerk | Eine Stelle für alle drei Issues (Leser liefern schon einheitliche Felder); Check-in und REPLY bleiben unberührt (Spec Refinement 3) | 2026-11-16 |
| Unbekannter Eintragstyp → Ausgabetyp `new`, Eintragstyp unverändert | Vorhandene Werte nie überschreiben; der Tippfehler wird über Regel A ohnehin als Fehler gemeldet | 2026-11-16 |
| Kennzeichen „DM gelöscht“ bei abgeleitetem `deleted` nach dem Check-in bleibt unverändert | Fachlich konsistent (Eintragstyp `d`); kein Sonderfall in der DMRL-Ansicht nötig | 2026-11-16 |
| Werkzeug-Excel über den bestehenden Baustein „Einträge als Excel“ (Check-out/Export) statt eigenem Schreiber | Aufbau ist dadurch garantiert identisch mit dem Check-out (Spalten, Text-Zellen, Blattname, Sortierung); kein doppelter Code | 2026-11-26 |
| Excel-Datei beim Prüfen erzeugen, nicht erst beim Klick | Gleicher Ablauf wie bisher mit der CSV; fester Inhalt und Prüfdatum; Tests lesen die Datei direkt aus dem Ergebnis | 2026-11-26 |
| Spaltenauswahl „ohne Informationsfelder“ im CSV-Schreiber entfernen | Einziger Nutzer war das Werkzeug (Refinement 2); kein toter Code | 2026-11-26 |
| Check-in (PROJ-10) bleibt unverändert | Die Werkzeug-Excel entspricht einer Check-out-Datei; das Leeren der Informationsfelder ist gewollt (Product Decision 2026-11-26) | 2026-11-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Überblick
PROJ-20 ist ein **reines Browser-Werkzeug mit einer bestehenden Serverhilfe**: Das Einzige, was den Server braucht, ist die XSD-Prüfung (xmllint) — dafür wird die vorhandene Serverfunktion aus PROJ-11 unverändert genutzt, inklusive Host-/Origin-Schutz. Alles andere (Einlesen, Regelprüfung, CSV erzeugen) läuft im Browser mit den Bausteinen, die Check-in, REPLY und Check-out schon verwenden. **Es entsteht keine neue Serverfunktion und kein neuer Speicher.**

Der Prüf- und Konvertierungskern wird als eigener, wiederverwendbarer Baustein gebaut, damit PROJ-21 („XML gegen DMRL prüfen“) ihn später nur um den Abgleich mit einer DMRL ergänzen muss.

### B) Seitenstruktur
```
Kopfzeile (bestehend)
+-- Menüpunkt „Werkzeug“ (neben „Dashboard“, für alle angemeldeten Benutzer; bis 2026-11-22 „XML prüfen“)

Seite „Werkzeug“ (Adresse /xml-pruefung, nur nach Anmeldung; Zeile über der Überschrift: „XML prüfen“)
+-- Kopf: Titel + kurze Erklärung („Nichts wird gespeichert“)
+-- Auswahlkarte
|   +-- S1000D-Issue (Auswahl 2.3 / 4.2 / 5.0, anfangs leer)
|   +-- XML-Datei (Dateiauswahl, .xml, höchstens 5 MB)
|   +-- Hinweis „Bitte zuerst die Issue wählen“ (solange keine Issue gewählt)
|   +-- Schaltfläche „Prüfen“ (aus, solange Issue oder Datei fehlt / Prüfung läuft)
+-- Fortschrittsanzeige („Prüfe Schema …“, „Prüfe Regeln …“)
+-- Ergebnisbereich (nur nach einer Prüfung)
    +-- Zusammenfassung (Kopfdaten der Datei)
    |   +-- Dateiname, Issue, Richtung, DML-Code, Ausgabestand, Datum,
    |   |   Sicherheitseinstufung, Bezugs-DMRL
    |   +-- MI (oder „uneinheitlich“), Anzahl Einträge
    |   +-- Antworten: freigegeben / zu überarbeiten / ohne Antwort
    |   +-- Gesamtergebnis „Keine Fehler“ bzw. „N Fehler, M Hinweise“
    +-- Hinweisbox „XSD-Prüfung nicht durchgeführt“ (nur wenn xmllint fehlt)
    +-- Prüfbericht (bestehende Anzeige aus PROJ-8/10, gruppiert nach XSD und Regeln)
    +-- Downloads
        +-- „CSV herunterladen“ (nur bei lesbarer Datei)
        +-- Warnhinweis an der Schaltfläche, wenn der Bericht Fehler enthält
        +-- „Prüfbericht herunterladen“ (immer)
```
Die Seite wird aus vorhandenen shadcn/ui-Bausteinen zusammengesetzt (Card, Select, Input, Button, Alert, Badge). Der Prüfbericht ist die bestehende Komponente aus dem Check-in, damit Darstellung, Seitenweise-Anzeige (100 Befunde) und Download identisch sind.

### C) Ablauf der Prüfung
```
Datei + Issue
   │
   ├─ 1. Dateiannahme (bestehend): Endung .xml, höchstens 5 MB, nicht leer
   │
   ├─ 2. XSD-Prüfung über die Serverfunktion (PROJ-11)
   │      gültig ............ weiter
   │      Schemafehler ...... Befunde merken, weiter
   │      nicht wohlgeformt . Bericht, ENDE (keine CSV)
   │      nicht verfügbar ... Hinweis merken, weiter
   │
   ├─ 3. Datei als Text lesen — in der Kodierung laut XML-Deklaration
   │      (UTF-8 / UTF-16 / ISO-8859-1, bestehender Baustein aus PROJ-13)
   │
   ├─ 4. Einlesen mit dem Leser der gewählten Issue (bestehend)
   │      nicht lesbar ...... Meldung „Datei passt nicht zur gewählten
   │                          Issue — bitte Issue prüfen“, ENDE (keine CSV)
   │
   ├─ 5. Regelprüfung wie Check-in: A, B (Check-in-Pflichtfelder), C, E, I
   │      + neue Prüfung „MI einheitlich in der Datei“ statt Regel D
   │
   └─ 6. Ergebnis: Zusammenfassung + Bericht (XSD- und Regelbefunde) + CSV
```
- **Nicht wohlgeformt, wenn xmllint fehlt:** Der Leser im Browser erkennt das ebenfalls; die Datei gilt dann als nicht lesbar → keine CSV.
- **Externe Verweise/Entities** werden weder vom Server (PROJ-11) noch vom Browser-Leser nachgeladen.
- **Veraltete Ergebnisse:** Jede Prüfung bekommt eine laufende Nummer. Wird eine neue Datei gewählt, die Issue geändert oder die Seite verlassen, wird die laufende Prüfung verworfen und ihr Ergebnis nicht mehr angezeigt.

### D) Datenmodell (nur im Arbeitsspeicher der Seite)
Ein Prüfergebnis besteht aus:
- Dateiname und gewählte Issue
- Kopfdaten der Datei (Richtung, DML-Code, Ausgabestand, Datum, Sicherheitseinstufung, Bezugs-DMRL) — leer, wenn nicht lesbar
- Liste der Einträge mit allen 27 Feldern, wie aus der XML gelesen (inkl. Eintragstyp, Antwort, Begründung)
- Prüfbericht (gemeinsames Format aller Prüfungen: Schwere, Regelgruppe, Eintrag/Zeile, DMC, Feld, Meldung)
- Zustand der XSD-Prüfung (bestanden / Schemafehler / nicht durchgeführt)
- Kennzahlen: MI oder „uneinheitlich“, Anzahl Einträge, Antworten je Art

**Gespeichert wird nichts:** kein localStorage, kein Archiv, kein Verlauf, keine Sperre. Das Werkzeug liest auch keine Daten aus dem Datenbestand. Beim Verlassen oder Neuladen ist das Ergebnis weg.

### E) Neue und wiederverwendete Bausteine
| Baustein | Neu / bestehend | Zweck |
|---|---|---|
| XSD-Serverfunktion (PROJ-11) | bestehend, unverändert | Schema-Prüfung je Issue |
| XSD-Aufruf und Umwandlung in Prüfbericht | bestehend | gleiche Meldungen wie bei SEND/REPLY |
| Dateiannahme XML (5 MB) und Lesen in der deklarierten Kodierung | bestehend (PROJ-11/13) | Kodierung UTF-8/UTF-16/ISO-8859-1 |
| DML-Leser je Issue | bestehend | Kopf und Einträge lesen |
| Regeln A, B, C, E, I | bestehend (PROJ-8) | einzeln aufgerufen, ohne Regel D (MI des Systems) und ohne Regel F/K (brauchen eine DMRL) |
| **Prüfung „MI einheitlich“** | **neu** | häufigster MI gilt als Datei-MI; jeder abweichende Eintrag erhält einen Befund in Gruppe „Model Ident Code“ mit Meldung „MI uneinheitlich“ |
| **Prüfkern „XML prüfen“** | **neu** | verbindet die Schritte aus C) zu einem Ergebnis; ohne Bildschirmbezug, damit PROJ-21 ihn nutzen kann |
| CSV-Schreiber (27 Spalten, BOM, nach DMC sortiert, Formelschutz) | bestehend (PROJ-9) | CSV im Check-out-Format |
| Prüfbericht-Anzeige und -Download | bestehend (PROJ-8/10) | identische Darstellung |
| **Seite „XML prüfen“ + Menüpunkt** | **neu** | Bedienoberfläche |

Der Dateiname der CSV ist der Name der XML-Datei mit Endung `.csv`; der Prüfbericht heißt wie bei den anderen Prüfungen (Präfix + Dateiname + Zeitstempel).

### F) Berechtigungen
- Nur angemeldete Benutzer (bestehende Anmeldesperre wie bei allen Seiten); ohne Anmeldung erscheint die Anmeldeseite.
- **Keine DMRL-Berechtigung nötig**, weil das Werkzeug keine Daten des Systems liest oder ändert. Ein Benutzerwechsel in der Kopfzeile lässt die Seite offen.

### G) Leistung
- Eine 5-MB-Datei: XSD-Prüfung auf dem Server (Zeitlimit wie PROJ-11), Einlesen und Regelprüfung im Browser in wenigen Sekunden — die Regeln sind dieselben, die beim Check-in schon große Dateien prüfen.
- Der Browser-Speicher (BUG-QA2-2) ist nicht betroffen, weil nichts gespeichert wird.

### H) Tests (für /frontend und /qa)
- Unit-Tests für den Prüfkern: jede Stufe aus C) einzeln (gültig, Schemafehler, nicht wohlgeformt, XSD nicht verfügbar, falsche Issue, MI uneinheitlich, Antworten-Zählung) mit simulierter Serverantwort.
- Rundlauf-Test: konvertierte CSV einer fehlerfreien Demo-XML besteht die Check-in-Regelprüfung.
- Komponententest der Seite; E2E-Tests mit echter Serverfunktion für die Hauptfälle und die drei Bildschirmbreiten.

### I) Abhängigkeiten (Pakete)
Keine neuen Pakete. Genutzt werden die vorhandenen (papaparse für die CSV, zod für die Serverantwort, shadcn/ui-Komponenten).

### J) Ergänzung Refinement 2026-11-16

**1. Ausgabedaten optional (nur im Werkzeug)**
- Die Pflichtfeldprüfung im Werkzeug nutzt die bestehende **REPLY-Variante** der Regel B (PROJ-8): Ausgabenummer, Ausgabetyp und Datum dürfen fehlen; ein angefangenes Datum muss vollständig sein („Ausgabedatum ist unvollständig“). Keine neue Regel, kein neuer Regeltext.
- Neu im Prüfkern: **ein Sammelhinweis** (Art *Hinweis*, Gruppe Pflichtfelder, ohne Zeilenbezug): „Bei N Einträgen fehlen Ausgabedaten (Ausgabenummer, Ausgabetyp, Datum) — beim Check-in sind sie Pflicht.“ Gezählt werden Einträge, bei denen mindestens eines der fünf Felder leer ist. Kein Hinweis, wenn alle vollständig sind.
- Da es ein Hinweis und kein Fehler ist: Gesamtergebnis „0 Fehler, 1 Hinweis“, CSV **ohne** Warnung.
- Check-in (PROJ-10) und REPLY-Import (PROJ-13) bleiben unverändert.

**2. Ursache, wenn die XSD-Prüfung nicht erreichbar ist (gemeinsamer Baustein PROJ-11, Browser-Seite)**

| Situation | Erkennung im Browser | Meldung (Detail) |
|---|---|---|
| Server beendet, Tab noch offen | Anfrage kommt gar nicht an | „Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).“ |
| App über fremde Adresse geöffnet | Serverfunktion lehnt ab (Schutz BUG-QA2-3) | „Zugriff abgelehnt — bitte die Anwendung über http://localhost:<Port> öffnen.“ (Port der aktuellen Seite) |
| Server antwortet mit anderem Fehler | sonstige Fehlerantwort | „Die Prüffunktion hat unerwartet geantwortet.“ (bisher fälschlich „nicht erreichbar“) |
| xmllint fehlt / Schema fehlt / Zeitlimit | wie bisher | wie bisher |

- Neuer Grund **„Zugriff abgelehnt“** in der Liste der Gründe „nicht verfügbar“; „nicht erreichbar“ bedeutet künftig nur noch „Server läuft nicht“.
- **Serverfunktion unverändert** (sie antwortet bei fremder Adresse schon heute mit „nicht erlaubt“); kein Backend-Schritt nötig.
- Wirkung überall, wo die Meldung angezeigt wird: Werkzeug „XML prüfen“, REPLY-Import, SEND, DMRL-Export (Hinweisfenster). REPLY und SEND haben bereits „Erneut versuchen“.

**3. „Erneut prüfen“ im Werkzeug**
```
Hinweis „XSD-Prüfung nicht durchgeführt“
+-- Ursache mit Handlungsanweisung (siehe 2.)
+-- Schaltfläche „Erneut prüfen“ (Ladeanzeige während der Prüfung)
```
- Wiederholt die Prüfung derselben Datei mit derselben Issue (gleicher Ablauf wie „Prüfen“, gleiche Prüfnummer-Logik gegen veraltete Ergebnisse).
- Während der Wiederholung bleibt das bisherige Ergebnis sichtbar; erst das neue Ergebnis ersetzt es. Wechsel von Datei oder Issue verwirft die Wiederholung wie bisher.

**4. Umbruch der Codes** — bereits umgesetzt (2026-11-16, nur CSS).

**Betroffene Tests (für /frontend und /qa):** Erwartungen „Pflichtfeld-Fehler bei Demo-Dateien ohne Ausgabedaten“ werden zu „Sammelhinweis, keine Fehler“ (Prüfkern-, QA-, Komponenten- und E2E-Tests von PROJ-20); XSD-Client-Test „Fehlerantwort 404 → nicht erreichbar“ wird „unerwartet“; neu: Zugriff abgelehnt (Antwort „nicht erlaubt“) und Server beendet (Anfrage scheitert) im Client sowie „Erneut prüfen“ im Werkzeug und im echten Browser (Server-Ausfall per abgefangener Anfrage nachgestellt).

**Abhängigkeiten:** keine neuen Pakete.

### K) Ergänzung Refinement 2 (2026-11-16): fehlende Ausgabedaten in der CSV ergänzen

**Überblick:** Reine Erweiterung des Prüfkerns im Browser. Keine neue Seite, keine Serverfunktion, kein Speicher, keine neuen Pakete. Die Bedienoberfläche bleibt gleich. Neu sind nur der Hinweistext und der Inhalt der CSV.

**Ablauf (Ergänzung zu C)**
```
… 5. Regelprüfung auf den ORIGINALDATEN (unverändert)
   │
   ├─ 5a. NEU: Ausgabedaten ergänzen — nur für die CSV
   │       je Eintrag: fehlt issno ganz (Ausgabenummer UND Ausgabetyp leer)?
   │         ja  → Kopie des Eintrags mit
   │                 Ausgabenummer 001, Ausgabetyp new,
   │                 Datum der Prüfung (nur wenn Tag/Monat/Jahr alle leer),
   │                 Eintragstyp n (nur wenn leer)
   │         nein → Eintrag unverändert (auch bei Teildaten)
   │
   └─ 6. Ergebnis: Zusammenfassung + Bericht aus den Originaldaten,
          CSV aus den ergänzten Einträgen
```

**Datenmodell (Ergänzung zu D)**
- Das Prüfergebnis enthält weiterhin die **Originaleinträge** (Grundlage für Bericht, Zusammenfassung und Antwortzählung).
- Neu: **Anzahl ergänzter Einträge** und das verwendete **Prüfdatum** (TT, MM, JJJJ). Beides speist den Hinweistext.
- Die CSV wird aus einer **ergänzten Kopie** der Einträge geschrieben. Die Originaleinträge bleiben unverändert.

**Hinweise im Prüfbericht (ersetzt den Sammelhinweis aus J.1)**
| Fall | Hinweis (Art *Hinweis*, Gruppe Pflichtfelder) |
|---|---|
| mind. ein Eintrag ergänzt | „Bei N Einträgen fehlten Ausgabedaten — in der CSV ergänzt: Ausgabenummer 001, Ausgabetyp new, Datum TT.MM.JJJJ, Eintragstyp n (nur wo leer).“ |
| mind. ein Eintrag mit Lücken, die **nicht** ergänzt wurden (Teildaten, oder nur Datum fehlt) | bisheriger Sammelhinweis „Bei N Einträgen fehlen Ausgabedaten … beim Check-in sind sie Pflicht.“ — gezählt werden nur diese Einträge |
| beides | beide Hinweise |
| keine Lücken | kein Hinweis |

Einzahl/Mehrzahl wie bisher. Beides sind Hinweise und keine Fehler, deshalb ändert sich das Gesamtergebnis nicht: Die CSV bleibt ohne Fehlerwarnung, sofern keine anderen Fehler vorliegen.

**Prüfdatum**
- Es gilt das lokale Datum des Rechners **zum Zeitpunkt der Prüfung**. Es wird einmal je Prüfung festgelegt, sodass alle Einträge dasselbe Datum bekommen. Ein späterer Download, auch nach Mitternacht, ändert es nicht. „Erneut prüfen“ nimmt das neue Tagesdatum.
- Für Tests kann das Datum fest vorgegeben werden. So bleiben die Tests unabhängig vom Kalendertag.

**Zusammenspiel mit dem Check-in (PROJ-10, unverändert)**
- Ergänzte Einträge haben die Pflicht-Ausgabedaten. `001` und `new` erfüllen die Formatregel A.
- Regel F verlangt für **neue** Einträge den Eintragstyp `n`. Das ergänzte `n` erfüllt diese Regel. Ein vorhandenes `c`/`d` bleibt stehen und wird vom Check-in wie bisher bewertet.
- Gibt es den Eintrag in der Ziel-DMRL schon mit anderen Ausgabedaten, meldet der Check-in das wie jede andere Änderung. Das ist gewollt, denn der Bearbeiter sieht die Abweichung.

**Bausteine**
| Baustein | Neu / bestehend | Änderung |
|---|---|---|
| Prüfkern „XML prüfen“ | bestehend | neuer Schritt 5a; CSV aus ergänzter Kopie; Hinweise nach obiger Tabelle |
| „Ausgabedaten ergänzen“ | **neu** (im Prüfkern) | reine Umwandlung Eintrag → Eintrag, ohne Bildschirmbezug |
| CSV-Schreiber (PROJ-9) | bestehend, unverändert | — |
| Pflichtfeldregel REPLY-Variante (PROJ-8) | bestehend, unverändert | — |
| Seite „XML prüfen“ | bestehend, unverändert | zeigt die neuen Hinweise über den bestehenden Prüfbericht |
| Check-in, REPLY-Import | unverändert | — |

**Tests (für /frontend und /qa)**
- Prüfkern: issno fehlt ganz → `001`/`new`/Prüfdatum/`n` in der CSV, Bericht unverändert auf Originaldaten. Vorhandenes Datum bleibt. Vorhandenes `c`/`d` bleibt. Teildaten oder nur fehlendes Datum → keine Ergänzung und alter Hinweis. Mischfall → beide Hinweise. Unvollständiges Datum ohne issno → issno/type ergänzt, Datum nicht, Fehler bleibt.
- Rundlauf: Demo-REPLY ohne Ausgabedaten → CSV → Check-in-Regelprüfung ohne Pflichtfeld-Fehler zu den Ausgabedaten.
- Angepasste Erwartungen: bestehende Tests mit dem Sammelhinweis für Demo-Dateien ohne Ausgabedaten (Prüfkern-, QA-, Komponenten- und E2E-Tests von PROJ-20).
- E2E: CSV-Download einer Datei ohne Ausgabedaten enthält die Standardwerte und das Tagesdatum.

**Abhängigkeiten:** keine neuen Pakete.

### L) Ergänzung Refinement 3 (2026-11-16): Ausgabetyp aus dem Eintragstyp ableiten

**Überblick:** Kleine Änderung an genau einem Baustein, dem Schritt „Ausgabedaten ergänzen“ (5a aus K) im Prüfkern. Es gibt keine neue Seite, keine Serverfunktion, keinen Speicher und keine neuen Pakete. Bedienoberfläche, Prüfbericht-Darstellung und CSV-Aufbau bleiben gleich. Neu sind nur der **Auslöser**, der **Wert des Ausgabetyps** und der **Hinweistext**.

**Ablauf (ersetzt 5a aus K)**
```
5a. Ausgabedaten ergänzen — nur für die CSV, je Eintrag:
    Ausgabetyp (issno/@type) leer?
      nein → Eintrag unverändert
             (fehlen Ausgabenummer oder Datum → zählt zum Sammelhinweis „beim Check-in Pflicht“)
      ja   → Kopie des Eintrags mit
               Ausgabetyp  = abgeleitet aus dem Eintragstyp (Tabelle unten)
               Eintragstyp = n            (nur wenn leer)
               Ausgabenummer = 001        (nur wenn leer)
               Datum = Prüfdatum          (nur wenn Tag/Monat/Jahr alle leer)
```

**Ableitungstabelle (eine feste Zuordnung im Prüfkern)**
| Eintragstyp | Ausgabetyp in der CSV |
|---|---|
| `n` | `new` |
| `c` | `changed` |
| `d` | `deleted` |
| leer | `new` (Eintragstyp wird `n`) |
| anderer Wert (Tippfehler) | `new`; Eintragstyp bleibt, Regel A meldet den Fehler wie bisher |

Issue 4.2/5.0: Der Leser legt `dmlEntry/@issueType` und `dmlEntry/@dmlEntryType` schon heute in dieselben Felder (Ausgabetyp, Eintragstyp) ab. Deshalb gilt die Tabelle ohne Zusatzaufwand für alle drei Issues.

**Datenmodell:** unverändert gegenüber K. Das Prüfergebnis enthält die Originaleinträge, die Anzahl ergänzter Einträge und das Prüfdatum. Die CSV kommt aus der ergänzten Kopie. Gezählt wird künftig jeder Eintrag mit leerem Ausgabetyp.

**Hinweise im Prüfbericht (ersetzt die Tabelle aus K)**
| Fall | Hinweis (Art *Hinweis*, Gruppe Pflichtfelder) |
|---|---|
| mind. ein Eintrag mit leerem Ausgabetyp | „Bei N Einträgen fehlten Ausgabedaten — in der CSV ergänzt: Ausgabetyp aus dem Eintragstyp (n → new, c → changed, d → deleted; ohne Eintragstyp new und Eintragstyp n), Ausgabenummer 001 und Datum TT.MM.JJJJ (nur wo leer).“ |
| mind. ein Eintrag mit vorhandenem Ausgabetyp, aber fehlender Ausgabenummer oder fehlendem Datum | Sammelhinweis wie bisher „Bei N Einträgen fehlen Ausgabedaten … beim Check-in sind sie Pflicht.“ — nur diese Einträge |
| beides / keine Lücken | beide Hinweise / kein Hinweis (wie K) |

Einzahl/Mehrzahl wie bisher. Beides bleiben Hinweise, das Gesamtergebnis und die CSV-Warnung ändern sich nicht.

**Zusammenspiel mit dem Check-in (PROJ-10, unverändert)**
- `changed` und `deleted` erfüllen Formatregel A. Eine Regel, die Eintragstyp und Ausgabetyp gegeneinander prüft, gibt es nicht, also entsteht kein neuer Fehler.
- Regel F verlangt `n` nur für neue Einträge. Ein abgeleitetes `changed`/`deleted` gehört immer zu einem vorhandenen `c`/`d`, das unverändert bleibt.
- **Sichtbare Folge:** Ein Eintrag mit Ausgabetyp `deleted` erhält nach dem Check-in in der DMRL-Ansicht das bestehende Kennzeichen „DM gelöscht“ (PROJ-7). Das ist fachlich gewollt (Eintragstyp `d` → Datenmodul gelöscht) und braucht keine Änderung.

**Bausteine**
| Baustein | Neu / bestehend | Änderung |
|---|---|---|
| „Ausgabedaten ergänzen“ (Prüfkern) | bestehend | Auslöser = leerer Ausgabetyp; Ausgabetyp per Ableitungstabelle; Ausgabenummer nur wenn leer |
| Hinweise zu Ausgabedaten (Prüfkern) | bestehend | neuer Hinweistext; Zählung nach neuem Auslöser |
| Leser 2.3/4.2/5.0, CSV-Schreiber, Regelwerk, Seite „XML prüfen“, Check-in, REPLY-Import | bestehend | keine |

**Tests (für /frontend und /qa)**
- Prüfkern, je Fall ein Test: `n` → `new`; `c` → `changed` (Eintragstyp bleibt `c`); `d` → `deleted` (bleibt `d`); leer → `new` + `n`; unbekannter Eintragstyp → `new`, Regel-A-Fehler bleibt.
- Vorhandene Ausgabenummer (z. B. `002`) mit leerem Ausgabetyp → `002` bleibt, Ausgabetyp abgeleitet, Prüfdatum ergänzt. Ein vorhandenes Datum bleibt.
- Ausgabetyp vorhanden, Ausgabenummer oder Datum fehlen → keine Ergänzung, Sammelhinweis zählt den Eintrag.
- Je ein Fall für Issue 4.2 und 5.0 (gleiche Ableitung über die jeweiligen Leser).
- Angepasste Erwartungen: Tests, die bisher `new` für `c`/`d`-Einträge erwarten, sowie Tests auf den alten Hinweistext (Prüfkern-, QA-, Komponenten- und E2E-Tests von PROJ-20).
- Rundlauf: konvertierte CSV mit `c`/`changed` und `d`/`deleted` → Check-in-Regelprüfung ohne Fehler zu den Ausgabedaten.

**Abhängigkeiten:** keine neuen Pakete.

### M) Ergänzung Refinement 2026-11-26 (3): MS-Excel mit 37 Spalten statt CSV

**Überblick:** Das Werkzeug tauscht nur das **Dateiformat** der konvertierten DMRL aus. Prüfung, Regelwerk, Ergänzung der Ausgabedaten, Zusammenfassung und Prüfbericht bleiben gleich. Es gibt keine neue Seite, keine Serverfunktion, keinen Speicher und keine neuen Pakete. Für die Excel-Datei nutzt das Werkzeug **denselben Baustein wie Check-out und Excel-Export**, „Einträge als Excel“ (PROJ-9/PROJ-18). Damit ist der Aufbau automatisch identisch mit dem Check-out: Blatt „Einträge“, 37 Spalten, Text-Zellen, fixierte Kopfzeile, Autofilter, DMC-Sortierung, `dmc` je Zeile gebildet.

**Seitenstruktur (Änderungen gegenüber B):**
```
Ergebnisbereich
+-- Zusammenfassung ............................ unverändert
+-- Hinweisbox(en) an der Download-Schaltfläche
|   +-- NEU immer: „Die Informationsfelder (orig bis io-pm) sind leer —
|   |              beim Check-in werden gespeicherte Werte der DMRL dadurch geleert.“
|   +-- bei Fehlern: „Die Excel-Datei enthält Fehler aus der Prüfung — …“  (Text angepasst)
|   +-- ohne XSD:   „Die XSD-Prüfung wurde nicht durchgeführt — …“         (unverändert)
+-- [Excel-Datei herunterladen] ................ ersetzt „CSV herunterladen“ (.xlsx)
+-- [Prüfbericht herunterladen] ................ unverändert (CSV)
+-- Prüfbericht ................................ Hinweistexte: „in der Excel-Datei“ statt „in der CSV“
```
Nicht lesbare Datei: „Keine Excel-Datei — die Datei kann nicht gelesen werden.“ (statt „Keine CSV …“).

**Ablauf (Änderung gegenüber C/K):**
```
… 5a. Ausgabedaten ergänzen (ergänzte Kopie)   unverändert
  6.  Ergebnis:
      - Excel-Datei aus der ergänzten Kopie        NEU (statt CSV mit 28 Spalten)
        über „Einträge als Excel“ mit allen 37 Spalten
      - Zusammenfassung + Bericht aus den Originaldaten   unverändert
```
Die Excel-Datei wird wie bisher die CSV **beim Prüfen** erzeugt, nicht erst beim Klick. Datum der Ergänzung und Inhalt stehen damit fest, und Tests können die Datei direkt aus dem Prüfergebnis lesen.

**Datenmodell (Prüfergebnis, nur im Arbeitsspeicher):**
- statt „CSV-Text“ nun „Excel-Datei (Bytes)“; leer, wenn die Datei nicht lesbar ist
- alles andere unverändert (Originaleinträge, Bericht, Anzahl ergänzter Einträge, Prüfdatum)
- Informationsfelder: Der XML-Leser liefert sie nicht, deshalb schreibt der Baustein sie leer. `dmc` wird aus den DMC-Teilen gebildet, `answer_timestamp` bleibt leer.

**Bausteine:**

| Baustein | Status | Änderung |
|---|---|---|
| „Einträge als Excel“ (PROJ-9/PROJ-18) | bestehend, unverändert | wird zusätzlich vom Werkzeug genutzt |
| Download unveränderter Bytes (PROJ-15) | bestehend, unverändert | Download der .xlsx mit Excel-Dateityp |
| Prüfkern „XML prüfen“ | bestehend | liefert Excel statt CSV; Dateiname `<XML-Name>.xlsx`; Texte „in der Excel-Datei“ |
| Werkzeug-Oberfläche | bestehend | Schaltfläche, Hinweistexte, neuer Dauerhinweis zu Informationsfeldern |
| Spaltenauswahl „ohne Informationsfelder“ im CSV-Schreiber (Refinement 2) | **entfällt** | einziger Nutzer war das Werkzeug; der Standard (37 Spalten) bleibt für alle anderen |
| Prüfbericht-CSV, Leser, Regelwerk, Check-in, REPLY, Check-out, Export | bestehend | keine |

**Check-in (PROJ-10):** Es ändert sich nichts. Der Check-in liest die Werkzeug-Excel wie eine Check-out-Datei: Die 37 Spalten werden erkannt, `dmc` wird verworfen, die leeren Informationsfelder werden übernommen. Die Zusammenfassung meldet „Informationsfelder bei N Einträgen aktualisiert“, sobald vorher Werte gespeichert waren. Ältere 28-Spalten-CSVs aus dem Werkzeug werden weiter angenommen.

**Tests (für /frontend und /qa):**
- Unit Prüfkern: Das Ergebnis enthält eine Excel-Datei. Sie wird mit dem Excel-Leser des Check-ins zurückgelesen und muss genau die 37 Spalten in Check-out-Reihenfolge haben, `dmc` gefüllt, Informationsfelder und `answer_timestamp` leer, ergänzte Ausgabedaten enthalten. Bei nicht lesbarer Datei gibt es keine Excel-Datei. Dateiname endet auf `.xlsx`.
- Rundlauf: Werkzeug-Excel → Check-in-Regelprüfung ohne Fehler (wie bisher mit der CSV), auch mit `c`/`changed`, `d`/`deleted` und ohne Ausgabedaten.
- BUG-QA13-1-Test umdrehen: Eine Werkzeug-Excel in eine DMRL mit gespeicherten Informationsfeldern einchecken → die Felder sind leer, und der Hinweis „Informationsfelder … aktualisiert“ erscheint.
- Komponente: Schaltfläche „Excel-Datei herunterladen“ vorhanden, keine „CSV herunterladen“ mehr; Dauerhinweis zu den Informationsfeldern sichtbar; Fehlerhinweis mit neuem Text.
- E2E (bestehende PROJ-20-Tests anpassen): Download heißt `<XML-Name>.xlsx`; Inhalt über den Excel-Leser prüfen statt als CSV-Text; Prüfbericht weiter als CSV. Issue-6.0-Test (PROJ-22) und UTF-16-Test (BUG-QA1-1) entsprechend.

**Abhängigkeiten (Pakete):** keine neuen.

### Implementierungsnotizen (Frontend, 2026-11-14)
- **Prüfkern** `src/lib/workflows/xml-check.ts` (ohne Bildschirmbezug, für PROJ-21 wiederverwendbar): Dateiannahme → XSD (bestehende Serverfunktion) → Lesen in deklarierter Kodierung → DML-Leser der gewählten Issue → Regeln A, B (Check-in), C, E, I + neue Prüfung „MI einheitlich“ (Gruppe „Model Ident Code“, häufigster MI gilt) → CSV mit dem bestehenden Check-out-Schreiber.
- **Nicht lesbar** (nicht wohlgeformt laut xmllint bzw. Browser-Leser, oder Leser der gewählten Issue scheitert): Befund in Gruppe „Dateistruktur“ mit „Datei passt nicht zur gewählten Issue — bitte Issue prüfen.“, keine CSV, Zusammenfassung ohne Kopfdaten.
- **XSD nicht verfügbar:** Hinweis-Befund „XSD-Prüfung nicht durchgeführt — …“ im Bericht, rote Hinweisbox auf der Seite, CSV mit eigener Warnung.
- **Seite** `/xml-pruefung` (`src/app/(app)/xml-pruefung/page.tsx`, Komponente `src/components/xml-check/xml-check-tool.tsx`), Menüpunkt „XML prüfen“ in der Kopfzeile neben „Dashboard“; Anmeldesperre über das bestehende Layout, keine DMRL-Berechtigung.
- **Prüfbericht:** gemeinsame Anzeige (PROJ-8); Spalte „Zeile / Eintrag“ (XSD-Befunde mit Dateizeile, Regelbefunde mit Eintragsposition), Anfangssortierung „nach Regel“ (XSD zuerst). `CheckReportView` dafür um zwei optionale Props erweitert (Text nach der Fehlerzahl, Anfangssortierung) — bestehende Aufrufer unverändert.
- **Veraltete Ergebnisse:** fortlaufende Prüfnummer; neue Datei, Issue-Wechsel oder Verlassen der Seite verwirft die laufende Prüfung. Datei- und Issue-Auswahl bleiben während der Prüfung bedienbar.
- **Dateinamen:** CSV = XML-Name mit `.csv`; Prüfbericht `Pruefbericht-XML-<XML-Name>-<Datum>.csv`.
- **Beobachtung:** Die Demo-SEND/REPLY-Dateien enthalten keine Ausgabedaten (`issno`, `type`, Datum) — nach Check-in-Regeln ergeben sich daher Pflichtfeld-Fehler (laut Spec gewollt, Edge Case „Empfänger-REPLY ohne Ausgabedaten“).
- **Tests:** 19 Unit-Tests Prüfkern (inkl. Rundlauf CSV → Check-in-Regelprüfung, ISO-8859-1, falsche Issue in beide Richtungen, 4.2-Beispiel mit uneinheitlichem MI), 6 Komponententests, 10 E2E-Tests mit echter XSD-Serverfunktion (Menüpunkt, REPLY-Konvertierung, ohne Anmeldung, ohne Berechtigung, nicht wohlgeformt, Schemafehler, falsche Issue, 375/768/1440 px, Neuladen).

### Implementierungsnotizen Refinement (Frontend, 2026-11-16)
- **Ausgabedaten optional:** `src/lib/workflows/xml-check.ts` nutzt die Pflichtfeldregel in der REPLY-Variante; neu `checkIssueDataHint` (ein Hinweis, Gruppe Pflichtfeld, Text `issueDataMissing(n)`, Einzahl/Mehrzahl). Datei TWLBORFLOS (115 Einträge): vorher 575 Fehler, jetzt 0 Fehler + 1 Hinweis (+ ggf. XSD-Hinweis).
- **XSD-Ursachen:** `src/lib/xsd/types.ts` neuer Grund `zugriff_abgelehnt`; `src/lib/xsd/client.ts`: Anfrage scheitert → „Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).“; Antwort 403 → „Zugriff abgelehnt — bitte die Anwendung über http://localhost:<Port der Seite> öffnen.“; sonstige Fehlerantwort → „Die Prüffunktion hat unerwartet geantwortet.“ Wirkt auch in REPLY-Import, SEND und DMRL-Export (gemeinsamer Text). Serverfunktion unverändert.
- **„Erneut prüfen“:** `src/components/xml-check/xml-check-tool.tsx` — Schaltfläche im Hinweis „XSD-Prüfung nicht durchgeführt“; während der Wiederholung bleibt das Ergebnis sichtbar (Ladeanzeige, „Prüfen“ gesperrt); Datei-/Issue-Wechsel verwirft die Wiederholung (Prüfnummer).
- **Umbruch:** `[overflow-wrap:anywhere]` statt `break-all` (bereits 213ad74).
- **Tests:** `npm test` 488/488 grün (neu: Teil-Ausgabedaten, Einzahl, Zugriff abgelehnt, 2 Komponententests „Erneut prüfen“; angepasst: 4 Tests mit alten Erwartungen). E2E: `PROJ-20-xml-pruefung.spec.ts` +3 (Sammelhinweis, Server läuft nicht + Erneut prüfen, Zugriff abgelehnt) — PROJ-20 gesamt 22/22, verwandte Features (PROJ-12/13/14/18, BUG-QA1-1) 11/11 grün.
- **Hinweis Umgebung:** Während der Tests hing der Entwicklungsserver beim Kompilieren (0 % CPU); Ursache war ein festgefahrener Turbopack-Zwischenspeicher `.next/dev`. Beiseitegelegt, danach lief alles normal — kein Fehler der App.

### Implementierungsnotizen Refinement 2 (Frontend, 2026-11-16) — Ausgabedaten ergänzen
- **Prüfkern** `src/lib/workflows/xml-check.ts`: neu `needsIssueData` (Auslöser: Ausgabenummer und Ausgabetyp leer), `fillIssueData` (Kopien mit `001`/`new`, Prüfdatum nur bei ganz leerem Datum, `n` nur bei leerem Eintragstyp; Originale unverändert), `toCheckDate` (lokales Datum TT/MM/JJJJ) und Hinweistext `issueDataFilled(n, datum)`. `checkIssueDataHint` liefert jetzt bis zu zwei Hinweise: „ergänzt“ und — nur für nicht ergänzte Einträge mit Lücken — den bisherigen Sammelhinweis.
- `checkXmlText` hat einen optionalen Parameter für das Prüfdatum (Standard: jetzt) und liefert zusätzlich `filledEntries` und `checkDate`. Die CSV wird aus den ergänzten Kopien geschrieben, Bericht und Zusammenfassung aus den Originaldaten. „Erneut prüfen“ nimmt das aktuelle Datum.
- Seite, CSV-Schreiber, Regeln, Check-in und REPLY-Import sind unverändert.
- **Tests:** `xml-check.test.ts` +7 (Prüfdatum, Ergänzung vollständig, vorhandenes Datum und `c`/`d` bleiben, Teildaten und Mischfall mit beiden Hinweisen, unvollständiges Datum, Originale unverändert, Rundlauf Check-in ohne Fehler); angepasst: Sammelhinweis-Erwartungen in `xml-check.test.ts`, `qa-proj20.test.ts` (Check-in-Strenge jetzt mit Teildaten belegt), Komponententest (Hinweis + Standardwerte in der CSV), E2E „Ausgabedaten fehlen“ (CSV enthält `001;new;<Tagesdatum>` in allen 32 Zeilen). `npm test` 504/504 grün, Lint ohne Fehler, Typprüfung grün.
- **E2E (Chromium, Playwright 1.65.1):** gesamte Suite 106/106 grün. Dabei behoben: Testablauf-Wettlauf nach der Anmeldung — die verzögerte Weiterleitung zum Dashboard überholte eine folgende Menü-Navigation (trat mit der schnelleren Playwright-Version regelmäßig auf). `tests/helpers.ts` (`loginAs`) und der Test „echt, ohne Abfangen: App über Netzwerkadresse“ warten jetzt die Weiterleitung ab. Kein Fehler der App.
- **Hinweis Umgebung:** Ein Homebrew-Update (simdjson 5.2.0) hatte Node 26.8.1 unbrauchbar gemacht; nach Neuinstallation läuft Node 26.13.1.

### Implementierungsnotizen Refinement 3 (Frontend, 2026-11-16) — Ausgabetyp aus dem Eintragstyp ableiten
- **Prüfkern** `src/lib/workflows/xml-check.ts`: `needsIssueData` löst jetzt bei leerem Ausgabetyp aus (unabhängig von `@issno`); neu `deriveIssueType` (feste Zuordnung `n`→`new`, `c`→`changed`, `d`→`deleted`, leer/unbekannt → `new`). `fillIssueData` setzt den abgeleiteten Ausgabetyp, `001` nur bei leerer Ausgabenummer, Prüfdatum nur bei ganz leerem Datum, `n` nur bei leerem Eintragstyp. Neuer Hinweistext `issueDataFilled` laut Spec; der Sammelhinweis zählt nur Einträge mit Ausgabetyp, aber fehlender Nummer/Datum.
- Leser, CSV-Schreiber, Regelwerk, Seite, Check-in und REPLY-Import unverändert.
- **Tests:** `xml-check.test.ts` +6 (Ableitungstabelle, je Eintragstyp inkl. unbekanntem Wert mit Regel-A-Fehler, vorhandene Nummer `002` mit/ohne Datum, Ausgabetyp vorhanden → Sammelhinweis, Issue 4.2, Rundlauf c/changed + d/deleted in den Check-in); `qa-proj20.test.ts` +1 (Issue 5.0). Angepasst: Hinweistext, `c`/`d`-Erwartungen, Teildaten-Fälle (`@issno` ohne Typ wird jetzt ergänzt), Komponententest (zusätzlich `d;…;001;deleted`), E2E „Ausgabedaten fehlen“ (Typ je Eintragstyp) und 4.2-Tests in `PROJ-20-qa-refinement2.spec.ts` (issueInfo ohne issueType wird jetzt ergänzt, Nummer und Datum bleiben). `npm test` 518/518 grün, Typprüfung und Lint ohne Fehler, E2E PROJ-20 31/31 grün.

### Implementierungsnotizen Refinement 2026-11-22 (Frontend) — Benennung „Werkzeug“
- Kopfzeile (`src/components/layout/app-header.tsx`): Menüpunkt „Werkzeug“ statt „XML prüfen“, Ziel weiterhin `/xml-pruefung`, aktiv markiert (`aria-current="page"`) wie bisher.
- Seite (`src/app/(app)/xml-pruefung/page.tsx`): Überschrift „Werkzeug.“, kleine Zeile darüber „XML prüfen“ (bisher umgekehrt); Erklärungstext und Werkzeug unverändert.
- E2E-Tests (`PROJ-20-xml-pruefung.spec.ts`, `PROJ-20-qa.spec.ts`, `PROJ-20-qa-refinement.spec.ts`) auf Menüpunkt/Überschrift „Werkzeug“ umgestellt; neuer Test „Benennung ‚Werkzeug‘“ prüft Menüpunkt, Überschrift, Zeile „XML prüfen“, Adresse und dass kein Menüpunkt „XML prüfen“ mehr existiert.
- Interne Bezeichner, Adresse und Code-Kommentare zur Funktion („Prüfkern ‚XML prüfen‘“) bleiben unverändert.

### Implementierungsnotizen Refinement 2026-11-26 (2) (Frontend) — CSV mit 28 Spalten
- `src/lib/files/csv-writer.ts` — Spaltenliste wählbar (Standard 37); neu `COLUMNS_WITHOUT_INFO_FIELDS` (die 28 Felder bis `remarks`).
- `src/lib/workflows/xml-check.ts` — CSV des Werkzeugs mit `COLUMNS_WITHOUT_INFO_FIELDS` → ohne `dmc` und Informationsfelder (BUG-QA13-1).
- Tests: `xml-check.test.ts` (28 Spalten); `qa-proj9-10-info.test.ts` (Check-in der Werkzeug-CSV erhält gespeicherte Informationsfelder, Hinweis im Prüfbericht); E2E `PROJ-20-qa-refinement2.spec.ts` neu „BUG-QA13-1“ und Rundlauf-Test erwartet jetzt den Hinweis „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten.“ statt „Keine Fehler und keine Hinweise.“
- Gesamt: 714 Unit-Tests und 164 E2E-Tests grün; Lint ohne Fehler.

### Bugfix BUG-QA1-1 (2026-11-15) — UTF-16-Dateien
- `declaredEncoding` (`src/lib/workflows/reply.ts`) erkennt UTF-16 jetzt am BOM (`FF FE` / `FE FF`) oder — ohne BOM — am Bytemuster von „<?“ (Little/Big Endian); sonst wie bisher die XML-Deklaration (Standard UTF-8). Gemeinsamer Baustein für REPLY-Import (PROJ-13) und „XML prüfen“ (PROJ-20).
- Archiv-Download (`archiveFileBytes`, PROJ-15): UTF-16-Stände werden wieder als UTF-16 LE mit BOM ausgegeben (byte-genau für die übliche LE-Datei mit BOM; bei BE oder fehlendem BOM als LE mit BOM).
- Tests: `reply.test.ts` (LE/BE, mit/ohne BOM), `archive.test.ts` (Rundlauf Download ↔ Lesen), `qa-proj20.test.ts` (UTF-16-Test aktiviert), E2E `PROJ-20-qa.spec.ts` „UTF-16-Datei“ mit echter xmllint-Prüfung; 483 Unit-Tests grün.

## QA Test Results

**Tested:** 2026-11-14
**App URL:** http://localhost:3000/xml-pruefung
**Tester:** QA Engineer (AI)
**Browser:** Chrome (Playwright, echte XSD-Serverfunktion mit xmllint). Firefox und Safari nicht installiert — nicht getestet.

### Automatische Tests
- `npm test`: 474/474 grün (davon 19 Prüfkern, 6 Komponente) + QA-Datei `src/lib/workflows/qa-proj20.test.ts`: 6 grün, 1 übersprungen (BUG-QA1-1)
- Playwright Gesamtlauf: 85/85 grün (16,5 min), darin 10 Tests `tests/PROJ-20-xml-pruefung.spec.ts`
- QA-E2E `tests/PROJ-20-qa.spec.ts`: 8/8 grün

### Acceptance Criteria Status
**Zugang**
- [x] Menüpunkt „XML prüfen“ für Bearbeiter und Administrator, führt zum Werkzeug
- [x] Ohne Anmeldung → Anmeldeseite
- [x] Bearbeiter ohne jede DMRL-Berechtigung kann das Werkzeug uneingeschränkt nutzen

**Auswahl und Prüfung**
- [x] Ohne Issue: „Prüfen“ gesperrt, Hinweis zur Auswahl
- [x] Datei > 5 MB, Nicht-XML und leere Datei mit verständlicher Meldung abgewiesen
- [x] Gültige Datei + passende Issue: Zusammenfassung, „Keine Fehler“, „CSV herunterladen“ (Rundlauf mit exportierter 4.2-XML)
- [x] Nicht wohlgeformt: Fehler mit Zeile, keine CSV
- [x] Schemafehler: XSD-Befunde mit Zeile, CSV mit Warnung
- [x] Andere Issue gewählt: „Datei passt nicht zur gewählten Issue“, keine CSV (2.3 ↔ 4.2 in beide Richtungen)
- [x] Regelverstöße (doppelter DMC, Pflichtfeld, Benennung, Infoname) je Eintrag, CSV mit Warnung und allen Einträgen
- [x] MI uneinheitlich: Befund je abweichendem Eintrag, Zusammenfassung „uneinheitlich“ (4.2-Beispiel S1000DBIKE)
- [x] XSD nicht verfügbar: Regelprüfung läuft, Hinweis „XSD-Prüfung nicht durchgeführt“, CSV mit Warnung

**Ergebnis und CSV**
- [x] Zusammenfassung mit Dateiname, Issue, Richtung, DML-Code, Ausgabestand, Datum, Sicherheitseinstufung, Bezugs-DMRL, MI, Einträgen und Antworten je Art
- [x] CSV im Check-out-Format (27 Spalten, Semikolon, UTF-8 mit BOM, nach DMC sortiert), Name = XML-Name mit `.csv`
- [x] Empfängerantworten in `answer`/`answer_comment` (30 freigegeben / 2 zu überarbeiten mit Begründung)
- [x] Formelschutz für `=`, `+`, `-`, `@`; der Check-in liest die Werte wieder unverändert
- [x] Rundlauf: fehlerfreie konvertierte CSV besteht die Check-in-Regelprüfung der ausgecheckten DMRL (E2E); mit Empfängerantworten meldet der Check-in sie als abweichende Antworten zur Übernahme (Unit)
- [x] „Prüfbericht herunterladen“ als CSV wie beim Check-in

**Keine Wirkung auf den Datenbestand**
- [x] Datenbestand vor/nach Prüfung und Download identisch (auch bei 5-MB-Datei); localStorage unberührt
- [x] Neuladen: Ergebnis ist weg

**Darstellung**
- [x] 375 / 768 / 1440 px mit Fehlerbericht ohne waagerechtes Scrollen

### Edge Cases Status
- [x] Falsche Issue gewählt → nicht lesbar, keine CSV
- [x] XML ohne Einträge (Schemafehler) → CSV nur mit Kopfzeile, Warnung
- [x] Empfänger-REPLY ohne Ausgabedaten → Pflichtfeld-Fehler genau für `issno`, `type`, `day`, `month`, `year` (Demo-Dateien) — *ab 2026-11-16 geändert: Sammelhinweis statt Fehler, siehe QA Refinement*
- [x] Keine DMRL-XML (anderes Wurzelelement) → „passt nicht zur gewählten Issue“, keine CSV
- [x] ISO-8859-1 laut Deklaration korrekt gelesen
- [x] **BUG-QA1-1:** UTF-16 laut Deklaration wird nicht gelesen → behoben und bestätigt (2026-11-15)
- [x] Externe Entities (XXE, `file:///etc/passwd`) nicht nachgeladen — kein Dateiinhalt in Seite oder CSV
- [x] Sehr viele Einträge: 5.400 Einträge / 4,82 MB in 1,0 s geprüft und konvertiert
- [x] Neue Datei während laufender Prüfung → altes Ergebnis verworfen (Komponententest)
- [x] Benutzerwechsel bei angezeigtem Ergebnis → Seite bleibt offen
- [x] Doppelter DMC → Regel C, CSV enthält beide Einträge

### Security Audit Results
- [x] Authentifizierung: Werkzeug nur nach Anmeldung erreichbar
- [x] Autorisierung: Werkzeug liest und schreibt keine Systemdaten — keine DMRL-Daten über das Werkzeug einsehbar
- [x] XSS: HTML in Feldwerten und im Dateinamen wird als Text angezeigt, nicht ausgeführt
- [x] XXE: externe Entities werden weder vom Browser-Leser noch von xmllint aufgelöst
- [x] CSV-Injection: Formelschutz greift
- [x] Serverfunktion: unverändert (Host-/Origin-Schutz, 5-MB-Grenze, Zeitlimit aus PROJ-11/BUG-QA2-3)
- [x] Keine Speicherung, keine Daten an Dritte

### Bugs Found

#### BUG-QA1-1: UTF-16-kodierte XML-Dateien werden nicht gelesen — behoben (2026-11-15)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Demo-REPLY als UTF-16 (mit BOM, `encoding="UTF-16"`) speichern
  2. „XML prüfen“ → Issue 2.3 → Datei → „Prüfen“
  3. Expected: Datei wird gelesen und geprüft (Spec, Edge Case „Kodierung“)
  4. Actual: „Die Datei kann nicht geprüft werden — Die Datei kann nicht in der angegebenen Kodierung (utf-8) gelesen werden.“ Ohne BOM wird Zeichensalat gelesen → „Datei passt nicht zur gewählten Issue“.
- **Ursache:** Die gemeinsame Kodierungserkennung (`declaredEncoding` in `src/lib/workflows/reply.ts`) liest den Dateianfang als Latin-1; bei UTF-16 verhindern die Nullbytes den Treffer der Deklaration, es wird UTF-8 angenommen. BOM wird nicht ausgewertet.
- **Betrifft auch:** REPLY-Import (PROJ-13), gleicher Baustein.
- **Workaround:** Datei als UTF-8 speichern.
- **Priority:** Fix in next sprint (UTF-16-DMRLs sind selten)

### Beobachtungen (kein Bug)
- Der Prüfbericht hat zwei gleichwertige Download-Schaltflächen („Prüfbericht herunterladen“ im Bereich Herunterladen, „Bericht herunterladen“ über der Tabelle) — beide liefern dieselbe Datei.
- Demo-Dateien enthalten keine Ausgabedaten; als Demo für „fehlerfreie Konvertierung“ eignet sich der XML-Export einer DMRL (PROJ-18).

### Summary
- **Acceptance Criteria:** 22/22 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Pass
- **Production Ready:** YES
- **Recommendation:** Freigeben; BUG-QA1-1 gemeinsam für PROJ-13/PROJ-20 beheben

### Erneuter QA-Test BUG-QA1-1 (2026-11-15)
**Ergebnis: behoben — bestätigt.**
- REPLY-Import (PROJ-13) mit UTF-16 LE mit BOM: XSD + Regelwerk bestanden, Übernahme (30 freigegeben / 2 zu überarbeiten), Archivtext korrekt; Archiv-Download (PROJ-15) byte-genau gleich der hochgeladenen Datei.
- REPLY-Import mit UTF-16 BE ohne BOM: gelesen, Abgleich REPLY ↔ SEND besteht (Umlaute in „Fähigkeitsträger…“ korrekt), übernommen.
- „XML prüfen“ (PROJ-20): UTF-16 LE mit/ohne BOM und BE mit BOM gelesen, Zusammenfassung 30/2, CSV in UTF-8 mit BOM.
- xmllint (Serverfunktion) akzeptiert UTF-16 LE/BE auch ohne BOM.
- Regression: UTF-8 mit BOM und ISO-8859-1 unverändert; Download der Demo-Archivdateien weiterhin byte-genau.
- Tests: `npm test` 483/483 grün (UTF-16-QA-Test aktiviert); E2E vollständig 98/98 grün (Chromium, neu: `tests/BUG-QA1-1-utf16.spec.ts`, 4 Tests). Firefox/Safari nicht installiert, nicht getestet.
- Während des Tests: zwei Fehler in den Testdaten korrigiert (Gedankenstrich „–“ nicht in ISO-8859-1 darstellbar; geänderter techname verletzt korrekt die Regel REPLY ↔ SEND) — kein Fehler der App.
- **Neue Bugs:** keine
- **Production Ready:** YES

### QA Refinement 2026-11-16 (Ausgabedaten optional, Ursache „XSD nicht erreichbar“, „Erneut prüfen“, Umbruch)
**Tested:** 2026-11-16 · Chrome (Chromium); Firefox/Safari nicht installiert, nicht getestet

**Neue Akzeptanzkriterien: 7/7 passed**
- [x] DMRL-XML ohne Ausgabedaten → keine Pflichtfeld-Fehler, ein Sammelhinweis (Demo-REPLY: „Bei 32 Einträgen …“; Datei TWLBORFLOS: 575 Fehler → 0 Fehler)
- [x] Unvollständiges Ausgabedatum (z. B. nur Tag oder nur Jahr) → Fehler „Ausgabedatum ist unvollständig“
- [x] Server läuft nicht → Ursache „Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).“
- [x] Fremde Adresse → „Zugriff abgelehnt — bitte die Anwendung über http://localhost:<Port> öffnen.“ — **echt geprüft ohne Abfangen**: App über die Netzwerkadresse des Rechners geöffnet, die Serverfunktion lehnt ab, Meldung erscheint
- [x] „Erneut prüfen“ → dieselbe Datei/Issue vollständig geprüft, Ergebnis ersetzt; während der Wiederholung bleibt das Ergebnis sichtbar
- [x] Lange Codes brechen nach Bindestrichen um (nur CSS, keine eingefügten Zeichen)
- [x] Bestehendes Kriterium „375/768/1440 px ohne waagerechtes Scrollen“ auch mit Hinweis und „Erneut prüfen“

**Edge Cases (neu/geändert)**
- [x] Hinweis zählt nur Einträge mit Lücken; vollständige Einträge zählen nicht
- [x] Nur Ausgabenummer ohne Datum → kein Fehler; Formatfehler in Ausgabedaten (Ausgabenummer ‚1‘, Typ ungültig, 31.02.) bleiben Fehler (Regel A)
- [x] Check-in bleibt streng: CSV aus Datei ohne Ausgabedaten wird beim Check-in mit Pflichtfeld-Fehlern abgewiesen
- [x] „Erneut prüfen“ scheitert wieder → Hinweis bleibt (Ursache aktualisiert), Schaltfläche wieder nutzbar, genau eine weitere Anfrage
- [x] „Erneut prüfen“ liefert Schemafehler → Bericht mit XSD-Fehler und CSV-Warnung ersetzt das Ergebnis
- [x] Datei-/Issue-Wechsel während „Erneut prüfen“ → Wiederholung verworfen
- [x] Keine Schaltfläche „Erneut prüfen“, wenn die XSD-Prüfung durchgeführt wurde
- [x] Sonstige Fehlerantworten (500, kein JSON) → „Die Prüffunktion hat unerwartet geantwortet.“; 503 mit Grund → Grund der Serverfunktion

**Regression (gemeinsamer Baustein PROJ-11)**
- [x] REPLY-Import (PROJ-13): neue Meldung „Server läuft nicht“, „Erneut versuchen“ prüft danach regulär
- [x] DMRL-Export XML (PROJ-18): „Zugriff abgelehnt“ mit localhost-Adresse im Hinweis
- [x] SEND, Freigabe, Archiv unverändert (vollständiger E2E-Lauf)

**Security**
- [x] Host-/Origin-Schutz der Serverfunktion unverändert und echt bestätigt (Aufruf über Netzwerkadresse wird abgelehnt)
- [x] Adresse in der Meldung stammt nur aus dem Port der eigenen Seite, keine Benutzereingabe; keine neuen Daten an Dritte, nichts gespeichert

**Automatische Tests**
- `npm test`: 497/497 grün (neu: 6 QA-Tests in `qa-proj20.test.ts`, 3 Komponententests)
- E2E vollständig: 101/101 grün (16,5 min); neu `tests/PROJ-20-qa-refinement.spec.ts` (5 Tests), 3-fach parallel wiederholt: 15/15 grün

**Beobachtungen (kein Bug der App)**
- Der Entwicklungsserver (`npm run dev`, Turbopack) blieb während der QA zweimal hängen (Kompilieren ohne CPU-Last bzw. verwaister Server nach abgebrochenem Testlauf). Abhilfe: Server beenden und `.next/dev` löschen bzw. beiseitelegen. Betrifft nur die Entwicklungsumgebung, nicht den Start über das Startskript (Produktions-Build).
- Hinweis von Next.js beim Aufruf über die Netzwerkadresse („allowedDevOrigins“) — nur Entwicklungsserver, ohne Wirkung.

**Bugs Found:** keine
**Production Ready:** YES

### QA Refinement 2 2026-11-16 (fehlende Ausgabedaten in der CSV ergänzen)
**Tested:** 2026-11-16 · Chromium 1255 (Playwright 1.65.1), echte XSD-Serverfunktion mit xmllint · Firefox und WebKit (Safari, auch Projekt „Mobile Safari“) auf diesem Rechner nicht installiert — nicht getestet

**Neue/geänderte Akzeptanzkriterien: 6/6 passed**
- [x] DMRL-XML ohne Ausgabedaten → keine Pflichtfeld-Fehler, ein Hinweis „Bei N Einträgen fehlten Ausgabedaten — in der CSV ergänzt …“ mit Tagesdatum (Demo-REPLY 32 Einträge; GTFDEMO 4.2; S1000DBIKE 5.0)
- [x] `issno` fehlt ganz → CSV mit `001`/`new` und Prüfdatum in `day`/`month`/`year` (alle drei Issues: 2.3, 4.2, 5.0)
- [x] Eintragstyp leer → `n`; vorhandenes `c`/`d` (und `n`) bleibt
- [x] Vorhandenes vollständiges Datum bleibt erhalten
- [x] Teildaten (`@issno` ohne `@type`; 4.2: `issueInfo` ohne `issueType`; nur Ausgabetyp ohne Nummer) oder nur fehlendes Datum → keine Ergänzung, Sammelhinweis „… beim Check-in sind sie Pflicht“
- [x] Rundlauf: CSV aus einer Datei ohne Ausgabedaten besteht die Check-in-Regelprüfung ohne Pflichtfeld-Fehler — neue DMRL (Unit) und **bestehende DMRL GTFDEMO im echten Browser** („Prüfung bestanden“, „Übernehmen“ aktiv)

**Edge Cases (neu)**
- [x] Mischfall ergänzt / Teildaten → beide Hinweise, Anzahlen korrekt
- [x] Unvollständiges Datum ohne `issno` → `issno`/`type` ergänzt, Datum nicht, Fehler „Ausgabedatum ist unvollständig“ bleibt
- [x] Ausgabenummer nur aus Leerzeichen gilt nicht als fehlend → keine Ergänzung, Formatfehler (Regel A)
- [x] Prüfdatum 31.12. 23:59:59 → einheitlich `31.12.2026` für alle Einträge; „Erneut prüfen“ nimmt das aktuelle Datum
- [x] Bericht, Zusammenfassung und Antwortzählung beruhen auf den Originaldaten; Originaleinträge werden nicht verändert
- [x] Formelschutz und Sortierung nach DMC bleiben in der ergänzten CSV erhalten
- [x] Nichts gespeichert: Datenbestand vor/nach Prüfung mit Ergänzung und CSV-Download identisch
- [x] REPLY-Import und Check-in unverändert (keine Ergänzung dort; Regression grün)

**Security**
- [x] Keine neuen Eingaben: ergänzte Werte sind feste Konstanten bzw. das lokale Datum; Formelschutz greift weiterhin; keine Speicherung, keine Daten an Dritte

**Regression**
- [x] E2E vollständig Chromium: 110/110 grün (alle Features, inkl. 4 neue Tests `tests/PROJ-20-qa-refinement2.spec.ts`)
- [x] `npm test`: 511/511 grün (neu: 7 QA-Tests in `qa-proj20.test.ts`)
- Testablauf-Wettlauf nach der Anmeldung (Weiterleitung überholte Menü-Navigation) bereits in `f11199f` behoben — kein Fehler der App

**Beobachtungen (Spec-konform, Entscheidung Product Owner)**
- **B-1 — Eintragstyp `n` bei bestehenden Einträgen:** Enthält eine fremde/alte DMRL-XML Einträge **ohne** Eintragstyp und **ohne** Ausgabedaten (z. B. bereits freigegebene Einträge), erhalten sie in der CSV `n`. Beim Check-in in eine DMRL, in der sie schon existieren, gibt es keinen Fehler (Regel F prüft `n` nur für neue Einträge); sie werden „geändert, Typ n“ und gingen beim nächsten SEND als *neue* Einträge an den Empfänger. Nachgestellt im Unit-Test (11 freigegebene Einträge → 11 × „geändert:n“, 0 Fehler). Demo-REPLYs sind nicht betroffen (alle Einträge haben einen Typ). *Empfehlung:* `n` nur ergänzen, wenn zugleich der Eintrag beim Check-in neu ist — geht im Werkzeug nicht (kein DMRL-Bezug); alternativ Hinweis im Ergebnis „Eintragstyp n gesetzt — bei bestehenden Einträgen vor dem Check-in prüfen“ oder Check-in-Regel F: `n` bei bestehendem Eintrag als Hinweis/Fehler.
- **B-2 — Ausgabedatum bestehender Einträge wird überschrieben:** Beim Rundlauf in eine bestehende DMRL (GTFDEMO: `001`/`new` vom 01.11.2026) ersetzt das Prüfdatum das vorhandene Datum; der Check-in meldet 10 geänderte Einträge (je 1 Feld). Laut Tech Design K gewollt und für den Bearbeiter sichtbar.

**Bugs Found:** keine
**Production Ready:** YES (B-1 zur Entscheidung durch den Product Owner)

### QA Refinement 2026-11-26 (2) — CSV mit 28 Spalten; Bestätigung Refinement 3 und „Werkzeug“
**Tested:** 2026-11-26 · **Tester:** QA Engineer (AI) · **Browser:** Chromium (Desktop; Firefox/Safari nicht installiert)
**Automatisiert:** Vitest 714 Tests ✅ · Playwright 164 Tests ✅ (PROJ-20: 33 E2E mit echter XSD-Serverfunktion) · Lint/Typprüfung ohne Fehler

#### Acceptance Criteria Status
- [x] „CSV herunterladen“ liefert genau 28 Spalten (bis `remarks`, ohne `dmc` und Informationsfelder), Semikolon, UTF-8 mit BOM, nach DMC sortiert, Name der XML mit `.csv` (Unit: vollständige Kopfzeile; E2E)
- [x] Werkzeug-CSV in eine DMRL mit gespeicherten Informationsfeldern einchecken → Werte bleiben, Hinweis „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten.“ (QA-Unit, E2E „BUG-QA13-1“)
- [x] Rundlauf 4.2-Export ohne Ausgabedaten → CSV → Check-in in GTFDEMO besteht; einziger Hinweis ist jetzt der zu den Informationsfeldern (E2E angepasst, gewollt)
- [x] Refinement 3 (Ausgabetyp aus dem Eintragstyp ableiten, 2026-11-16): Ableitungstabelle, je Eintragstyp, vorhandene Nummer/Datum bleiben, Issue 2.3/4.2/5.0, Rundlauf c/changed und d/deleted in den Check-in — durch Unit- und E2E-Tests abgedeckt, alle grün (bisher ohne eigenen QA-Abschnitt)
- [x] Benennung „Werkzeug“ (2026-11-22): Menüpunkt „Werkzeug“, kein Menüpunkt „XML prüfen“, Überschrift „Werkzeug.“, Zeile „XML prüfen“, Adresse `/xml-pruefung` (E2E „Benennung ‚Werkzeug‘“)
- [x] Alle bisherigen Kriterien (Zugang, Prüfung, Ergebnis, keine Wirkung auf den Datenbestand, Darstellung) — Regression grün

#### Security Audit Results
- [x] Keine neue Angriffsfläche: Änderung nur an der Spaltenauswahl der CSV; Formelschutz, Host-/Origin-Schutz der XSD-Funktion, Entities unverändert (bestehende Tests grün)

#### Bugs Found
- keine

#### Summary
- **Acceptance Criteria:** alle bestanden
- **Bugs Found:** 0
- **Security:** Pass
- **Production Ready:** YES

## Deployment
_To be added by /deploy_
