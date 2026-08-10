# Rezept-Studie 

Eine mobile-first Next.js-Studien-App: Jede:r Teilnehmende bekommt 3 zufaellig aus einem Pool von 6
gaengigen Gerichten ausgewaehlte Rezepte (z.B. Pfannkuchen, Nudeln, Ruehrei) und beschreibt pro Rezept
frei aus dem Gedaechtnis in maximal einer Minute, wie man es zubereitet. Die Aufnahme wird per
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

1. **`/`** — Einwilligung + Mikrofonzugriff, legt einen `Participant` an.
2. **`/study`** — Trial-Schleife (3x): Gericht anzeigen ("Kennst du ein Rezept fuer Pfannkuchen?", Ja/Nein
   wird gespeichert) -> frei beschreiben (max. 1 Minute) -> transkribieren (Whisper) -> Rezept erzeugen
   (OpenAI, rein aus der Beschreibung, kein Referenzrezept) -> bei `FLAWED`-Trials gezielten Fehler
   einbauen (OpenAI + serverseitige Validierung/Retry/Fallback) -> "Ist dieses Rezept richtig?" -> ggf.
   Fehlerstelle markieren.
3. **`/questionnaire`** — Alter, Taetigkeit, Selbsteinschaetzung, LLM-Nutzung, Korrekturlese-Verhalten, Vertrauen in KI.
4. **`/questionnaire/danke`** — Debriefing.

Siehe `prisma/schema.prisma` fuer das vollstaendige Datenmodell (`Participant`, `RecipePrompt`, `Trial`,
`QuestionnaireResponse`) und `lib/mistakes.ts` fuer die Fehler-Taxonomie samt struktureller Validierung.

## Lokale Einrichtung

```bash
npm install
cp .env.example .env   # DATABASE_URL, DIRECT_URL, OPENAI_API_KEY eintragen
npx prisma migrate dev --name init
npm run db:seed         # befuellt RecipePrompt mit dem 6-Gerichte-Pool
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

## Datenexport

`GET /api/admin/export` liefert (mit `Authorization: Bearer <ADMIN_EXPORT_TOKEN>`) eine CSV-Datei mit
einer Zeile pro Trial inkl. Fragebogen-Angaben — geeignet zum Import in SPSS/R.

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | Postgres, gepoolte Verbindung (Laufzeit) |
| `DIRECT_URL` | Postgres, direkte Verbindung (Prisma-Migrationen) |
| `OPENAI_API_KEY` | Audiotranskription (Whisper), Rezepterstellung, Fehler-Injektion |
| `ADMIN_EXPORT_TOKEN` | Schuetzt `/api/admin/export` (optional) |
