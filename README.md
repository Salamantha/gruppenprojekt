# Rezept-Studie 

Eine mobile-first Next.js-Studien-App: Jede:r Teilnehmende bekommt 3 zufaellig aus einem Pool von 9
gaengigen Gerichten ausgewaehlte Rezepte (z.B. Pfannkuchen, Gulasch, Lieblings-Nudelsauce) und beschreibt
pro Rezept frei aus dem Gedaechtnis in maximal einer Minute, wie man es zubereitet. Kennt jemand ein
Gericht nicht, wird automatisch ein anderes aus dem Pool angeboten, sodass am Ende immer 3 bekannte
Rezepte beschrieben werden. Vor dem Start gibt es einen kostenlosen, rein lokalen Mikrofon-Test, und nach
jeder Aufnahme kann sie beliebig oft verworfen und neu aufgenommen werden, bevor sie hochgeladen wird
(kostet also nichts, solange noch nichts abgeschickt wurde). Die Aufnahme wird per
**OpenAI Whisper** transkribiert und per **OpenAI** in ein strukturiertes Rezept umgewandelt —
(in der Regel bei zwei von drei Rezepten) mit einem gezielt eingebauten, praezise nachverfolgten
Fehler versehen. Teilnehmende beurteilen, ob das Rezept korrekt ist, und koennen die vermutete
Fehlerstelle markieren. Am Ende steht ein kurzer Fragebogen. Alle Daten landen strukturiert in
Postgres (via Prisma) fuer die statistische Auswertung.

Alle drei KI-Schritte (Transkription, Rezepterstellung, Fehler-Injektion) laufen ueber denselben
OpenAI-Account. Die Whisper-Transkription kostet ca. $0.006 pro Minute Audio, die
Recipe-/Mistake-Aufrufe nutzen `gpt-4o-mini` — fuer eine ganze Studie liegen die Gesamtkosten typisch
im niedrigen einstelligen Dollarbereich.

## Ablauf

1. **`/`** — ausfuehrlichere (aber kompakte, scrollbare) Erklaerung des Ablaufs, Einwilligung,
   Mikrofonzugriff + lokaler Mikrofon-Test (kein Upload), legt einen `Participant` an.
2. **`/study`** — Trial-Schleife (3x): Gericht anzeigen ("Kennst du ein Rezept fuer Pfannkuchen?") ->
   bei "Nein" automatisch ein anderes, noch nicht angebotenes Gericht aus dem Pool vorschlagen (loop, bis
   "Ja" oder Pool erschoepft — ist dann auch keine Alternative mehr da, wird die Person von der Studie
   ausgeschlossen, siehe `/excluded`) -> frei beschreiben (max. 1 Minute) -> Aufnahme anhoeren, optional
   beliebig oft neu aufnehmen (kostenlos, vor dem Absenden) -> transkribieren (Whisper) -> Rezept erzeugen
   (OpenAI, rein aus der Beschreibung, kein Referenzrezept) -> bei `FLAWED`-Trials gezielten Fehler
   einbauen (OpenAI + serverseitige Validierung/Retry/Fallback) -> "Ist dieses Rezept richtig?" -> ggf.
   Fehlerstellen markieren und fuer jede markierte Stelle eine **Begruendung auswaehlen** (Pflichtfeld).
3. **`/questionnaire`** — Alter, Taetigkeit, Selbsteinschaetzung (Fehlererkennung), LLM-Nutzung,
   Korrekturlese-Verhalten, Vertrauen in die inhaltliche Richtigkeit von KI-generierten Texten.
4. **`/questionnaire/danke`** — Debriefing.

Siehe `prisma/schema.prisma` fuer das vollstaendige Datenmodell (`Participant`, `RecipePrompt`, `Trial`,
`QuestionnaireResponse`) und `lib/mistakes.ts` fuer die Fehler-Taxonomie samt struktureller Validierung.

## Lokale Einrichtung

```bash
npm install
cp .env.example .env   # DATABASE_URL, DIRECT_URL, OPENAI_API_KEY eintragen
npx prisma migrate dev --name init
npm run db:seed         # befuellt RecipePrompt mit dem 9-Gerichte-Pool
npm run dev
```

Fuer einen lokalen Postgres reicht z.B. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`
mit `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`. `DIRECT_URL` kann dabei mit
`DATABASE_URL` identisch sein (nur bei gepoolten Verbindungen wie Neon braucht man beide getrennt).

Mikrofonzugriff (`MediaRecorder`) erfordert einen sicheren Kontext — `http://localhost` funktioniert,
ein Zugriff ueber die LAN-IP eines Handys (`http://192.168.x.x`) dagegen nicht. Zum Testen auf einem
echten Smartphone entweder ein Vercel-Preview-Deployment nutzen oder lokal per HTTPS-Tunnel (z.B. ngrok).

## Deployment auf Vercel

1. Repo bei [vercel.com](https://vercel.com) importieren ("Add New Project"). Root Directory bleibt `.`.
2. **Storage** → **Create Database** → **Neon** (Vercel Postgres) anlegen — injiziert automatisch
   gepoolte/ungepoolte Connection-Strings.
3. Environment Variables setzen: `DATABASE_URL` (gepoolt), `DIRECT_URL` (ungepoolt, fuer Prisma-Migrationen),
   `OPENAI_API_KEY`, optional `ADMIN_EXPORT_TOKEN`.
4. Lokal: `npx vercel env pull .env.local` → `npx prisma migrate deploy` → `npm run db:seed` (einmalig,
   gegen die echte Datenbank).
5. Deployen (Push auf `main`, oder `vercel --prod`).
6. Auf einem echten Smartphone den kompletten Ablauf durchklicken (Mikrofon, Aufnahme, Review, Fragebogen).

## Datenexport & Admin-Dashboard

`GET /api/admin/export` liefert (mit `Authorization: Bearer <ADMIN_EXPORT_TOKEN>`) eine CSV-Datei mit
einer Zeile pro Trial inkl. Fragebogen-Angaben, Begruendungen und Aufnahmeversuchen — geeignet zum
Import in SPSS/R.

**`/admin`** ist ein geschuetztes Live-Dashboard (Token wird nur im `sessionStorage` des Browsers
gehalten, kein separates Login). Zeigt Teilnehmende, Completion/Exclusion, Accuracy, Sensitivity,
Specificity, False-Positive-Rate, Fehlerlokalisation, Pruefzeit und Aufnahmeversuche, Auswertungen nach
Fehlertyp/Gericht/KI-Vertrauen sowie eine Kreuztabelle der gewaehlten Begruendungen gegen den tatsaechlich
eingebauten Fehlertyp. FLAWED-Trials mit technischem Generierungs-Fallback werden aus den Kernquoten
ausgeschlossen und separat ausgewiesen. CSV-Download direkt aus dem Dashboard moeglich.

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | Postgres, gepoolte Verbindung (Laufzeit) |
| `DIRECT_URL` | Postgres, direkte Verbindung (Prisma-Migrationen) |
| `OPENAI_API_KEY` | Audiotranskription (Whisper), Rezepterstellung, Fehler-Injektion |
| `ADMIN_EXPORT_TOKEN` | Schuetzt `/api/admin/export` (optional) |
