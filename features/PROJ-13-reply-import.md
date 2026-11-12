# PROJ-13: REPLY-Import

## Status: Architected
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-12 (SEND-Export) — letzter SEND, Partner, Status *gesendet*
- Requires: PROJ-11 (XSD-Validierung) — Schemaprüfung vor dem Regelwerk
- Requires: PROJ-8 (Fachliches Regelwerk) — Gruppen A–E, I, G, H
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „REPLY importieren", Anzeige von Status, Partner-Kommentar, Partner-Bemerkung
- Requires: PROJ-17 (Berechtigungen)
- Wirkt auf: PROJ-14 (Freigabestatus), PROJ-15 (Archiv)

## Beschreibung
Der Bearbeiter importiert die Antwort-DMRL (REPLY) des Partners als S1000D-XML. Die Datei wird gegen das Schema (PROJ-11) und das fachliche Regelwerk (PROJ-8) geprüft. Nach Sichtung einer Zusammenfassung übernimmt der Bearbeiter die Antworten: Jeder vom Partner geprüfte Eintrag wird *freigegeben* oder *zu überarbeiten*. Sind danach alle Einträge freigegeben, ist die DMRL automatisch *freigegeben*. Der REPLY wird byte-genau archiviert.

## Ablauf
1. Berechtigter Bearbeiter oder Administrator wählt **„REPLY importieren"** — nur bei DMRL-Status *gesendet*.
2. XML-Datei hochladen (`.xml`, max. 5 MB).
3. XSD-Prüfung (PROJ-11) → bei Fehler: XSD-Prüfbericht, Ende.
4. Regelwerk (PROJ-8: A–E, I, G, H) → bei Fehler: Prüfbericht, Ende.
5. **Zusammenfassung:**
   - Absender, Versionsindex und Bezug: „REPLY C1234 00001-2026 auf SEND 00002-2026"
   - „30 freigegeben · 2 zu überarbeiten"
   - Liste der abgelehnten Einträge (DMC, Tech Name, Begründung)
   - Gesamtbemerkung des Partners (`dml/remarks`)
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
| Bemerkung des Partners | gespeichert, in der Ansicht sichtbar (PROJ-7) |
| Archiv | REPLY-XML byte-genau mit Versionsindex (seqnum-diyear des Partners), Partner, Bearbeiter, Zeitpunkt; verknüpft mit dem zugehörigen SEND |
| Workflow-Verlauf | „REPLY [Versionsindex] von [Partner] übernommen — x freigegeben, y zu überarbeiten" |
| `dmlref` des nächsten SEND | verweist auf diesen REPLY (PROJ-12) |

Die Freigabe wird durch die Übernahme erteilt — kein zusätzlicher „Freigeben"-Schritt.

## User Stories
- Als **Bearbeiter** möchte ich die Antwort des Partners importieren, damit die DMRL den abgestimmten Stand zeigt.
- Als **Bearbeiter** möchte ich vor der Übernahme sehen, welche Einträge abgelehnt wurden und warum, damit ich die Überarbeitung planen kann.
- Als **Bearbeiter** möchte ich, dass fehlerhafte oder fremde REPLY-Dateien abgelehnt werden, damit keine falschen Freigaben entstehen.
- Als **Bearbeiter** möchte ich, dass die DMRL automatisch freigegeben ist, sobald der Partner alle Einträge genehmigt hat.
- Als **Product Owner** möchte ich mit der Beispieldatei 02 einen vollständigen REPLY vorführen.

## Out of Scope
- Prüfregeln → PROJ-8, XSD → PROJ-11
- Manueller „Freigeben"-Schritt bzw. Status *freigabebereit*
- Freigabe ohne REPLY („Fehler ignorieren", Anforderung 02)
- Import von Prüfprotokollen des Partners als Anhang (Anforderung 02)
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
- [ ] Angenommen die Datei ist fehlerfrei, wenn die Prüfung endet, dann zeigt die Zusammenfassung Absender, Versionsindex, Bezug, Anzahl freigegeben/zu überarbeiten, abgelehnte Einträge mit Begründung, Partner-Bemerkung und künftigen DMRL-Status

### Übernahme
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Abbrechen" gewählt wird, dann ändert sich nichts und die DMRL bleibt *gesendet*
- [ ] Angenommen ein Eintrag hat Eintragstyp `n` und `answer="y"`, wenn übernommen wird, dann ist der Eintragstyp leer und der Status *freigegeben*
- [ ] Angenommen ein Eintrag hat Eintragstyp `d` und `answer="y"`, wenn übernommen wird, dann bleibt der Eintrag in der DMRL, der Eintragstyp ist leer und der Status *freigegeben*
- [ ] Angenommen ein Eintrag hat Eintragstyp `c` und `answer="n"` mit Begründung, wenn übernommen wird, dann bleibt `c`, Status *zu überarbeiten*, und die Begründung ist in der Ansicht sichtbar
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp, wenn übernommen wird, dann bleiben Status und frühere Antwort unverändert
- [ ] Angenommen alle Einträge sind nach der Übernahme *freigegeben*, wenn die DMRL betrachtet wird, dann ist sie *freigegeben* und das Banner „Nicht freigegeben" verschwindet
- [ ] Angenommen mindestens ein Eintrag ist *zu überarbeiten*, wenn übernommen wurde, dann ist die DMRL *in Bearbeitung*
- [ ] Angenommen der REPLY enthält `dml/remarks`, wenn übernommen wird, dann ist die Bemerkung in der DMRL-Ansicht sichtbar
- [ ] Angenommen der REPLY wurde übernommen, wenn das Archiv betrachtet wird, dann ist die Datei byte-genau mit Versionsindex, Partner, Bearbeiter und Zeitpunkt gespeichert und dem SEND zugeordnet
- [ ] Angenommen der REPLY wurde übernommen, wenn der Workflow-Verlauf betrachtet wird, dann enthält er den Eintrag mit Anzahl freigegeben/zu überarbeiten
- [ ] Angenommen ein REPLY wurde übernommen, wenn dieselbe Datei erneut importiert werden soll, dann ist das nicht möglich (Status nicht *gesendet*; Duplikat laut PROJ-8)
- [ ] Angenommen der REPLY wurde übernommen, wenn danach gesendet wird, dann verweist `dmlref` des neuen SEND auf diesen REPLY

### Demo
- [ ] Angenommen der Demo-Datenbestand ist geladen (PHUNGUN nach SEND 00002-2026), wenn Beispieldatei 02 (REPLY auf SEND 00001-2026) importiert wird, dann wird sie abgelehnt mit „REPLY bezieht sich nicht auf den letzten SEND 00002-2026" bzw. „REPLY wurde bereits importiert"
- [ ] Angenommen eine Demo-REPLY-Datei auf SEND 00002-2026 mit einigen `answer="n"` liegt vor, wenn sie importiert wird, dann sind die `y`-Einträge *freigegeben*, die `n`-Einträge *zu überarbeiten* und die DMRL *in Bearbeitung*

## Edge Cases
- **REPLY auf zurückgezogenen SEND:** DMRL nicht *gesendet* → Import nicht möglich.
- **REPLY eines anderen Partners:** Regelwerk G (Absender) → abgelehnt.
- **REPLY enthält `answer` bei Einträgen ohne Eintragstyp:** Regelwerk H → abgelehnt.
- **Partner hat `issno`/Datum weggelassen:** erlaubt, Werte der Anwendung bleiben (PROJ-8 B).
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
        +-- Bemerkung des Partners (falls vorhanden)
        +-- künftiger DMRL-Status (Badge „freigegeben" / „in Bearbeitung")
        +-- „Übernehmen" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte (PROJ-1). Die Übernahme schreibt in **einer** Speicherung:
- **Archivstand REPLY:** Originaldatei unverändert (auch Zeilenenden und Zeichenkodierung), DML-Code, Versionsindex des Partners, `dmlref`, Dateiname, Zeitpunkt, Bearbeiter, Partner, **zugeordneter SEND**, Anzahl freigegeben / zu überarbeiten
- **Einträge:** `answer`/`answer_comment` gesetzt; bei `y` Eintragstyp entfernt → *freigegeben*; bei `n` → *zu überarbeiten*; ungeprüfte Einträge unverändert
- **DMRL:** Status *freigegeben* bzw. *in Bearbeitung*; Bemerkung des Partners
- **bei Freigabe zusätzlich (PROJ-14):** Freigabe-Nachweis an der DMRL und neuer **Freigabestand** (Kopie aller Einträge)
- **Verlauf:** „REPLY [Versionsindex] von [Partner] übernommen — x freigegeben, y zu überarbeiten" (+ „DMRL freigegeben")

Abgelehnte Datei: nur Verlaufseintrag „REPLY abgelehnt" (Dateiname, Art/Anzahl der Fehler). Abbrechen: nichts.

### C) Prüfkontext und Abgleich
- **Vergleichsbasis:** der **archivierte XML-Text des letzten SEND**, mit demselben DML-Leser gelesen — damit wird gegen exakt das verglichen, was der Partner erhalten hat (PROJ-8 Gruppe G).
- **Zuordnung** REPLY-Eintrag ↔ SEND-Eintrag ↔ Eintrag der Anwendung über den **DMC**.
- **Weitere Kontextdaten:** MI des Systems, DML-Typ, Partner des letzten SEND, archivierte REPLYs (Duplikat), DMRL-Status.
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
| Vergleich gegen den archivierten SEND-Text | Exakt das, was der Partner erhalten hat — nicht ein später veränderter Stand. |
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
