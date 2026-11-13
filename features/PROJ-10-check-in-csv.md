# PROJ-10: Check-in CSV

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-8 (Fachliches Regelwerk) — Prüfung, Prüfbericht, Auffüllen führender Nullen
- Requires: PROJ-9 (Check-out CSV) — Sperre, Stand beim Check-out, CSV-Aufbau
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Check-in", Anzeige von Status und Sperre
- Requires: PROJ-17 (DMRL-Berechtigungen) — Berechtigung des Sperrinhabers
- Wirkt auf: PROJ-14 (Freigabestatus) — Aufhebung der Freigabe bei Änderung; PROJ-4/5/6 — „im Workflow verwendet"

## Beschreibung
Der Sperrinhaber lädt die bearbeitete CSV-Datei hoch. Sie wird nach dem fachlichen Regelwerk (PROJ-8) gegen den Stand beim Check-out geprüft. Nur eine fehlerfreie Datei kann — nach Sichtung einer Zusammenfassung — übernommen werden; danach ist die Sperre aufgehoben. Eine fehlerhafte Datei wird vollständig abgelehnt, die Sperre bleibt bestehen.

## Ablauf
1. Sperrinhaber wählt **„Check-in"** in der DMRL-Ansicht und wählt eine CSV-Datei.
2. Prüfung nach PROJ-8 (Gruppen S, A, B, C, D, E, I, F, K) gegen den Stand beim Check-out.
3. **Fehler →** Prüfbericht (mit Download), nichts übernommen, Sperre bleibt. Erneuter Upload möglich.
4. **Keine Fehler →** Zusammenfassung:
   - Zahlen: „32 Einträge geprüft · 3 neu · 2 geändert · 27 unverändert"
   - Hinweise (z. B. aufgefüllte führende Nullen)
   - Liste der neuen und geänderten Einträge; bei geänderten je Feld alter → neuer Wert
5. **„Übernehmen"** → Daten übernommen, Status gesetzt (s. u.), Sperre aufgehoben, Erfolgsmeldung.
   **„Abbrechen"** → nichts übernommen, Sperre bleibt.

## Wer darf einchecken
| Benutzer | Check-in |
|---|---|
| Sperrinhaber (Bearbeiter oder Administrator) | ja |
| Administrator bei fremder Sperre | nein — kann die Sperre aufheben (PROJ-9) |
| anderer Bearbeiter | nein |
| DMRL nicht gesperrt | Aktion nicht verfügbar |

## Wirkung der Übernahme

**Eintragsstatus**
| Eintrag in der CSV | Eintragsstatus danach |
|---|---|
| neu (DMC vorher nicht vorhanden) | *in Bearbeitung* |
| geändert (irgendein Feld weicht ab, auch der Eintragstyp) | *in Bearbeitung* |
| unverändert | bleibt (z. B. *freigegeben*, *zu überarbeiten*, *in Bearbeitung*) |

„Unverändert" wird nach dem Auffüllen führender Nullen beurteilt (`1` → `01` ist keine Änderung).

**DMRL-Status**
| Ergebnis | DMRL-Status danach |
|---|---|
| mindestens ein Eintrag neu oder geändert | *in Bearbeitung* — eine Freigabe wird aufgehoben (PRD, PROJ-14) |
| keine Änderung | unverändert (z. B. bleibt *freigegeben*) |

**Weiteres**
- Antworten des Partners (`answer`, `answer_comment`) bleiben bei geänderten Einträgen erhalten, bis der nächste REPLY sie ersetzt; sie werden nicht mitgesendet (PROJ-12).
- Sperre wird aufgehoben.
- Workflow-Verlauf: „Check-in" mit Datum, Benutzer und Anzahl neu/geändert/unverändert (Anzeige → PROJ-15).
- Ab dem ersten abgeschlossenen Check-in gelten DMRL, System und Originator-Organisation als **im Workflow verwendet** (PROJ-4/5/6) — auch wenn nichts geändert wurde.
- Die CSV-Datei wird nicht archiviert.

## User Stories
- Als **Bearbeiter** möchte ich meine bearbeitete CSV einchecken, damit meine Änderungen in die DMRL übernommen werden.
- Als **Bearbeiter** möchte ich vor der Übernahme sehen, welche Einträge neu oder geändert sind, damit ich keine ungewollten Änderungen übernehme.
- Als **Bearbeiter** möchte ich bei Fehlern einen vollständigen Prüfbericht erhalten und die Datei korrigiert erneut hochladen können, ohne erneut auschecken zu müssen.
- Als **Bearbeiter** möchte ich nach dem Check-in sehen, welche Einträge *in Bearbeitung* sind, damit ich weiß, was mit dem nächsten SEND an den Partner geht.
- Als **Product Owner** möchte ich zeigen, dass eine freigegebene DMRL durch einen Check-in mit Änderungen ihre Freigabe verliert, ein Check-in ohne Änderungen aber nicht.

## Out of Scope
- Prüfregeln selbst → PROJ-8
- Check-out, Rücknahme, Aufheben der Sperre → PROJ-9
- Excel-Format (.xlsx) → nur CSV (PROJ-9)
- Teilweise Übernahme (nur fehlerfreie Einträge) — alles oder nichts (PROJ-8)
- Bearbeiten einzelner Einträge direkt in der Anwendung
- Check-in durch Administrator bei fremder Sperre
- Archivierung der CSV-Datei
- Anzeige des Workflow-Verlaufs → PROJ-15
- Rückgängig machen eines Check-ins

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen die DMRL ist von mir gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" verfügbar
- [ ] Angenommen die DMRL ist nicht gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen die DMRL ist von einem anderen Benutzer gesperrt, wenn ein Administrator oder Bearbeiter die Ansicht öffnet, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen ein Administrator hat die DMRL selbst ausgecheckt, wenn er „Check-in" wählt, dann ist der Check-in wie für einen Bearbeiter möglich

### Prüfung
- [ ] Angenommen eine Datei wird hochgeladen, wenn sie keine `.csv`-Datei ist, dann erscheint „Bitte eine CSV-Datei auswählen" und es wird nichts geprüft
- [ ] Angenommen eine CSV ist nicht in UTF-8 kodiert, wenn sie geprüft wird, dann wird sie mit „Datei ist nicht UTF-8-kodiert" abgelehnt
- [ ] Angenommen die Datei enthält Fehler nach PROJ-8, wenn die Prüfung endet, dann erscheint der Prüfbericht mit allen Fehlern, „Übernehmen" ist nicht verfügbar und die Sperre bleibt bestehen
- [ ] Angenommen ein Prüfbericht mit Fehlern wird angezeigt, wenn der Bearbeiter eine korrigierte Datei hochlädt, dann wird diese erneut geprüft, ohne erneuten Check-out
- [ ] Angenommen die Datei ist fehlerfrei, wenn die Prüfung endet, dann zeigt die Zusammenfassung Anzahl geprüft/neu/geändert/unverändert, Hinweise und die Liste der neuen und geänderten Einträge
- [ ] Angenommen ein Eintrag wurde geändert, wenn die Zusammenfassung angezeigt wird, dann sind je geändertem Feld alter und neuer Wert sichtbar
- [ ] Angenommen in der Datei wurde `security` von `01` zu `1` (Excel), wenn geprüft wird, dann gilt der Eintrag als unverändert und ein Hinweis auf das Auffüllen erscheint

### Übernehmen / Abbrechen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Abbrechen" gewählt wird, dann wird nichts übernommen und die Sperre bleibt bestehen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Übernehmen" gewählt wird, dann werden alle Einträge übernommen, die Sperre ist aufgehoben und eine Erfolgsmeldung erscheint
- [ ] Angenommen ein Eintrag ist neu, wenn übernommen wird, dann hat er den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag mit Status *freigegeben* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag mit Status *zu überarbeiten* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung* und `answer`/`answer_comment` bleiben erhalten
- [ ] Angenommen ein Eintrag ist unverändert, wenn übernommen wird, dann behält er seinen Status
- [ ] Angenommen bei einem Eintrag wurde nur der Eintragstyp geändert (z. B. abgelehnter Eintrag erneut mit `n`), wenn übernommen wird, dann gilt er als geändert und hat den Status *in Bearbeitung*

### DMRL-Status
- [ ] Angenommen die DMRL ist *freigegeben* und mindestens ein Eintrag wurde geändert, wenn übernommen wird, dann ist die DMRL *in Bearbeitung* und das Banner „Nicht freigegeben" erscheint
- [ ] Angenommen die DMRL ist *freigegeben* und nichts wurde geändert, wenn übernommen wird, dann bleibt sie *freigegeben* und die Sperre ist aufgehoben
- [ ] Angenommen die DMRL ist *in Bearbeitung*, wenn ein Check-in mit Änderungen übernommen wird, dann bleibt sie *in Bearbeitung*

### Nachvollziehbarkeit
- [ ] Angenommen ein Check-in wurde übernommen, wenn der Workflow-Verlauf betrachtet wird, dann enthält er „Check-in" mit Datum, Benutzer und Anzahl neu/geändert/unverändert
- [ ] Angenommen eine DMRL wurde noch nie eingecheckt, wenn ein Check-in (auch ohne Änderung) übernommen wird, dann gelten DMRL, System und Originator als „im Workflow verwendet" (PROJ-4/5/6)
- [ ] Angenommen ein Check-in wurde abgebrochen oder abgelehnt, wenn danach Organisation/System/DMRL betrachtet werden, dann hat sich am Status „im Workflow verwendet" nichts geändert

### Demo
- [ ] Angenommen die Demo-DMRL Fahrzeug wird ausgecheckt, ein neuer Eintrag mit `n` ergänzt und eingecheckt, wenn übernommen wird, dann hat die DMRL 11 Einträge, davon 1 neu *in Bearbeitung*

## Edge Cases
- **Datei einer anderen DMRL:** fällt durch Prüfung (MI, fehlende Einträge — PROJ-8 D/F).
- **Datei aus einem älteren Check-out:** wird gegen den aktuellen Stand beim Check-out geprüft; Abweichungen erscheinen als Änderungen oder Fehler.
- **Sperre wird während der Prüfung/Zusammenfassung vom Administrator aufgehoben:** „Übernehmen" schlägt fehl mit „Die Sperre wurde aufgehoben — Check-in nicht möglich"; nichts übernommen.
- **Berechtigung wird während der Sperre entzogen:** nicht möglich (PROJ-17).
- **Sehr große Datei (z. B. > 5 MB):** wird mit „Datei zu groß" abgelehnt.
- **Leere Datei / nur Kopfzeile:** Fehler laut PROJ-8.
- **Speicher voll (localStorage):** Übernahme schlägt mit Fehlermeldung fehl, Datenbestand und Sperre bleiben unverändert (PROJ-1).
- **Zwei Tabs:** Übernahme im zweiten Tab nach bereits erfolgtem Check-in schlägt fehl, da keine Sperre mehr besteht.

## Technical Requirements (optional)
- Prüfung und Übernahme im Browser, ohne Serverfunktion
- 1.000 Einträge in wenigen Sekunden prüfen und übernehmen
- Maximale Dateigröße 5 MB

## Open Questions
- [x] Soll der Prüfbericht eines abgelehnten Check-ins im Workflow-Verlauf festgehalten werden? → Eintrag „Check-in abgelehnt — n Fehler", Prüfbericht selbst wird nicht gespeichert (PROJ-15)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue und geänderte Einträge → *in Bearbeitung*; unveränderte behalten ihren Status | Vorgabe Product Owner | 2026-11-12 |
| Freigabe wird nur aufgehoben, wenn sich etwas geändert hat | PRD: freigegebene DMRL behält Status bis zur Änderung | 2026-11-12 |
| Zusammenfassung mit Vorher/Nachher vor der Übernahme | Keine ungewollten Änderungen übernehmen | 2026-11-12 |
| Abbrechen bzw. Fehler → Sperre bleibt; erneuter Upload ohne neuen Check-out | Korrektur ohne Umweg | 2026-11-12 |
| Nur der Sperrinhaber checkt ein; Administrator hebt fremde Sperren nur auf | Eindeutige Verantwortung | 2026-11-12 |
| Partner-Antworten bleiben bis zum nächsten REPLY erhalten | Begründung der Überarbeitung bleibt sichtbar | 2026-11-12 |
| Änderung nur des Eintragstyps zählt als Änderung | Erneutes Senden abgelehnter Einträge mit `n` (NSG) | 2026-11-12 |
| Erster abgeschlossener Check-in (auch ohne Änderung) → „im Workflow verwendet" | Konsistent mit PROJ-4/5/6/9 | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Mehrstufiger Check-in-Dialog (Datei → Prüfung → Bericht/Zusammenfassung → Übernahme) | Ablauf im Kontext der DMRL | 2026-11-12 |
| Vergleichsbasis = Kopie der Einträge in der Sperre | Exakter ausgecheckter Stand | 2026-11-12 |
| Zuordnung der Einträge über den DMC; Einträge behalten ihre ID | Fachlicher Schlüssel; stabile Verweise | 2026-11-12 |
| Abgleich einmal berechnet für Regelwerk, Zusammenfassung und Übernahme | Konsistente Ergebnisse | 2026-11-12 |
| Übernahme atomar (Einträge, DMRL-Status, Sperre, Verlauf) | Kein halber Check-in | 2026-11-12 |
| Abgelehnter Check-in: nur Verlaufseintrag; Abbrechen: nichts | PROJ-15 | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der Check-in ist eine Workflow-Aktion nach dem Muster aus PROJ-9 (Verfügbarkeitsregel + atomare Ausführung). Er verbindet die **Prüfung aus PROJ-8** (CSV-Leser, Regelwerk, Prüfbericht) mit einem **Abgleich** gegen den Stand beim Check-out und einer **Übernahme** in einem Schritt. Alles im Browser, kein Backend nötig.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktion „Check-in" (nur Sperrinhaber)
+-- Check-in-Dialog (shadcn Dialog, mehrstufig)
    +-- Schritt 1: Datei wählen
    |   +-- Dateiauswahl / Ablagefläche (nur .csv, max. 5 MB)
    |   +-- Hinweis bei falschem Typ, zu großer Datei oder nicht UTF-8
    +-- Schritt 2: Prüfung läuft (Fortschrittsanzeige)
    +-- Schritt 3a: Fehler
    |   +-- Prüfbericht-Anzeige (PROJ-8) mit „Bericht herunterladen"
    |   +-- „Andere Datei wählen" · „Schließen" (Sperre bleibt)
    +-- Schritt 3b: Zusammenfassung
        +-- Zahlen: geprüft · neu · geändert · unverändert
        +-- Hinweise (z. B. aufgefüllte führende Nullen)
        +-- Liste neuer Einträge (DMC, Tech Name, Eintragstyp)
        +-- Liste geänderter Einträge, je Eintrag aufklappbar (shadcn Accordion): Feld · alt → neu
        +-- „Übernehmen" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte. Die Übernahme ändert in **einer** Speicherung:
- **Einträge** der DMRL: ersetzt durch den Inhalt der Datei (mit aufgefüllten Nullen); bestehende Einträge behalten ihre ID (Zuordnung über den DMC), neue erhalten eine neue ID; Status laut Tabelle der Spec.
- **DMRL**: Status (*in Bearbeitung* bei Änderung, sonst unverändert), Sperre entfernt. Der Freigabe-Nachweis bleibt erhalten und dient als „Letzte Freigabe" (PROJ-14).
- **Verlauf**: „Check-in" mit Anzahl neu/geändert/unverändert.

Bei Ablehnung wegen Fehlern wird nur ein Verlaufseintrag „Check-in abgelehnt — n Fehler" gespeichert (PROJ-15); Abbrechen speichert nichts.

### C) Abgleich (Stand beim Check-out ↔ Datei)
- **Vergleichsbasis:** Kopie der Einträge in der Sperre (PROJ-9) — nicht der aktuelle Stand, damit der Vergleich genau dem ausgecheckten Stand entspricht.
- **Zuordnung:** über den DMC (alle 11 Teile). Ein in der Datei veränderter DMC gilt als neuer Eintrag; der alte fehlt dann → Fehler laut PROJ-8 F. Ein DMC lässt sich also nicht „umbenennen" (fachlich korrekt: alter Eintrag `d`, neuer `n`).
- **Klassifizierung:** *neu* (DMC vorher nicht vorhanden) · *geändert* (mindestens ein Feld weicht ab, inkl. Eintragstyp; nach Auffüllen der Nullen) · *unverändert*.
- Dieselbe Klassifizierung nutzt das Regelwerk (Gruppe F) — sie wird einmal berechnet und für Prüfung, Zusammenfassung und Übernahme verwendet.

### D) Abläufe
1. **Datei wählen** → Typ, Größe, UTF-8 prüfen.
2. **Prüfen** → CSV-Leser + Regelwerk (PROJ-8, Gruppen S, A–E, I, F, K) mit Prüfkontext (System-MI, Kopie aus der Sperre).
3. **Fehler** → Bericht; Verlaufseintrag „abgelehnt"; erneuter Upload möglich.
4. **Keine Fehler** → Zusammenfassung aus dem Abgleich.
5. **Übernehmen** → Verfügbarkeit erneut prüfen (Sperre noch vorhanden und eigene?) → atomare Speicherung → Dialog schließt, Ansicht zeigt neuen Stand, Erfolgsmeldung. Sperre inzwischen aufgehoben → „Die Sperre wurde aufgehoben — Check-in nicht möglich", nichts gespeichert.

### E) Verfügbarkeitsregel
| Aktion | Verfügbar wenn | sonst |
|---|---|---|
| Check-in | angemeldeter Benutzer = Sperrinhaber (Bearbeiter oder Administrator) | nicht angezeigt (andere sehen nur die Sperre) |

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Mehrstufiger Dialog statt eigener Seite | Ablauf bleibt im Kontext der DMRL; Abbrechen jederzeit. |
| Vergleich gegen die Kopie in der Sperre | Exakt der ausgecheckte Stand ist Basis — unabhängig von späteren Ereignissen. |
| Zuordnung über den DMC | Fachlicher Schlüssel; konsistent mit Regel „Einträge nicht entfernen". |
| Abgleich einmal berechnet, von Regelwerk, Zusammenfassung und Übernahme genutzt | Keine abweichenden Ergebnisse zwischen Anzeige und Speicherung. |
| Übernahme als eine Speicherung | Einträge, Status, Sperre und Verlauf ändern sich zusammen oder gar nicht. |
| Vorher/Nachher aufklappbar je Eintrag | Übersichtlich auch bei vielen Änderungen. |
| UTF-8-Prüfung vor dem Lesen | Klare Meldung statt unlesbarer Umlaute. |

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete** (PapaParse aus PROJ-8; shadcn Dialog, Accordion, Progress, Badge installiert).

### H) Testbarkeit
- Unit-Tests: Abgleich (neu/geändert/unverändert, Nullen aufgefüllt = unverändert, nur Eintragstyp geändert = geändert, veränderter DMC), Status nach Übernahme (Tabellen der Spec), DMRL-Status (freigegeben + Änderung → in Bearbeitung; ohne Änderung bleibt), Verlaufseinträge.
- E2E: Fahrzeug auschecken → Eintrag ergänzen → einchecken (11 Einträge, 1 neu); fehlerhafte Datei → Bericht, Sperre bleibt; Abbrechen; Sperre zwischenzeitlich aufgehoben.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend` (PROJ-10)_

**Umgesetzt**
- `src/lib/workflows/check-in.ts` — Verfügbarkeit (nur Sperrinhaber), Datei lesen (nur `.csv`, höchstens 5 MB, UTF-8 streng geprüft), Prüfung über PROJ-8 gegen die Kopie in der Sperre, Verlaufseintrag „Check-in abgelehnt — n Fehler" und atomare Übernahme: Einträge durch den Dateiinhalt ersetzen (IDs per DMC erhalten), neue/geänderte → *in Bearbeitung*, unveränderte behalten ihren Status; DMRL-Status → *in Bearbeitung* nur bei Änderungen (sonst bleibt er, z. B. *freigegeben*); Sperre aufheben; Verlauf „Check-in — x neu, y geändert, z unverändert". Vor der Übernahme wird erneut geprüft, ob die Sperre noch besteht.
- `src/components/workflows/check-in-dialog.tsx` — Dialog in drei Schritten: Datei wählen (Ziehen & Ablegen oder Auswahl) → Prüfung → Prüfbericht (bei Fehlern, mit „Andere Datei wählen") bzw. Zusammenfassung mit Kacheln (geprüft/neu/geändert/unverändert), Tabelle der neuen Einträge und aufklappbaren Änderungen (alt → neu je Feld) und „Übernehmen".
- `src/lib/dmrl/actions.ts`, `src/components/dmrl/dmrl-view.tsx` — Aktion „Check-in" für den Sperrinhaber angebunden.

**Tests**: `check-in.test.ts` (8), `check-in-dialog.test.tsx` (5); `dmrl-view.test.tsx` angepasst (Check-in nur für den Sperrinhaber sichtbar) — insgesamt 280 Unit-Tests grün.

**Hinweise**
- Dateifehler (Typ, Größe, Kodierung) werden im Auswahlschritt gemeldet und nicht im Verlauf protokolliert; nur fachlich abgelehnte Dateien erzeugen „Check-in abgelehnt".
- Browser-E2E-Tests stehen aus → `/qa`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
