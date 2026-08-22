# Änderungen – 18.08.2026

## 1. Alternatives Gericht bei „Nein“

- Bei der Frage „Kennst du ein Rezept für …?“ lädt **Nein** ein anderes aktives Gericht.
- Der bestehende Trial bleibt erhalten; die Versuchsbedingung und Trial-Reihenfolge ändern sich nicht.
- Bereits in diesem Trial abgelehnte Gerichte werden nicht erneut vorgeschlagen.
- Abgelehnte Prompt-IDs werden in `Trial.rejectedPromptIds` gespeichert.

## 2. Audio vor Generierung erneut aufnehmen

- Nach einer Aufnahme erscheint ein Audio-Player.
- Die Person kann die Aufnahme verwenden oder **bis zu 3-mal zusätzlich neu aufnehmen**.
- Erst „Aufnahme verwenden“ startet Whisper und anschließend die Rezeptgenerierung.
- Die Zahl der abgeschlossenen Aufnahmeversuche wird in `Trial.recordingAttempts` gespeichert.
- Wenn Whisper keine verständliche Sprache erkennt, wird eine technische Wiederholung erlaubt; diese wird nicht von den drei freiwilligen Neuaufnahmen abgezogen.

## 3. Begründung pro markierter Rezeptzeile

- Bei „Ist dieses Rezept richtig?“ → „Nein“ können Zutaten und Schritte markiert werden.
- Jede markierte Zeile benötigt eine Begründung aus einem passenden Dropdown.
- Die Begründung wird als `reason` innerhalb von `participantFlaggedItems` gespeichert.
- `participantFlaggedItems`, `rejectedPromptIds` und `recordingAttempts` sind im CSV-Export enthalten.

## Deployment

Die neue Prisma-Migration muss auf der Datenbank ausgeführt werden. Für Vercel kann der Build Command weiterhin lauten:

```bash
npx prisma migrate deploy && npm run db:seed && npm run build
```

Danach ein neues Deployment auslösen. Die Migration `20260818210000_add_prompt_rejections_recording_attempts` legt die neuen Datenbankspalten an.

## Admin-Dashboard

Neu hinzugefügt:

- `/admin` als geschütztes Live-Dashboard.
- Zugriff mit dem vorhandenen `ADMIN_EXPORT_TOKEN` (Token wird nur in `sessionStorage` des Browsers gehalten).
- `/api/admin/stats` liefert aggregierte Studienkennzahlen und ist ebenfalls per Bearer-Token geschützt.
- Dashboard-Kennzahlen: Teilnehmende, Completion, Accuracy, Sensitivity, Specificity, False-Positive-Rate, Fehlerlokalisation, Prüfzeit und Aufnahmeversuche.
- Auswertungen nach Fehlertyp, Gericht, Kocherfahrung und KI-Vertrauen.
- Kreuztabelle der gewählten Begründungen gegen den tatsächlich eingebauten Fehlertyp.
- CSV-Download direkt aus dem Dashboard.
- FLAWED-Trials mit technischem Generierungs-Fallback werden aus den Kernquoten ausgeschlossen und separat angezeigt.

Es ist keine zusätzliche Prisma-Migration für das Dashboard nötig.
