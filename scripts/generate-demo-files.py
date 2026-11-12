#!/usr/bin/env python3
"""Erzeugt die Demo-Dateien zum Hochladen in public/demo-dateien/ (PROJ-1, Abschnitt E).

Grundlage ist SEND 00002-2026 der Demo-DMRL PHUNGUN (S1000D Issue 2.3).
Die Dateien werden einmalig erzeugt und als feste Dateien ins Projekt übernommen.
Prüfung mit xmllint: src/lib/data/demo-files.test.ts

Aufruf: python3 scripts/generate-demo-files.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src/data/demo/DML-PHUNGUN-D0815-C-2026-00002_001-00.XML"
TARGET = ROOT / "public/demo-dateien"

REPLY_NAME = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

# Zwei abgelehnte Einträge (Position unter den Einträgen mit Eintragstyp n, 0-basiert) mit Begründung
REJECTIONS = {
    4: "Tech Name entspricht nicht der SNS – bitte prüfen",
    11: "Infocode nicht im beauftragten Leistungsumfang",
}
PARTNER_REMARKS = "Bitte abgelehnte Einträge überarbeiten."

NEW_DMLREF = """   <dmlref>
      <dmlc>
         <modelic>PHUNGUN</modelic>
         <sendid>D0815</sendid>
         <dmltype type="c"/>
         <diyear>2026</diyear>
         <seqnum>00002</seqnum>
      </dmlc>
      <issno issno="001" inwork="00" type="new"/>
   </dmlref>
"""


def answer_block(answer: str, comment: str) -> str:
    return (
        f'      <answer answer="{answer}">\n'
        f"         <remarks>{comment}</remarks>\n"
        "      </answer>\n"
        "      <remarks></remarks>\n"
    )


def build_reply(send: str, sendid: str = "C1234") -> str:
    """Antwort des Partners auf SEND 00002: alle d und n genehmigt außer REJECTIONS."""
    text = send.replace('<dml direction="send"', '<dml direction="reply"', 1)

    # Kopf: Absender, Ausgabedatum, Verweis auf SEND 00002
    head_end = text.index("<dmentry")
    head, body = text[:head_end], text[head_end:]
    head = head.replace("<sendid>D0815</sendid>", f"<sendid>{sendid}</sendid>", 1)
    head = re.sub(r'<issdate day="\d+" month="\d+" year="\d+"/>', '<issdate day="15" month="10" year="2026"/>', head, count=1)
    head = re.sub(r"   <dmlref>.*?</dmlref>\n", NEW_DMLREF, head, count=1, flags=re.S)

    # Einträge: Antworten ergänzen (nur Einträge mit Eintragstyp, PROJ-8 H)
    n_index = -1

    def add_answer(match: re.Match[str]) -> str:
        nonlocal n_index
        entry = match.group(0)
        entry_type = match.group(1)
        if entry_type == "n":
            n_index += 1
        rejected = entry_type == "n" and n_index in REJECTIONS
        block = answer_block("n", REJECTIONS[n_index]) if rejected else answer_block("y", "")
        return entry.replace("   </dmentry>", block + "   </dmentry>")

    body = re.sub(r'<dmentry type="([ncd])">.*?</dmentry>', add_answer, body, flags=re.S)
    body = body.replace("</dml>", f"   <remarks>{PARTNER_REMARKS}</remarks>\n</dml>", 1)
    return head + body


def remove_first_dmc(xml: str) -> str:
    """Testdatei 1: im ersten Eintrag fehlt das Pflichtelement <dmc>."""
    return re.sub(r"<dmc>.*?</dmc>\s*", "", xml, count=1, flags=re.S)


WRONG_ISSUE = """<?xml version="1.0" encoding="utf-8"?>
<dml listDirection="reply">
   <identAndStatusSection>
      <dmlAddress>
         <dmlIdent>
            <dmlCode modelIdentCode="PHUNGUN" senderIdent="C1234" dmlType="c" yearOfDataIssue="2026" seqNumber="00002"/>
            <issueInfo issueNumber="001" inWork="00"/>
         </dmlIdent>
         <dmlAddressItems>
            <issueDate year="2026" month="10" day="15"/>
         </dmlAddressItems>
      </dmlAddress>
      <dmlStatus issueType="new">
         <security securityClassification="01"/>
         <brexDmRef>
            <dmRef>
               <dmRefIdent>
                  <dmCode modelIdentCode="S1000D" systemDiffCode="F" systemCode="04" subSystemCode="1" subSubSystemCode="0" assyCode="0301" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/>
               </dmRefIdent>
            </dmRef>
         </brexDmRef>
      </dmlStatus>
   </identAndStatusSection>
   <dmlContent>
      <dmlEntry dmlEntryType="n">
         <dmRef>
            <dmRefIdent>
               <dmCode modelIdentCode="PHUNGUN" systemDiffCode="A" systemCode="A00" subSystemCode="0" subSubSystemCode="0" assyCode="1000" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
               <language languageIsoCode="de" countryIsoCode="DE"/>
            </dmRefIdent>
         </dmRef>
         <responsiblePartnerCompany enterpriseCode="D7177"/>
         <answer answerToEntry="y"/>
      </dmlEntry>
   </dmlContent>
</dml>
"""

README = """Demo-Dateien zum Hochladen (DMRL Management System – Prototyp)
==============================================================

Alle Dateien beziehen sich auf die Demo-DMRL PHUNGUN (S1000D Issue 2.3) im Demo-Ausgangszustand
(aktueller Stand: SEND 00002-2026, wartet auf REPLY). Erzeugt mit scripts/generate-demo-files.py.

DML-PHUNGUN-C1234-C-2026-00002_001-00.XML
    Gültige Antwort (REPLY) des Partners C1234 auf SEND 00002-2026.
    Alle 11 Löschungen (d) und 19 neue Einträge (n) genehmigt, 2 Einträge abgelehnt mit Begründung.
    Ergebnis nach dem Import: 30 freigegeben, 2 zu überarbeiten, DMRL "in Bearbeitung".

TEST-1_Pflichtelement-fehlt.XML
    Im ersten Eintrag fehlt das Pflichtelement <dmc> → scheitert an der XSD-Prüfung.

TEST-2_Falsches-Issue.XML
    Struktur von S1000D Issue 4.2 statt 2.3 → scheitert an der XSD-Prüfung.

TEST-3_Kein-gueltiges-XML.XML
    Abgeschnittene Datei (schließendes Tag fehlt) → "Die Datei ist kein gültiges XML".

TEST-4_Falscher-Absender.XML
    Schemagültig, aber Absender C9999 statt C1234 → besteht die XSD-Prüfung,
    scheitert am fachlichen Regelwerk ("REPLY stammt nicht vom Partner C1234").
"""


def main() -> None:
    send = SOURCE.read_text(encoding="utf-8")
    if "\r\n" in send:
        raise SystemExit("Unerwartete CRLF-Zeilenenden in der Quelldatei")
    reply = build_reply(send)

    files = {
        REPLY_NAME: reply,
        "TEST-1_Pflichtelement-fehlt.XML": remove_first_dmc(reply),
        "TEST-2_Falsches-Issue.XML": WRONG_ISSUE,
        "TEST-3_Kein-gueltiges-XML.XML": reply[: reply.rindex("</dml>")],
        "TEST-4_Falscher-Absender.XML": build_reply(send, sendid="C9999"),
        "LIESMICH.txt": README,
    }
    TARGET.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (TARGET / name).write_text(content, encoding="utf-8", newline="\n")
        print(f"geschrieben: {TARGET.relative_to(ROOT) / name}")


if __name__ == "__main__":
    main()
