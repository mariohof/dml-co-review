# PROJ-13: REPLY-Import

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-12 (SEND-Export) — letzter SEND, Empfänger, Status *gesendet*
- Requires: PROJ-11 (XSD-Validierung) — Schemaprüfung vor dem Regelwerk
- Requires: PROJ-8 (Fachliches Regelwerk) — Gruppen A–E, I, G, H
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „REPLY importieren", Anzeige von Status, Empfänger-Kommentar, Empfänger-Bemerkung
- Requires: PROJ-17 (Berechtigungen)
- Wirkt auf: PROJ-14 (Freigabestatus), PROJ-15 (Archiv)

## Beschreibung
Der Bearbeiter importiert die Antwort-DMRL (REPLY) des Empfängers als S1000D-XML. Die Datei wird gegen das Schema (PROJ-11) und das fachliche Regelwerk (PROJ-8) geprüft. Nach Sichtung einer Zusammenfassung übernimmt der Bearbeiter die Antworten: Jeder vom Empfänger geprüfte Eintrag wird *freigegeben* oder *zu überarbeiten*. Sind danach alle Einträge freigegeben, ist die DMRL automatisch *freigegeben*. Der REPLY wird byte-genau archiviert.

## Ablauf
1. Berechtigter Bearbeiter oder Administrator wählt **„REPLY importieren"** — nur bei DMRL-Status *gesendet*.
2. XML-Datei hochladen (`.xml`, max. 5 MB).
3. XSD-Prüfung (PROJ-11) → bei Fehler: XSD-Prüfbericht, Ende.
4. Regelwerk (PROJ-8: A–E, I, G, H) → bei Fehler: Prüfbericht, Ende.
5. **Zusammenfassung:**
   - Absender, Versionsindex und Bezug: „REPLY C1234 00001-2026 auf SEND 00002-2026"
   - „30 freigegeben · 2 zu überarbeiten"
   - Liste der abgelehnten Einträge (DMC, Tech Name, Begründung)
   - Gesamtbemerkung des Empfängers (`dml/remarks`)
   - künftiger DMRL-Status (*freigegeben* oder *in Bearbeitung*)
6. **„Übernehmen"** oder **„Abbrechen"** (nichts geändert, DMRL bleibt *gesendet*).

Bei Fehlern kann sofort eine andere Datei hochgeladen werden.

## Wirkung der Übernahme
**Einträge**
| Eintrag im REPLY | Danach |
|---|---|
| `answer="y"` | Eintragstyp wird **entfernt** (bei `n`, `c` und `d`; ein `d`-Eintrag bleibt bestehen), Status *freigegeben* |
| `answer="n"` | Eintragstyp bleibt, Status *zu überarbeiten* |
| ohne Eintragstyp (nicht geprüft) | unverändert, inkl. Antwort aus früherem Zyklus |

- Bei Einträgen mit Antwort werden `answer` und `answer_comment` aus dem REPLY gespeichert und ersetzen frühere Werte.
- `issno`, DM-Ausgabetyp und Datum: Werte der Anwendung bleiben erhalten (PROJ-8 B — im REPLY optional; falls vorhanden identisch).
- Alle übrigen Felder sind laut PROJ-8 G unverändert gegenüber dem SEND.

**DMRL**
| Was | Danach |
|---|---|
| Status | *freigegeben*, wenn danach **alle** Einträge *freigegeben* sind; sonst *in Bearbeitung* |
| Bemerkung des Empfängers | gespeichert, in der Ansicht sichtbar (PROJ-7) |
| Archiv | REPLY-XML byte-genau mit Versionsindex (seqnum-diyear des Empfängers), Empfänger, Bearbeiter, Zeitpunkt; verknüpft mit dem zugehörigen SEND |
| Workflow-Verlauf | „REPLY [Versionsindex] von [Empfänger] übernommen — x freigegeben, y zu überarbeiten" |
| `dmlref` des nächsten SEND | verweist auf diesen REPLY (PROJ-12) |

Die Freigabe wird durch die Übernahme erteilt — kein zusätzlicher „Freigeben"-Schritt.

## User Stories
- Als **Bearbeiter** möchte ich die Antwort des Empfängers importieren, damit die DMRL den abgestimmten Stand zeigt.
- Als **Bearbeiter** möchte ich vor der Übernahme sehen, welche Einträge abgelehnt wurden und warum, damit ich die Überarbeitung planen kann.
- Als **Bearbeiter** möchte ich, dass fehlerhafte oder fremde REPLY-Dateien abgelehnt werden, damit keine falschen Freigaben entstehen.
- Als **Bearbeiter** möchte ich, dass die DMRL automatisch freigegeben ist, sobald der Empfänger alle Einträge genehmigt hat.
- Als **Product Owner** möchte ich mit der Beispieldatei 02 einen vollständigen REPLY vorführen.

## Out of Scope
- Prüfregeln → PROJ-8, XSD → PROJ-11
- Manueller „Freigeben"-Schritt bzw. Status *freigabebereit*
- Freigabe ohne REPLY („Fehler ignorieren", Anforderung 02)
- Import von Prüfprotokollen des Empfängers als Anhang (Anforderung 02)
- Teilweise Übernahme einzelner Antworten
- Rückgängig machen eines übernommenen REPLY
- Mehrere REPLYs auf denselben SEND (zweiter REPLY wird abgelehnt: Status nicht mehr *gesendet*)
- Anzeige des Archivs → PROJ-15

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn ein berechtigter Bearbeiter die Ansicht öffnet, dann ist „REPLY importieren" verfügbar
- [ ] Angenommen die DMRL hat nicht Status *gesendet*, wenn die Ansicht geöffnet wird, dann ist „REPLY importieren" nicht verfügbar
- [ ] Angenommen ein Bearbeiter ist nicht berechtigt, wenn er den Import direkt aufruft, dann erscheint „Keine Berechtigung"

### Prüfung
- [ ] Angenommen die Datei besteht die XSD-Prüfung nicht, wenn sie hochgeladen wird, dann erscheint der XSD-Prüfbericht, das Regelwerk läuft nicht und nichts wird übernommen
- [ ] Angenommen die Datei verletzt das Regelwerk (z. B. falscher Absender), wenn sie geprüft wird, dann erscheint der Prüfbericht und nichts wird übernommen
- [ ] Angenommen ein Prüfbericht wird angezeigt, wenn eine andere Datei hochgeladen wird, dann wird diese neu geprüft
- [ ] Angenommen die Datei ist fehlerfrei, wenn die Prüfung endet, dann zeigt die Zusammenfassung Absender, Versionsindex, Bezug, Anzahl freigegeben/zu überarbeiten, abgelehnte Einträge mit Begründung, Empfänger-Bemerkung und künftigen DMRL-Status

### Übernahme
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Abbrechen" gewählt wird, dann ändert sich nichts und die DMRL bleibt *gesendet*
- [ ] Angenommen ein Eintrag hat Eintragstyp `n` und `answer="y"`, wenn übernommen wird, dann ist der Eintragstyp leer und der Status *freigegeben*
- [ ] Angenommen ein Eintrag hat Eintragstyp `d` und `answer="y"`, wenn übernommen wird, dann bleibt der Eintrag in der DMRL, der Eintragstyp ist leer und der Status *freigegeben*
- [ ] Angenommen ein Eintrag hat Eintragstyp `c` und `answer="n"` mit Begründung, wenn übernommen wird, dann bleibt `c`, Status *zu überarbeiten*, und die Begründung ist in der Ansicht sichtbar
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp, wenn übernommen wird, dann bleiben Status und frühere Antwort unverändert
- [ ] Angenommen alle Einträge sind nach der Übernahme *freigegeben*, wenn die DMRL betrachtet wird, dann ist sie *freigegeben* und das Banner „Nicht freigegeben" verschwindet
- [ ] Angenommen mindestens ein Eintrag ist *zu überarbeiten*, wenn übernommen wurde, dann ist die DMRL *in Bearbeitung*
- [ ] Angenommen der REPLY enthält `dml/remarks`, wenn übernommen wird, dann ist die Bemerkung in der DMRL-Ansicht sichtbar
- [ ] Angenommen der REPLY wurde übernommen, wenn das Archiv betrachtet wird, dann ist die Datei byte-genau mit Versionsindex, Empfänger, Bearbeiter und Zeitpunkt gespeichert und dem SEND zugeordnet
- [ ] Angenommen der REPLY wurde übernommen, wenn der Workflow-Verlauf betrachtet wird, dann enthält er den Eintrag mit Anzahl freigegeben/zu überarbeiten
- [ ] Angenommen ein REPLY wurde übernommen, wenn dieselbe Datei erneut importiert werden soll, dann ist das nicht möglich (Status nicht *gesendet*; Duplikat laut PROJ-8)
- [ ] Angenommen der REPLY wurde übernommen, wenn danach gesendet wird, dann verweist `dmlref` des neuen SEND auf diesen REPLY

### Demo
- [ ] Angenommen der Demo-Datenbestand ist geladen (PHUNGUN nach SEND 00002-2026), wenn Beispieldatei 02 (REPLY auf SEND 00001-2026) importiert wird, dann wird sie abgelehnt mit „REPLY bezieht sich nicht auf den letzten SEND 00002-2026" bzw. „REPLY wurde bereits importiert"
- [ ] Angenommen eine Demo-REPLY-Datei auf SEND 00002-2026 mit einigen `answer="n"` liegt vor, wenn sie importiert wird, dann sind die `y`-Einträge *freigegeben*, die `n`-Einträge *zu überarbeiten* und die DMRL *in Bearbeitung*

## Edge Cases
- **REPLY auf zurückgezogenen SEND:** DMRL nicht *gesendet* → Import nicht möglich.
- **REPLY eines anderen Empfängers:** Regelwerk G (Absender) → abgelehnt.
- **REPLY enthält `answer` bei Einträgen ohne Eintragstyp:** Regelwerk H → abgelehnt.
- **Empfänger hat `issno`/Datum weggelassen:** erlaubt, Werte der Anwendung bleiben (PROJ-8 B).
- **Alle Einträge `n`:** DMRL *in Bearbeitung*, alle geprüften Einträge *zu überarbeiten*.
- **Admin zieht SEND zurück, während der Bearbeiter die Zusammenfassung sieht:** „Übernehmen" schlägt fehl mit „Die DMRL wartet nicht mehr auf eine Antwort".
- **Speicher voll beim Archivieren:** Übernahme schlägt fehl, nichts geändert (PROJ-1).
- **Demo-Stand PHUNGUN:** aktueller Stand ist SEND 00002-2026; ein passender REPLY liegt nicht als Beispieldatei vor (siehe Open Questions).

## Technical Requirements (optional)
- XSD-Prüfung serverseitig (PROJ-11), Regelwerk und Übernahme im Browser
- Archivierte Datei = hochgeladene Datei (byte-genau)
- 1.000 Einträge in wenigen Sekunden prüfen und übernehmen

## Open Questions
- [x] Demo-REPLY-Datei auf SEND 00002-2026 → festgelegt in PROJ-1: `public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML`, 30 `y`, 2 `n` mit Begründung (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| DMRL wird automatisch *freigegeben*, wenn alle Einträge freigegeben sind | Vorgabe Product Owner; PRD: Freigabe folgt aus den Einträgen | 2026-11-12 |
| `answer="y"` entfernt bei allen Eintragstypen den Eintragstyp | Vorgabe Product Owner (PROJ-7) | 2026-11-12 |
| `answer="n"` behält den Eintragstyp, Status *zu überarbeiten* | Vorgabe Product Owner (PROJ-7) | 2026-11-12 |
| Antworten nur bei geprüften Einträgen ersetzen; ungeprüfte behalten frühere Antwort | Nachweis früherer Freigaben bleibt erhalten | 2026-11-12 |
| Zusammenfassung mit abgelehnten Einträgen und künftigem DMRL-Status vor Übernahme | Bewusste Übernahme durch den Bearbeiter | 2026-11-12 |
| Kein manueller Freigabe-Schritt, kein Status *freigabebereit* | Einfacher Ablauf, eindeutiger Status | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Reihenfolge XSD (Server) → DML-Leser → Regelwerk (Browser) | Fachliche Prüfung nur bei gültiger Struktur | 2026-11-12 |
| Vergleichsbasis = archivierter XML-Text des letzten SEND | Exakt der gesendete Stand | 2026-11-12 |
| Zuordnung über DMC; Abgleich einmal berechnet | Konsistenz Prüfung/Anzeige/Speicherung | 2026-11-12 |
| Übernahme atomar inkl. Freigabe-Nachweis und Freigabestand (PROJ-14) | Grundregel DMRL freigegeben ⇔ alle Einträge freigegeben | 2026-11-12 |
| Originaldatei unverändert archiviert (Zeilenenden, Kodierung) | Byte-genauer Nachweis | 2026-11-12 |
| Abgelehnte REPLY: Verlaufseintrag; nicht verfügbare XSD-Prüfung: kein Eintrag | Nur fachliche Ablehnungen sind Workflow-Ereignisse | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der REPLY-Import ist eine Workflow-Aktion nach dem Muster aus PROJ-9. Er kombiniert die **XSD-Prüfung (PROJ-11, Server)**, den **DML-Leser je Issue** und das **Regelwerk (PROJ-8)** mit einer **Übernahme in einem Schritt**, die bei vollständiger Genehmigung zugleich die **Freigabe (PROJ-14)** auslöst. Alles außer der XSD-Prüfung läuft im Browser.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktion „REPLY importieren" (nur bei Status gesendet)
+-- REPLY-Dialog (shadcn Dialog, mehrstufig)
    +-- Schritt 1: Datei wählen (.xml/.XML, max. 5 MB)
    +-- Schritt 2: Prüfung läuft — „Schemaprüfung…" → „Fachliche Prüfung…"
    +-- Schritt 3a: Fehler
    |   +-- Prüfbericht-Anzeige (PROJ-8), Überschrift XSD bzw. Regelwerk
    |   +-- „Andere Datei wählen" · „Schließen"
    +-- Schritt 3b: Zusammenfassung
        +-- Absender (CAGE + Name) · Versionsindex · Bezug auf SEND [Versionsindex]
        +-- Zahlen: freigegeben · zu überarbeiten
        +-- Tabelle abgelehnter Einträge: DMC · Tech Name · Begründung
        +-- Bemerkung des Empfängers (falls vorhanden)
        +-- künftiger DMRL-Status (Badge „freigegeben" / „in Bearbeitung")
        +-- „Übernehmen" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte (PROJ-1). Die Übernahme schreibt in **einer** Speicherung:
- **Archivstand REPLY:** Originaldatei unverändert (auch Zeilenenden und Zeichenkodierung), DML-Code, Versionsindex des Empfängers, `dmlref`, Dateiname, Zeitpunkt, Bearbeiter, Empfänger, **zugeordneter SEND**, Anzahl freigegeben / zu überarbeiten
- **Einträge:** `answer`/`answer_comment` gesetzt; bei `y` Eintragstyp entfernt → *freigegeben*; bei `n` → *zu überarbeiten*; ungeprüfte Einträge unverändert
- **DMRL:** Status *freigegeben* bzw. *in Bearbeitung*; Bemerkung des Empfängers
- **bei Freigabe zusätzlich (PROJ-14):** Freigabe-Nachweis an der DMRL und neuer **Freigabestand** (Kopie aller Einträge)
- **Verlauf:** „REPLY [Versionsindex] von [Empfänger] übernommen — x freigegeben, y zu überarbeiten" (+ „DMRL freigegeben")

Abgelehnte Datei: nur Verlaufseintrag „REPLY abgelehnt" (Dateiname, Art/Anzahl der Fehler). Abbrechen: nichts.

### C) Prüfkontext und Abgleich
- **Vergleichsbasis:** der **archivierte XML-Text des letzten SEND**, mit demselben DML-Leser gelesen — damit wird gegen exakt das verglichen, was der Empfänger erhalten hat (PROJ-8 Gruppe G).
- **Zuordnung** REPLY-Eintrag ↔ SEND-Eintrag ↔ Eintrag der Anwendung über den **DMC**.
- **Weitere Kontextdaten:** MI des Systems, DML-Typ, Empfänger des letzten SEND, archivierte REPLYs (Duplikat), DMRL-Status.
- Das Ergebnis des Abgleichs (je Eintrag: Antwort, Begründung, künftiger Status) wird einmal berechnet und für Regelwerk, Zusammenfassung und Übernahme genutzt.

### D) Ablauf
1. Datei wählen → Typ/Größe prüfen.
2. XSD-Prüfung über den Server mit dem Issue des Systems → Fehler/nicht wohlgeformt: Bericht + Verlauf „abgelehnt"; nicht verfügbar: Abbruch ohne Verlauf.
3. DML-Leser (Issue des Systems) → gemeinsames Prüfformat → Regelwerk (A–E, I, G, H) → Fehler: Bericht + Verlauf „abgelehnt".
4. Zusammenfassung aus dem Abgleich.
5. „Übernehmen" → Verfügbarkeit erneut prüfen (Status noch *gesendet*, gleicher letzter SEND) → atomare Speicherung → Ansicht aktualisiert, Erfolgsmeldung. Sonst „Die DMRL wartet nicht mehr auf eine Antwort", nichts gespeichert.

### E) Verfügbarkeitsregel
| Aktion | Verfügbar wenn | sonst |
|---|---|---|
| REPLY importieren | berechtigt (PROJ-2) · Status *gesendet* | nicht angezeigt bzw. gesperrt mit Grund |

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Erst XSD (Server), dann Regelwerk (Browser) | Spec PROJ-11; fachliche Prüfung nur bei strukturell korrekter Datei. |
| Vergleich gegen den archivierten SEND-Text | Exakt das, was der Empfänger erhalten hat — nicht ein später veränderter Stand. |
| Abgleich einmal berechnet für Prüfung, Zusammenfassung, Übernahme | Keine Abweichung zwischen Anzeige und Speicherung. |
| Übernahme inkl. Freigabestand in einer Speicherung | Freigabe und Einträge können nicht auseinanderlaufen (PROJ-14-Grundregel). |
| Originaldatei unverändert archiviert | Byte-genauer Nachweis (PRD); Beispieldateien enthalten CRLF. |
| Mehrstufiger Dialog wie beim Check-in | Einheitliche Bedienung (PROJ-10). |

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### H) Testbarkeit
- Unit-Tests: Abgleich (y/n je Eintragstyp, ungeprüfte Einträge, `d` + `y` bleibt bestehen), DMRL-Status, Freigabestand nur bei vollständiger Freigabe, Antworten nur bei geprüften Einträgen ersetzt, Verlauf.
- Integration: Demo-REPLY besteht XSD und Regelwerk → 30/2, DMRL *in Bearbeitung*; Beispieldatei 02 im Demo-Stand → abgelehnt (Bezug/Duplikat); Testdateien 1–4.
- E2E: REPLY importieren, Zusammenfassung, Übernahme; Archiv enthält REPLY byte-genau.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-13`_

**Umgesetzt**
- `src/lib/workflows/reply.ts`:
  - Verfügbarkeit (Berechtigung, Status *gesendet*).
  - Datei lesen **unverändert** in der Kodierung laut XML-Deklaration (UTF-8, ISO-8859-1 …; Zeilenenden und BOM bleiben erhalten).
  - Prüfkontext mit dem **archivierten XML-Text des letzten SEND** als Vergleichsbasis.
  - Abgleich `replyOutcome` (einmal berechnet für Zusammenfassung und Übernahme): `y` → Eintragstyp leer, *freigegeben*; `n` → Typ bleibt, *zu überarbeiten*; nur geprüfte Einträge (Typ n/c/d mit Antwort) ändern sich, übrige behalten Status und frühere Antwort; künftiger DMRL-Status.
  - Atomare Übernahme `executeReplyImport`: Einträge, DMRL-Status, Empfänger-Bemerkung, Archiv (byte-genau, mit SEND verknüpft, Anzahlen), Verlauf; bei vollständiger Genehmigung zusätzlich **Freigabe-Nachweis und Freigabestand** (PROJ-14). Prüft vorher erneut Status und letzten SEND („Die DMRL wartet nicht mehr auf eine Antwort.").
  - Verlaufseintrag „REPLY … abgelehnt — XSD-Prüfung / Regelwerk, n Fehler".
- `src/components/workflows/reply-import-dialog.tsx` — mehrstufiger Dialog: Datei wählen (Ziehen & Ablegen oder Auswahl; `.xml`, max. 5 MB) → „Schemaprüfung …" → „Fachliche Prüfung …" → XSD-Bericht bzw. Regelwerk-Bericht (mit „XSD-Prüfung bestanden"), jeweils „Andere Datei wählen" · „Schließen"; bei nicht verfügbarer Prüfung „Erneut versuchen" (ohne Verlaufseintrag) → Zusammenfassung (Absender, „REPLY C1234 00002-2026 auf SEND 00002-2026", künftiger DMRL-Status als Badge, freigegeben/zu überarbeiten, Tabelle der abgelehnten Einträge mit Begründung, Bemerkung des Empfängers) → „Übernehmen" · „Abbrechen".
- `src/lib/dmrl/actions.ts`, `src/components/dmrl/dmrl-view.tsx` — Aktion „REPLY importieren" angebunden (sichtbar, bei anderem Status gesperrt mit Grund).

**Tests**
- Unit: `reply.test.ts` (10, u. a. Demo-REPLY 30/2, alle genehmigt → Freigabe + Freigabestand, `d` + `y` bleibt bestehen, ungeprüfte Einträge unverändert, Beispieldatei 02 abgelehnt, zurückgezogener SEND, Kodierung, vollständiger Zyklus 4.2 SEND → REPLY), `reply-import-dialog.test.tsx` (5); insgesamt 354 Unit-Tests grün.
- E2E: `tests/PROJ-13-reply.spec.ts` (3) mit echter XSD-Prüfung — Demo-REPLY übernommen und byte-genau archiviert; alle genehmigt → freigegeben; Testdateien 1–4 scheitern wie erwartet (XSD, XSD, Wohlgeformtheit, Regelwerk).

**Hinweise / Abweichungen**
- „REPLY importieren" bleibt in der Aktionsleiste sichtbar und ist außerhalb des Status *gesendet* gesperrt (Tooltip mit Grund) — wie bei den übrigen Aktionen.
- Die Statusübergänge sind in `reply.ts` umgesetzt; das zentrale Statusmodul (PROJ-14 Tech Design C) kann sie später übernehmen.

### Bugfix BUG-QA1-1 (2026-11-15) — UTF-16-Dateien
- `declaredEncoding` (`src/lib/workflows/reply.ts`) erkennt UTF-16 jetzt am BOM (`FF FE` / `FE FF`) oder — ohne BOM — am Bytemuster von „<?“ (Little/Big Endian); sonst wie bisher die XML-Deklaration (Standard UTF-8). Gemeinsamer Baustein für REPLY-Import (PROJ-13) und „XML prüfen“ (PROJ-20).
- Archiv-Download (`archiveFileBytes`, PROJ-15): UTF-16-Stände werden wieder als UTF-16 LE mit BOM ausgegeben (byte-genau für die übliche LE-Datei mit BOM; bei BE oder fehlendem BOM als LE mit BOM).
- Tests: `reply.test.ts` (LE/BE, mit/ohne BOM), `archive.test.ts` (Rundlauf Download ↔ Lesen), `qa-proj20.test.ts` (UTF-16-Test aktiviert), E2E `PROJ-20-qa.spec.ts` „UTF-16-Datei“ mit echter xmllint-Prüfung; 483 Unit-Tests grün.

### UI-Fix Dialogbreite (2026-11-16)
- Der Prüfbericht (6 Spalten inkl. „Meldung“) war im REPLY-Dialog (`sm:max-w-3xl`) abgeschnitten, der ganze Dialog musste waagerecht gescrollt werden. Dialog jetzt `sm:max-w-6xl` (bis 1152 px, auf kleineren Fenstern volle Breite abzüglich Rand) mit `[&>*]:min-w-0` — wie der Check-in-Dialog (PROJ-10). Bei sehr schmalen Fenstern scrollt nur noch die Tabelle selbst.

## QA Test Results

**Tested:** 2026-11-13
**App URL:** http://localhost:3000 (`npm run dev`); PROJ-19 zusätzlich Produktionsstart über `scripts/start.py`
**Tester:** QA Engineer (AI)
**Testumfang:** gemeinsamer QA-Lauf PROJ-7 bis PROJ-19
**Automatisiert:** Vitest 424 Tests ✅ · Startskript 12 Tests ✅ · Playwright 62/63 ✅ (1 ausstehend: BUG-QA2-4) — 58 Regressionstests + 5 neue QA-Tests (Chrome über `PW_CHANNEL=chrome`)
**Echte XSD-Prüfung:** xmllint (libxml2 2.9.13) in Unit-, Integrations- und E2E-Tests
**Browser:** Chrome (Desktop) getestet · Firefox und Safari **nicht getestet** (Playwright-Browser für diese Version nicht installiert)
**Responsive:** 375 px für alle Workflow-Seiten und Dialoge, 375/768/1440 px für die übrigen Seiten — kein waagerechtes Scrollen der Seite

### Acceptance Criteria Status
- [x] Zugriff (3/3), Prüfung (4/4), Übernahme (11/11), Demo (2/2) — Unit (`reply.test.ts`), Dialogtests, E2E (`PROJ-13-reply.spec.ts`, `QA-proj7-19.spec.ts`)
- [x] „REPLY importieren" bleibt sichtbar und ist außerhalb von *gesendet* gesperrt (mit Grund) — erfüllt „nicht verfügbar"

### Edge Cases Status
- [x] REPLY auf zurückgezogenen SEND, anderer Empfänger, `answer` ohne Eintragstyp, fehlende Ausgabedaten, alle `n`, SEND während der Zusammenfassung zurückgezogen, Speicher voll, Demo-Stand

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 21/21 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

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

## Deployment
_To be added by /deploy_
