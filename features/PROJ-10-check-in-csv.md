# PROJ-10: Check-in CSV

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

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
- [ ] Soll der Prüfbericht eines abgelehnten Check-ins im Workflow-Verlauf festgehalten werden? (→ PROJ-15)

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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
