# PROJ-20: XML-Prüfung & CSV-Konvertierung

## Status: In Progress
**Created:** 2026-11-14
**Last Updated:** 2026-11-14

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung) — nur angemeldete Benutzer
- Requires: PROJ-8 (Fachliches Regelwerk) — Regeln für die Einträge
- Requires: PROJ-11 (XSD-Validierung) — Schema-Prüfung je Issue
- Nutzt: PROJ-9 (Check-out CSV) — CSV-Aufbau; PROJ-10 (Check-in CSV) — Prüfbericht und Zielverwendung der CSV
- **Erfordert Anpassung von PROJ-10 und PROJ-8 (per `/refine PROJ-10`):** Weichen `answer`/`answer_comment` in der eingecheckten CSV vom Stand der DMRL ab, wird das nicht mehr als Fehler abgewiesen (heute Regel K). Stattdessen fragt der Check-in, ob die Antworten übernommen werden. Übernommene Antworten sind **nur Information**: Der Eintragsstatus bleibt *in Bearbeitung*, freigegeben wird weiterhin nur durch einen REPLY; die Übernahme steht im Verlauf.
- Wird genutzt von: PROJ-21 (XML gegen DMRL prüfen) — gleicher Prüf- und Konvertierungskern mit Bezug zu einer DMRL

## Beschreibung
Ein **eigenständiges Werkzeug** „XML prüfen“: Der Benutzer lädt eine beliebige DMRL-XML hoch (z. B. von einem Partner, aus einem Altprojekt oder einem anderen System), wählt die S1000D-Issue, und die Datei wird gegen das Schema (XSD) und das fachliche Regelwerk geprüft. Das Ergebnis ist eine Zusammenfassung der Datei mit Prüfbericht und eine **CSV im Check-out-Format**, die sich in Excel bearbeiten und über den normalen Check-in in eine DMRL im System übernehmen lässt.

Das Werkzeug **speichert nichts**: keine DMRL, kein Archiv, kein Verlauf, keine Sperre.

## Ablauf
1. Menüpunkt **„XML prüfen“** in der Kopfzeile (neben „Dashboard“) öffnen
2. **S1000D-Issue wählen** (2.3, 4.2 oder 5.0); ohne Auswahl ist keine Prüfung möglich
3. **XML-Datei auswählen** (höchstens 5 MB, wie PROJ-11) und „Prüfen“
4. Prüfung: Wohlgeformtheit und XSD (PROJ-11), dann Einlesen der Einträge und Regelprüfung
5. Ergebnis: **Zusammenfassung**, **Prüfbericht**, Schaltfläche **„CSV herunterladen“** (und „Prüfbericht herunterladen“)
6. Neue Datei prüfen → vorheriges Ergebnis wird ersetzt

## Prüfung
| Stufe | Inhalt | Bei Fehler |
|---|---|---|
| Wohlgeformtheit | gültiges XML | Prüfbericht, **keine CSV** |
| XSD | `dml.xsd` der gewählten Issue (PROJ-11) | Prüfbericht, CSV mit Warnung |
| Einlesen | Kopf und Einträge mit dem Leser der gewählten Issue | nicht lesbar (z. B. falsche Issue gewählt): Meldung, **keine CSV** |
| Regelwerk | Regeln wie beim **Check-in** (PROJ-8): Format (A), Pflichtfelder Check-in (B), eindeutiger DMC (C), SNS ↔ Benennung (E), Infocode ↔ Infoname (I) | Prüfbericht, CSV mit Warnung |
| MI | statt Regel D: **alle Einträge haben denselben MI**; der MI wird in der Zusammenfassung angezeigt | Prüfbericht, CSV mit Warnung |

Ist die XSD-Prüfung **nicht verfügbar** (xmllint fehlt), wird trotzdem eingelesen und nach Regelwerk geprüft. Der Bericht weist deutlich auf „XSD-Prüfung nicht durchgeführt“ hin, die CSV ist mit Warnung herunterladbar.

## Ergebnis
**Zusammenfassung (Kopfdaten der Datei)**
- Dateiname, gewählte Issue, Richtung (SEND/REPLY, soweit aus der Datei erkennbar)
- DML-Code, Ausgabestand (`issno`/`inwork`), Datum, Sicherheitseinstufung, Verweis auf die Bezugs-DMRL (`dmlref`), soweit vorhanden
- MI (bzw. „uneinheitlich“), Anzahl Einträge, Anzahl Partnerantworten freigegeben / zu überarbeiten / ohne Antwort (immer angezeigt, auch bei SEND-Dateien ohne Antworten)
- Gesamtergebnis: **„Keine Fehler“** oder **„N Fehler, M Hinweise“**

**Prüfbericht:** gleiche Darstellung und gleicher Download wie beim Check-in (PROJ-10), gruppiert nach XSD und Regeln.

**CSV**
- Aufbau wie Check-out (PROJ-9): 27 Spalten, Semikolon, UTF-8 mit BOM, nach DMC sortiert, inkl. `answer`/`answer_comment`, Formelschutz (BUG-QA2-1)
- Dateiname: Name der XML-Datei mit Endung `.csv`, z. B. `DML-PHUNGUN-C1234-C-2026-00002_001-00.csv`
- Bei Fehlern: Hinweis direkt an der Schaltfläche: „Die CSV enthält Fehler aus der Prüfung — ein Check-in wird abgewiesen, bis sie behoben sind.“

## User Stories
- Als **Bearbeiter** möchte ich eine DMRL-XML eines Partners prüfen, ohne sie in eine DMRL im System zu übernehmen, damit ich Fehler früh erkenne und zurückmelden kann.
- Als **Bearbeiter** möchte ich eine fremde oder alte DMRL-XML in eine CSV im Check-out-Format umwandeln, damit ich sie in Excel bearbeiten und per Check-in in eine DMRL im System übernehmen kann.
- Als **Bearbeiter** möchte ich auch bei Fehlern eine CSV erhalten, damit ich die Fehler in Excel korrigieren kann.
- Als **Bearbeiter** möchte ich auf einen Blick sehen, was in der Datei steht (DML-Code, MI, Anzahl Einträge, Antworten), ohne sie in einem XML-Editor zu öffnen.
- Als **Administrator** möchte ich das Werkzeug ebenfalls nutzen können, z. B. zur Vorbereitung einer neuen DMRL.
- Als **Product Owner** möchte ich in der Demo zeigen, dass fehlerhafte XML-Dateien zuverlässig erkannt werden — auch außerhalb des SEND/REPLY-Workflows.

## Out of Scope
- Prüfung gegen eine DMRL im System (Abgleich mit Einträgen, SEND-Bezug, MI des Systems) — **PROJ-21**
- Automatische Übernahme in eine DMRL; die Übernahme läuft nur über Check-out → CSV ersetzen → Check-in (PROJ-9/10)
- Automatische Erkennung der Issue (bewusst manuelle Auswahl)
- Eintragsvorschau als Tabelle
- Konvertierung in andere Richtungen (CSV → XML, Issue → andere Issue)
- Speichern von Prüfergebnissen, Archiv- oder Verlaufseinträge
- Mehrere Dateien auf einmal
- Andere Datentypen als DMRL/DML (z. B. Datenmodule, PM, BREX)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugang
- [ ] Angenommen ein Bearbeiter oder Administrator ist angemeldet, wenn er die Kopfzeile ansieht, dann gibt es den Menüpunkt „XML prüfen“, der zum Werkzeug führt
- [ ] Angenommen niemand ist angemeldet, wenn die Adresse des Werkzeugs aufgerufen wird, dann erscheint die Anmeldeseite
- [ ] Angenommen ein Bearbeiter ohne jede DMRL-Berechtigung ist angemeldet, wenn er das Werkzeug öffnet, dann kann er es uneingeschränkt nutzen

### Auswahl und Prüfung
- [ ] Angenommen das Werkzeug ist geöffnet, wenn keine Issue gewählt ist, dann ist „Prüfen“ nicht möglich und ein Hinweis fordert zur Auswahl der Issue auf
- [ ] Angenommen eine Issue ist gewählt, wenn eine Datei über 5 MB oder eine Datei, die keine XML ist, ausgewählt wird, dann wird sie mit verständlicher Meldung abgewiesen
- [ ] Angenommen eine gültige DMRL-XML und die passende Issue, wenn „Prüfen“ gewählt wird, dann erscheinen Zusammenfassung, Prüfbericht „Keine Fehler“ und „CSV herunterladen“
- [ ] Angenommen eine nicht wohlgeformte XML, wenn geprüft wird, dann zeigt der Bericht den Fehler mit Zeile, und es gibt keine CSV
- [ ] Angenommen eine XML mit Schemafehlern, wenn geprüft wird, dann listet der Bericht die XSD-Fehler mit Zeile, und die CSV ist mit Warnung herunterladbar
- [ ] Angenommen eine XML einer anderen Issue als der gewählten, wenn geprüft wird, dann meldet der Bericht Schemafehler bzw. „Datei passt nicht zur gewählten Issue“; ist sie nicht lesbar, gibt es keine CSV
- [ ] Angenommen eine XML mit Regelverstößen (z. B. doppelter DMC, fehlendes Pflichtfeld, unterschiedliche Benennung zum selben SNS), wenn geprüft wird, dann listet der Bericht die Verstöße je Eintrag wie beim Check-in, und die CSV ist mit Warnung herunterladbar
- [ ] Angenommen die Einträge haben unterschiedliche MI, wenn geprüft wird, dann meldet der Bericht „MI uneinheitlich“ mit den betroffenen Einträgen, und die Zusammenfassung zeigt „uneinheitlich“
- [ ] Angenommen die XSD-Prüfung ist nicht verfügbar, wenn geprüft wird, dann wird nach Regelwerk geprüft, der Bericht weist auf „XSD-Prüfung nicht durchgeführt“ hin, und die CSV ist mit Warnung herunterladbar

### Ergebnis und CSV
- [ ] Angenommen eine Prüfung ist abgeschlossen, wenn die Zusammenfassung angezeigt wird, dann enthält sie Dateiname, Issue, DML-Code, Ausgabestand, Datum, Sicherheitseinstufung, MI, Anzahl Einträge und Anzahl Antworten je Art
- [ ] Angenommen eine lesbare Datei, wenn „CSV herunterladen“ gewählt wird, dann wird eine CSV im Check-out-Format (27 Spalten, Semikolon, UTF-8 mit BOM, nach DMC sortiert) mit dem Namen der XML-Datei und Endung `.csv` heruntergeladen
- [ ] Angenommen eine Partner-XML mit Antworten, wenn sie konvertiert wird, dann stehen Antwort und Begründung je Eintrag in den Spalten `answer` und `answer_comment`
- [ ] Angenommen ein Eintrag enthält einen Wert, der mit `=`, `+`, `-` oder `@` beginnt, wenn die CSV erzeugt wird, dann ist der Wert wie bei allen CSV-Dateien gegen Formelausführung geschützt
- [ ] Angenommen eine fehlerfreie Datei wurde konvertiert, wenn die CSV unverändert in eine passend ausgecheckte DMRL eingecheckt wird, dann besteht sie die Regelprüfung des Check-ins (Abweichungen nur aus dem Abgleich mit der DMRL, z. B. MI des Systems); enthält sie Partnerantworten, fragt der Check-in, ob sie übernommen werden (nach Anpassung PROJ-10)
- [ ] Angenommen eine Prüfung ist abgeschlossen, wenn „Prüfbericht herunterladen“ gewählt wird, dann wird der Bericht wie beim Check-in als CSV heruntergeladen

### Keine Wirkung auf den Datenbestand
- [ ] Angenommen eine Datei wurde geprüft und konvertiert, wenn danach Dashboard, DMRLs, Archiv und Verlauf angesehen werden, dann ist nichts verändert, gesperrt oder protokolliert
- [ ] Angenommen ein Ergebnis wird angezeigt, wenn die Seite verlassen oder neu geladen wird, dann ist das Ergebnis weg (nichts gespeichert)

### Darstellung
- [ ] Angenommen das Werkzeug wird bei 375, 768 und 1440 px Breite genutzt, wenn eine Prüfung mit Fehlern angezeigt wird, dann scrollt die Seite nicht waagerecht

## Edge Cases
- **XML einer anderen Issue gewählt** (z. B. 4.2-Datei, Issue 2.3 gewählt): XSD meldet Fehler; ist die Datei mit dem Leser der gewählten Issue nicht lesbar, Meldung „Datei passt nicht zur gewählten Issue — bitte Issue prüfen“ und keine CSV.
- **XML ohne Einträge:** schemagültig nicht möglich (mind. ein Eintrag); bei Schemafehler Bericht und CSV nur mit Kopfzeile plus Warnung.
- **Partner-REPLY ohne Ausgabedaten** (`issno`, `type`, Datum fehlen, im REPLY erlaubt): Da nach Check-in-Regeln geprüft wird, erscheinen Pflichtfeld-Fehler — bewusst, weil die CSV für den Check-in gedacht ist. Der Bericht nennt die Ursache verständlich.
- **Keine DMRL-XML** (wohlgeformt, aber z. B. ein Datenmodul): Schemafehler am Wurzelelement; nicht lesbar → keine CSV.
- **Kodierung:** XML in UTF-8, UTF-16 oder ISO-8859-1 laut Deklaration wird korrekt gelesen (wie REPLY, PROJ-13); die CSV ist immer UTF-8.
- **Externe Verweise / Entities** in der XML werden nicht nachgeladen (wie PROJ-11).
- **Sehr viele Einträge** (bis 5 MB): Prüfung und Konvertierung funktionieren; da nichts gespeichert wird, ist der Browser-Speicher (BUG-QA2-2) nicht betroffen.
- **Prüfung läuft, Benutzer wählt neue Datei oder verlässt die Seite:** laufende Prüfung wird verworfen, kein veraltetes Ergebnis.
- **Benutzerwechsel in der Kopfzeile** während ein Ergebnis angezeigt wird: Werkzeug bleibt nutzbar (keine Berechtigung nötig).
- **Doppelte DMC:** Bericht meldet Regel C; die CSV enthält beide Einträge (Check-in würde sie abweisen).

## Technical Requirements (optional)
- Prüfung einer 5-MB-Datei in wenigen Sekunden
- Kein Speichern im Browser-Speicher (localStorage) — Ergebnis nur auf der Seite
- XSD-Prüfung über die bestehende Serverfunktion (PROJ-11), inkl. Host-/Origin-Schutz
- Browser: Chrome (Firefox, Safari nach Möglichkeit)

## Open Questions
- [x] Wie behandelt der Check-in eingehende `answer`/`answer_comment` aus einer konvertierten Partner-XML? → Optional übernehmen mit Abfrage, nur als Information (Status bleibt *in Bearbeitung*); Umsetzung per `/refine PROJ-10` (2026-11-14)
- [x] Antwortzählung bei SEND-Dateien ausblenden? → Nein, immer anzeigen (2026-11-14)
- [x] `/refine PROJ-10` (und Regel K in PROJ-8) durchgeführt (2026-11-14): eine Abfrage für alle abweichenden Antworten, standardmäßig aus; übernommene Antwortänderung zählt als Änderung. Umsetzung von PROJ-10/PROJ-8 muss vor der Gesamtabnahme von PROJ-20 erfolgen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zwei Features: eigenständiges Werkzeug (PROJ-20) und Prüfung aus der DMRL-Ansicht mit Abgleich (PROJ-21) | Unterschiedlicher Einstieg und unterschiedliche Prüftiefe; getrennt umsetz- und testbar | 2026-11-14 |
| Priorität P1 | MVP (P0) ist vollständig freigegeben; Erweiterung für die nächste Ausbaustufe | 2026-11-14 |
| CSV im Check-out-Format, Prüfung nach Check-in-Regeln | Die CSV soll per Check-in in eine DMRL übernommen werden können (z. B. Altbestand eines Partners) | 2026-11-14 |
| Issue wird immer manuell gewählt | Wunsch Product Owner; eindeutig und nachvollziehbar, keine Fehlinterpretation | 2026-11-14 |
| MI: Einheitlichkeit in der Datei statt Abgleich mit einem System | Kein System im Werkzeug; der Abgleich mit dem System erfolgt beim Check-in in die Ziel-DMRL | 2026-11-14 |
| CSV auch bei XSD- oder Regelfehlern (mit Warnung), nicht bei nicht wohlgeformten/nicht lesbaren Dateien | Fehler lassen sich in Excel korrigieren; der Check-in prüft ohnehin erneut | 2026-11-14 |
| XSD nicht verfügbar → Regelprüfung und CSV mit Warnung | Nichts wird gespeichert; der Check-in prüft erneut. Abweichend von REPLY (PROJ-13), wo eine Übernahme ohne XSD blockiert ist | 2026-11-14 |
| Zugang für alle angemeldeten Benutzer über eigenen Menüpunkt, ohne DMRL-Berechtigung | Werkzeug liest und ändert keine Daten des Systems | 2026-11-14 |
| Ergebnis: Zusammenfassung + Prüfbericht, keine Eintragstabelle | Schlank; Details stehen im Bericht und in der CSV | 2026-11-14 |
| Nichts wird gespeichert (kein Archiv, kein Verlauf) | Reines Hilfswerkzeug außerhalb des Workflows; schont den Browser-Speicher (BUG-QA2-2) | 2026-11-14 |
| Partnerantworten aus der CSV werden beim Check-in optional (mit Abfrage) übernommen, nur als Information — Status bleibt *in Bearbeitung* | Altbestand mit Antworten soll übernehmbar sein; Freigabe bleibt laut PRD an einen REPLY gebunden | 2026-11-14 |
| Änderung am Check-in wird per `/refine PROJ-10` (und PROJ-8 Regel K) spezifiziert, nicht in PROJ-20 | Single Responsibility; PROJ-10/PROJ-8 sind freigegeben und werden danach erneut umgesetzt und getestet | 2026-11-14 |
| Antwortzählung in der Zusammenfassung immer anzeigen, auch bei SEND-Dateien | Wunsch Product Owner; einheitliche Darstellung | 2026-11-14 |

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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Überblick
PROJ-20 ist ein **reines Browser-Werkzeug mit einer bestehenden Serverhilfe**: Das Einzige, was den Server braucht, ist die XSD-Prüfung (xmllint) — dafür wird die vorhandene Serverfunktion aus PROJ-11 unverändert genutzt, inklusive Host-/Origin-Schutz. Alles andere (Einlesen, Regelprüfung, CSV erzeugen) läuft im Browser mit den Bausteinen, die Check-in, REPLY und Check-out schon verwenden. **Es entsteht keine neue Serverfunktion und kein neuer Speicher.**

Der Prüf- und Konvertierungskern wird als eigener, wiederverwendbarer Baustein gebaut, damit PROJ-21 („XML gegen DMRL prüfen“) ihn später nur um den Abgleich mit einer DMRL ergänzen muss.

### B) Seitenstruktur
```
Kopfzeile (bestehend)
+-- Menüpunkt „XML prüfen“ (neu, neben „Dashboard“, für alle angemeldeten Benutzer)

Seite „XML prüfen“ (neue Adresse /xml-pruefung, nur nach Anmeldung)
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

### Implementierungsnotizen (Frontend, 2026-11-14)
- **Prüfkern** `src/lib/workflows/xml-check.ts` (ohne Bildschirmbezug, für PROJ-21 wiederverwendbar): Dateiannahme → XSD (bestehende Serverfunktion) → Lesen in deklarierter Kodierung → DML-Leser der gewählten Issue → Regeln A, B (Check-in), C, E, I + neue Prüfung „MI einheitlich“ (Gruppe „Model Ident Code“, häufigster MI gilt) → CSV mit dem bestehenden Check-out-Schreiber.
- **Nicht lesbar** (nicht wohlgeformt laut xmllint bzw. Browser-Leser, oder Leser der gewählten Issue scheitert): Befund in Gruppe „Dateistruktur“ mit „Datei passt nicht zur gewählten Issue — bitte Issue prüfen.“, keine CSV, Zusammenfassung ohne Kopfdaten.
- **XSD nicht verfügbar:** Hinweis-Befund „XSD-Prüfung nicht durchgeführt — …“ im Bericht, rote Hinweisbox auf der Seite, CSV mit eigener Warnung.
- **Seite** `/xml-pruefung` (`src/app/(app)/xml-pruefung/page.tsx`, Komponente `src/components/xml-check/xml-check-tool.tsx`), Menüpunkt „XML prüfen“ in der Kopfzeile neben „Dashboard“; Anmeldesperre über das bestehende Layout, keine DMRL-Berechtigung.
- **Prüfbericht:** gemeinsame Anzeige (PROJ-8); Spalte „Zeile / Eintrag“ (XSD-Befunde mit Dateizeile, Regelbefunde mit Eintragsposition), Anfangssortierung „nach Regel“ (XSD zuerst). `CheckReportView` dafür um zwei optionale Props erweitert (Text nach der Fehlerzahl, Anfangssortierung) — bestehende Aufrufer unverändert.
- **Veraltete Ergebnisse:** fortlaufende Prüfnummer; neue Datei, Issue-Wechsel oder Verlassen der Seite verwirft die laufende Prüfung. Datei- und Issue-Auswahl bleiben während der Prüfung bedienbar.
- **Dateinamen:** CSV = XML-Name mit `.csv`; Prüfbericht `Pruefbericht-XML-<XML-Name>-<Datum>.csv`.
- **Beobachtung:** Die Demo-SEND/REPLY-Dateien enthalten keine Ausgabedaten (`issno`, `type`, Datum) — nach Check-in-Regeln ergeben sich daher Pflichtfeld-Fehler (laut Spec gewollt, Edge Case „Partner-REPLY ohne Ausgabedaten“).
- **Tests:** 19 Unit-Tests Prüfkern (inkl. Rundlauf CSV → Check-in-Regelprüfung, ISO-8859-1, falsche Issue in beide Richtungen, 4.2-Beispiel mit uneinheitlichem MI), 6 Komponententests, 10 E2E-Tests mit echter XSD-Serverfunktion (Menüpunkt, REPLY-Konvertierung, ohne Anmeldung, ohne Berechtigung, nicht wohlgeformt, Schemafehler, falsche Issue, 375/768/1440 px, Neuladen).

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
- [x] Partnerantworten in `answer`/`answer_comment` (30 freigegeben / 2 zu überarbeiten mit Begründung)
- [x] Formelschutz für `=`, `+`, `-`, `@`; der Check-in liest die Werte wieder unverändert
- [x] Rundlauf: fehlerfreie konvertierte CSV besteht die Check-in-Regelprüfung der ausgecheckten DMRL (E2E); mit Partnerantworten meldet der Check-in sie als abweichende Antworten zur Übernahme (Unit)
- [x] „Prüfbericht herunterladen“ als CSV wie beim Check-in

**Keine Wirkung auf den Datenbestand**
- [x] Datenbestand vor/nach Prüfung und Download identisch (auch bei 5-MB-Datei); localStorage unberührt
- [x] Neuladen: Ergebnis ist weg

**Darstellung**
- [x] 375 / 768 / 1440 px mit Fehlerbericht ohne waagerechtes Scrollen

### Edge Cases Status
- [x] Falsche Issue gewählt → nicht lesbar, keine CSV
- [x] XML ohne Einträge (Schemafehler) → CSV nur mit Kopfzeile, Warnung
- [x] Partner-REPLY ohne Ausgabedaten → Pflichtfeld-Fehler genau für `issno`, `type`, `day`, `month`, `year` (Demo-Dateien)
- [x] Keine DMRL-XML (anderes Wurzelelement) → „passt nicht zur gewählten Issue“, keine CSV
- [x] ISO-8859-1 laut Deklaration korrekt gelesen
- [x] **BUG-QA1-1:** UTF-16 laut Deklaration wird nicht gelesen → behoben (2026-11-15), erneuter QA-Test offen
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

## Deployment
_To be added by /deploy_
