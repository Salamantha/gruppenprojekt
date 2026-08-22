"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Rate = number | null;

type DashboardData = {
  generatedAt: string;
  overview: {
    participants: number;
    completedParticipants: number;
    completionRate: Rate;
    answeredTrials: number;
    evaluableTrials: number;
    invalidFallbackTrials: number;
    controlTrials: number;
    flawedTrials: number;
    accuracy: Rate;
    sensitivity: Rate;
    specificity: Rate;
    falsePositiveRate: Rate;
    localizationRate: Rate;
    localizationGivenDetection: Rate;
    medianReviewTimeMs: number | null;
    averageRecordingAttempts: number | null;
  };
  mistakeBreakdown: Array<{
    mistakeType: string;
    total: number;
    detected: number;
    detectionRate: Rate;
    localized: number;
    localizationRate: Rate;
  }>;
  promptBreakdown: Array<{
    promptTitle: string;
    total: number;
    correct: number;
    accuracy: Rate;
  }>;
  reasonCounts: Record<string, Record<string, number>>;
  accuracyByCookingSkill: Array<{ value: number; total: number; accuracy: Rate }>;
  accuracyByAiTrust: Array<{ value: number; total: number; accuracy: Rate }>;
  participants: Array<{
    id: string;
    createdAt: string;
    completedAt: string | null;
    answeredTrials: number;
    evaluableTrials: number;
    accuracy: Rate;
  }>;
};

const MISTAKE_LABELS: Record<string, string> = {
  WRONG_QUANTITY: "Falsche Menge",
  WRONG_UNIT: "Falsche Einheit",
  OMITTED_INGREDIENT: "Zutat fehlt",
  OMITTED_STEP: "Schritt fehlt",
  HALLUCINATED_INGREDIENT: "Erfundene Zutat",
  HALLUCINATED_STEP: "Erfundener Schritt",
  WRONG_TIME_OR_TEMPERATURE: "Falsche Zeit / Temperatur",
  OTHER: "Anderer Grund",
};

function formatRate(value: Rate): string {
  return value === null ? "–" : `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
}

function formatDuration(value: number | null): string {
  if (value === null) return "–";
  return `${(value / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`;
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function RateBar({ value }: { value: Rate }) {
  const width = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" aria-label={formatRate(value)}>
      <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
    </div>
  );
}

function Section({ title, children, subtitle }: { title: string; children: ReactNode; subtitle?: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem("study-admin-token") ?? "";
    if (stored) {
      setToken(stored);
      setTokenInput(stored);
    }
  }, []);

  const loadData = useCallback(async (authToken: string) => {
    if (!authToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("Admin-Token ist nicht korrekt.");
      if (!response.ok) throw new Error("Dashboard-Daten konnten nicht geladen werden.");
      const result = (await response.json()) as DashboardData;
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadData(token);
  }, [token, loadData]);

  function submitToken(event: FormEvent) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    if (!nextToken) return;
    window.sessionStorage.setItem("study-admin-token", nextToken);
    setToken(nextToken);
  }

  function logout() {
    window.sessionStorage.removeItem("study-admin-token");
    setToken("");
    setTokenInput("");
    setData(null);
    setError("");
  }

  async function downloadCsv() {
    if (!token) return;
    setError("");
    const response = await fetch("/api/admin/export", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError("CSV-Export konnte nicht geladen werden.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `study-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const reasonColumns = useMemo(() => {
    if (!data) return [];
    const reasons = new Set<string>();
    (Object.values(data.reasonCounts) as Array<Record<string, number>>).forEach((row) =>
      Object.keys(row).forEach((reason) => reasons.add(reason))
    );
    return Array.from(reasons).sort();
  }, [data]);

  if (!token || (!data && !loading)) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-950">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Studienverwaltung</p>
          <h1 className="mt-3 text-3xl font-bold">Admin-Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gib den Wert deiner Vercel-Umgebungsvariable <code className="rounded bg-slate-100 px-1.5 py-0.5">ADMIN_EXPORT_TOKEN</code> ein.
            Der Token wird nur für diese Browser-Sitzung gespeichert.
          </p>
          <form onSubmit={submitToken} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Admin-Token
              <input
                type="password"
                autoComplete="current-password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
                placeholder="ADMIN_EXPORT_TOKEN"
              />
            </label>
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
              Dashboard öffnen
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading && !data) {
    return <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">Dashboard wird geladen …</main>;
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Live-Auswertung</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Studien-Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">
              Letzte Berechnung: {new Date(data.generatedAt).toLocaleString("de-DE")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadData(token)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-100">
              Aktualisieren
            </button>
            <button onClick={() => void downloadCsv()} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
              CSV herunterladen
            </button>
            <button onClick={logout} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-100">
              Abmelden
            </button>
          </div>
        </header>

        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Teilnehmende" value={String(data.overview.participants)} note={`${data.overview.completedParticipants} abgeschlossen · ${formatRate(data.overview.completionRate)} Completion`} />
          <StatCard label="Accuracy" value={formatRate(data.overview.accuracy)} note={`${data.overview.evaluableTrials} auswertbare Trials`} />
          <StatCard label="Fehler erkannt" value={formatRate(data.overview.sensitivity)} note={`${data.overview.flawedTrials} gültige FLAWED-Trials`} />
          <StatCard label="Korrekte Rezepte akzeptiert" value={formatRate(data.overview.specificity)} note={`False-Positive-Rate: ${formatRate(data.overview.falsePositiveRate)}`} />
          <StatCard label="Fehler lokalisiert" value={formatRate(data.overview.localizationRate)} note={`Unter erkannten Fehlern: ${formatRate(data.overview.localizationGivenDetection)}`} />
          <StatCard label="Median Prüfzeit" value={formatDuration(data.overview.medianReviewTimeMs)} note="Nur auswertbare Trials" />
          <StatCard label="Ø Aufnahmeversuche" value={data.overview.averageRecordingAttempts?.toLocaleString("de-DE", { maximumFractionDigits: 2 }) ?? "–"} note="Über beantwortete Trials" />
          <StatCard label="Technische Fallbacks" value={String(data.overview.invalidFallbackTrials)} note="Werden aus Kernquoten ausgeschlossen" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Section title="Erkennung nach Fehlertyp" subtitle="Detection und korrekte Lokalisation in gültigen FLAWED-Trials.">
            <div className="space-y-5">
              {data.mistakeBreakdown.map((row) => (
                <div key={row.mistakeType}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold">{MISTAKE_LABELS[row.mistakeType] ?? row.mistakeType}</span>
                    <span className="whitespace-nowrap text-slate-500">n={row.total}</span>
                  </div>
                  <div className="grid grid-cols-[86px_1fr_55px] items-center gap-3 text-xs">
                    <span className="text-slate-500">Erkannt</span><RateBar value={row.detectionRate} /><span className="text-right font-semibold">{formatRate(row.detectionRate)}</span>
                    <span className="text-slate-500">Lokalisiert</span><RateBar value={row.localizationRate} /><span className="text-right font-semibold">{formatRate(row.localizationRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Accuracy nach Gericht" subtitle="Anteil korrekter Entscheidungen für CONTROL und gültige FLAWED-Trials zusammen.">
            <div className="space-y-4">
              {data.promptBreakdown.map((row) => (
                <div key={row.promptTitle} className="grid grid-cols-[minmax(110px,1fr)_2fr_60px] items-center gap-3 text-sm">
                  <div><p className="font-semibold">{row.promptTitle}</p><p className="text-xs text-slate-500">n={row.total}</p></div>
                  <RateBar value={row.accuracy} />
                  <span className="text-right font-semibold">{formatRate(row.accuracy)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Section title="Kocherfahrung vs. Accuracy" subtitle="Explorativ: Selbsteinschätzung 1 (niedrig) bis 5 (hoch).">
            <div className="space-y-3">
              {data.accuracyByCookingSkill.map((row) => (
                <div key={row.value} className="grid grid-cols-[80px_1fr_60px] items-center gap-3 text-sm">
                  <span className="font-semibold">Stufe {row.value} <span className="font-normal text-slate-400">(n={row.total})</span></span>
                  <RateBar value={row.accuracy} />
                  <span className="text-right font-semibold">{formatRate(row.accuracy)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="KI-Vertrauen vs. Accuracy" subtitle="Explorativ: Vertrauen in die Richtigkeit von KI, Stufe 1 bis 5.">
            <div className="space-y-3">
              {data.accuracyByAiTrust.map((row) => (
                <div key={row.value} className="grid grid-cols-[80px_1fr_60px] items-center gap-3 text-sm">
                  <span className="font-semibold">Stufe {row.value} <span className="font-normal text-slate-400">(n={row.total})</span></span>
                  <RateBar value={row.accuracy} />
                  <span className="text-right font-semibold">{formatRate(row.accuracy)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-6">
          <Section title="Begründungen: tatsächlicher vs. vermuteter Fehlertyp" subtitle="Jede ausgewählte Begründung wird gezählt. Bei mehreren Markierungen in einem Trial können mehrere Zellen befüllt sein.">
            {reasonColumns.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Begründungen vorhanden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white px-3 py-3 text-left font-semibold text-slate-500">Tatsächlicher Fehler</th>
                      {reasonColumns.map((reason) => <th key={reason} className="min-w-32 px-3 py-3 text-center text-xs font-semibold text-slate-500">{MISTAKE_LABELS[reason] ?? reason}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.reasonCounts).map(([mistakeType, counts]) => (
                      <tr key={mistakeType} className="border-t border-slate-100">
                        <th className="sticky left-0 bg-white px-3 py-3 text-left font-semibold">{MISTAKE_LABELS[mistakeType] ?? mistakeType}</th>
                        {reasonColumns.map((reason) => <td key={reason} className="px-3 py-3 text-center tabular-nums">{counts[reason] ?? 0}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="mt-6">
          <Section title="Letzte Teilnehmende" subtitle="Maximal 100 Einträge. IDs sind pseudonyme Datenbank-IDs.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-3">ID</th><th className="px-3 py-3">Start</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Trials</th><th className="px-3 py-3">Accuracy</th></tr>
                </thead>
                <tbody>
                  {data.participants.map((participant) => (
                    <tr key={participant.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-mono text-xs">{participant.id.slice(0, 8)}…</td>
                      <td className="whitespace-nowrap px-3 py-3">{new Date(participant.createdAt).toLocaleString("de-DE")}</td>
                      <td className="px-3 py-3">{participant.completedAt ? <span className="font-semibold text-emerald-700">Abgeschlossen</span> : <span className="text-amber-700">Offen</span>}</td>
                      <td className="px-3 py-3">{participant.answeredTrials} beantwortet / {participant.evaluableTrials} auswertbar</td>
                      <td className="px-3 py-3 font-semibold">{formatRate(participant.accuracy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Hinweis: Die Dashboard-Auswertung ist deskriptiv. Für die finale wissenschaftliche Inferenz (z. B. Mixed-Effects-Modelle) den CSV-Export in R, Python, SPSS oder Jamovi analysieren.
        </p>
      </div>
    </main>
  );
}
