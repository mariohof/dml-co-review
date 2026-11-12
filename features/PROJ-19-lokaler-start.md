# PROJ-19: Lokaler Start (Python-Startskript)

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-11 (XSD-Validierung) — xmllint wird als Voraussetzung geprüft
- Betrifft alle Features: startet die gesamte Anwendung lokal
- Bezug: PROJ-1 (Daten bleiben im Browser; Formatwechsel nach Update → Hinweis „Demo-Daten neu laden")

## Beschreibung
Der Prototyp läuft nur lokal auf einem Rechner mit macOS, Windows 11 oder Linux (PRD). Damit der Product Owner und andere Anwender ihn ohne Entwicklerkenntnisse starten können, gibt es **Startdateien zum Doppelklicken** je Betriebssystem. Sie rufen ein **Python-Startskript** auf, das die Voraussetzungen prüft, die Anwendung bei Bedarf installiert und baut, sie lokal startet und den Browser öffnet.

## Startdateien (Doppelklick)
| Betriebssystem | Datei | Verhalten |
|---|---|---|
| macOS | `Start.command` | prüft Python 3; fehlt es → Meldung, Fenster wartet auf Tastendruck; sonst Python-Startskript mit Port 8877 und Browser öffnen; bei Fehler bleibt das Fenster offen |
| Windows 11 | `Start.bat` | wie macOS; probiert `py` und `python` |
| Linux | `start.sh` | wie macOS |

Alle drei liegen im Hauptordner des Projekts.

## Python-Startskript
1. **Voraussetzungen prüfen**
   | Voraussetzung | Mindestversion | fehlt / zu alt |
   |---|---|---|
   | Python | 3.9 | verständliche Meldung mit benötigter Version |
   | Node.js | 20 LTS | Abbruch mit Installationshinweis je Betriebssystem |
   | xmllint | beliebig | Abbruch mit Installationshinweis (macOS vorinstalliert, Linux `libxml2-utils`, Windows libxml2-Binärpaket inkl. Pfad) |

   Keine automatische Installation von Node.js oder xmllint.
2. **Pakete installieren** — nur beim ersten Start oder wenn sich die Paketliste geändert hat.
3. **App bauen** — nur beim ersten Start oder wenn sich der Projektstand geändert hat (Update); `--neu-bauen` erzwingt den Neubau.
4. **App starten** im Produktionsmodus, **nur unter localhost** erreichbar, Standard-Port **8877**. Ist der Port belegt, **Abbruch** mit „Port 8877 ist belegt — läuft die Anwendung bereits? Dann einfach http://localhost:8877 im Browser öffnen." (kein Ausweichen, da die Browser-Daten an die Adresse gebunden sind).
5. **Warten**, bis die App erreichbar ist, dann **Standard-Browser öffnen** (außer `--kein-browser`).
6. **Konsole:** deutsche Fortschrittsmeldungen („Prüfe Voraussetzungen … ok", „Baue Anwendung …"), am Ende „Anwendung läuft unter http://localhost:8877 — Beenden mit Strg+C oder Fenster schließen".
7. **Beenden** mit Strg+C oder Schließen des Fensters: App stoppt sauber; Daten bleiben im Browser.

**Optionen:** Port als Zahl (z. B. `8877`), `--open` / `--kein-browser`, `--neu-bauen`.

## Weitergabe & Update
- Weitergabe als **Projektordner** (ZIP oder Git-Klon) mit Kurzanleitung **`START-HIER.md`** (Voraussetzungen je Betriebssystem, Doppelklick-Start, macOS „Rechtsklick → Öffnen" beim ersten Start, Beenden).
- **Update:** neuer Projektstand wird eingespielt; das Skript erkennt die Änderung beim nächsten Start und installiert/baut neu.
- **Daten** bleiben im Browser; bei geändertem Datenformat greift PROJ-1 (Hinweis + „Demo-Daten neu laden").

## User Stories
- Als **Product Owner** möchte ich den Prototyp per Doppelklick starten, damit ich ihn ohne Entwicklerkenntnisse vorführen kann.
- Als **Anwender** möchte ich bei fehlenden Voraussetzungen eine klare Meldung mit Installationshinweis für mein Betriebssystem erhalten, damit ich das Problem selbst lösen kann.
- Als **Anwender** möchte ich, dass sich nach dem Start automatisch der Browser mit der Anwendung öffnet.
- Als **Anwender** möchte ich, dass ein zweiter Start schnell geht (ohne erneutes Installieren und Bauen), wenn sich nichts geändert hat.
- Als **Anwender** möchte ich nach einem Update einfach wieder doppelklicken können, ohne manuelle Schritte.
- Als **Anwender** möchte ich die Anwendung sauber beenden können, ohne meine Daten zu verlieren.

## Out of Scope
- Automatische Installation von Node.js, xmllint oder Python
- Installer-Pakete (.dmg, .msi), App-Symbole, Autostart
- Betrieb als Server für mehrere Rechner / Netzwerkzugriff (nur localhost)
- Cloud-Hosting (Vercel o. ä.) — PRD
- Automatische Update-Prüfung oder Download neuer Versionen
- Datensicherung/Übertragung der Browser-Daten auf einen anderen Rechner
- Entwicklungsmodus (`npm run dev`) — bleibt für Entwickler wie gehabt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Startdateien
- [ ] Angenommen macOS mit Python 3, Node.js 20+ und xmllint, wenn `Start.command` doppelgeklickt wird, dann startet die Anwendung und der Browser öffnet `http://localhost:8877`
- [ ] Angenommen Windows 11 mit `py` oder `python`, Node.js und xmllint, wenn `Start.bat` doppelgeklickt wird, dann startet die Anwendung und der Browser öffnet sich
- [ ] Angenommen Linux mit Python 3, Node.js und xmllint, wenn `start.sh` ausgeführt wird, dann startet die Anwendung und der Browser öffnet sich
- [ ] Angenommen Python 3 ist nicht installiert, wenn eine Startdatei ausgeführt wird, dann erscheint „Python 3 wurde nicht gefunden. Bitte Python 3 installieren und erneut starten." und das Fenster wartet auf einen Tastendruck
- [ ] Angenommen das Startskript endet mit einem Fehler, wenn es aus einer Startdatei aufgerufen wurde, dann bleibt das Fenster offen, bis eine Taste gedrückt wird

### Voraussetzungen
- [ ] Angenommen Python ist älter als 3.9, wenn das Startskript läuft, dann meldet es die benötigte Version und beendet sich
- [ ] Angenommen Node.js fehlt oder ist älter als 20, wenn das Startskript läuft, dann bricht es mit einem Installationshinweis für das erkannte Betriebssystem ab
- [ ] Angenommen xmllint fehlt, wenn das Startskript läuft, dann bricht es mit einem Installationshinweis für das erkannte Betriebssystem ab
- [ ] Angenommen eine Voraussetzung fehlt, wenn das Startskript abbricht, dann wurde nichts installiert oder gestartet

### Installieren, Bauen, Starten
- [ ] Angenommen der erste Start, wenn das Startskript läuft, dann werden Pakete installiert, die App gebaut, gestartet und der Browser geöffnet
- [ ] Angenommen ein zweiter Start ohne Änderung am Projektstand, wenn das Startskript läuft, dann wird weder installiert noch gebaut
- [ ] Angenommen der Projektstand wurde aktualisiert, wenn das Startskript läuft, dann wird automatisch neu installiert (falls nötig) und neu gebaut
- [ ] Angenommen `--neu-bauen` wird angegeben, wenn das Startskript läuft, dann wird die App neu gebaut
- [ ] Angenommen Port 8877 ist belegt, wenn das Startskript läuft, dann bricht es mit dem Hinweis „Port 8877 ist belegt — läuft die Anwendung bereits? …" ab und startet keine zweite Instanz
- [ ] Angenommen ein anderer Port wird ausdrücklich angegeben (z. B. `8900`), wenn das Startskript läuft, dann startet die App auf diesem Port und die Konsole weist darauf hin, dass dort ein eigener Datenbestand im Browser gilt
- [ ] Angenommen ein anderer Rechner im Netzwerk ruft die Adresse des Rechners auf, wenn die App läuft, dann ist sie dort nicht erreichbar (nur localhost)
- [ ] Angenommen `--kein-browser` wird angegeben, wenn die App gestartet ist, dann öffnet sich kein Browser, die Adresse steht in der Konsole
- [ ] Angenommen Installation oder Build schlagen fehl, wenn das Startskript läuft, dann erscheint eine verständliche Meldung mit Hinweis auf die Ursache und das Skript endet mit Fehler

### Betrieb & Beenden
- [ ] Angenommen die App läuft, wenn die XSD-Prüfung (PROJ-11) genutzt wird, dann funktioniert sie mit dem geprüften xmllint
- [ ] Angenommen die App läuft, wenn Strg+C gedrückt oder das Fenster geschlossen wird, dann wird sie beendet und der Port wieder frei
- [ ] Angenommen Daten wurden in der Anwendung geändert, wenn die App beendet und erneut gestartet wird, dann sind die Daten im selben Browser weiterhin vorhanden

### Weitergabe
- [ ] Angenommen der Projektordner wird weitergegeben, wenn `START-HIER.md` geöffnet wird, dann beschreibt sie Voraussetzungen je Betriebssystem, den Start per Doppelklick, den macOS-Hinweis „Rechtsklick → Öffnen" und das Beenden

## Edge Cases
- **macOS blockiert die Startdatei (Gatekeeper/Quarantäne):** Kurzanleitung beschreibt „Rechtsklick → Öffnen"; Startdatei ist als ausführbar gespeichert.
- **Projektordner mit Leerzeichen oder Umlauten im Pfad** (z. B. „DMRL Prüfung"): Start funktioniert trotzdem.
- **Windows: xmllint nicht im Systempfad:** Hinweis, den Pfad in der Einstellung von PROJ-11 anzugeben bzw. in den Systempfad aufzunehmen.
- **Zweimal gestartet:** zweiter Start bricht ab, da Port 8877 belegt ist; Hinweis, die bereits laufende Anwendung im Browser zu öffnen.
- **Port 8877 durch ein anderes Programm belegt:** Abbruch mit Hinweis; Ausweg: anderen Port angeben — mit Hinweis, dass dort ein eigener Datenbestand gilt (Kurzanleitung).
- **Keine Internetverbindung beim ersten Start:** Paketinstallation scheitert → Meldung „Für den ersten Start ist eine Internetverbindung nötig".
- **Build-Ordner beschädigt:** `--neu-bauen` als Hinweis in der Fehlermeldung.
- **Standard-Browser lässt sich nicht öffnen:** Adresse steht in der Konsole zum manuellen Öffnen.

## Technical Requirements (optional)
- Nur Python-Standardbibliothek (keine zusätzlichen Python-Pakete)
- Läuft unter macOS, Windows 11, Linux
- Zweiter Start ohne Änderung in wenigen Sekunden bis zur geöffneten Anwendung

## Open Questions
- [x] Browser-Daten hängen am Port: bei belegtem Port 8877 abbrechen statt ausweichen? → Ja, Abbruch mit Hinweis; anderer Port nur auf ausdrückliche Angabe (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Start per Doppelklick über Startdatei je Betriebssystem, die ein Python-Startskript aufruft | Vorgabe Product Owner (Beispiel `Start.command`) | 2026-11-12 |
| Standard-Port 8877, Browser wird geöffnet | Vorgabe Product Owner (Beispiel) | 2026-11-12 |
| Belegter Port → Abbruch statt Ausweichport; anderer Port nur ausdrücklich | Browser-Daten sind an die Adresse gebunden — Daten immer unter derselben Adresse | 2026-11-12 |
| Prüfung von Python ≥ 3.9, Node.js ≥ 20, xmllint; keine automatische Installation | Kein Systemeingriff, keine Administratorrechte nötig | 2026-11-12 |
| Installieren/Bauen nur bei Bedarf, `--neu-bauen` als Ausweg | Schneller Start im Alltag | 2026-11-12 |
| Nur localhost erreichbar | Lokaler Betrieb laut PRD; keine Zugriffssteuerung nötig (PROJ-11) | 2026-11-12 |
| Weitergabe als Projektordner mit `START-HIER.md`; Update durch neuen Projektstand, automatischer Neubau | Einfach, ohne Installer | 2026-11-12 |
| Fenster bleibt bei Fehlern offen | Meldungen bleiben lesbar | 2026-11-12 |

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
