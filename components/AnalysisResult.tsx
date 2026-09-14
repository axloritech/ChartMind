"use client";

import type { ChartAnalysis, KnowledgeEntry } from "@/lib/types";

function SectionCard({
  icon,
  title,
  accent,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
          style={{ background: `${accent}14`, color: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ListItems({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400 italic">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/70" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ text, empty }: { text: string; empty: string }) {
  if (!text) return <p className="text-sm text-slate-400 italic">{empty}</p>;
  return <p className="text-sm leading-relaxed text-slate-600">{text}</p>;
}

function LevelChip({ label, tone }: { label: string; tone: "bull" | "bear" }) {
  return (
    <li
      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
        tone === "bull"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {label}
    </li>
  );
}

export default function AnalysisResult({
  analysis,
  matchedKnowledge,
}: {
  analysis: ChartAnalysis;
  matchedKnowledge: KnowledgeEntry[];
}) {
  const confidenceLower = (analysis.confidence || "").toLowerCase();
  const confidenceTone = confidenceLower.startsWith("high")
    ? "text-emerald-700 border-emerald-300 bg-emerald-50"
    : confidenceLower.startsWith("medium")
    ? "text-amber-700 border-amber-300 bg-amber-50"
    : "text-red-700 border-red-200 bg-red-50";

  return (
    <div className="space-y-5">
      {/* Confidence banner */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`chip border ${confidenceTone}`}>
          <span aria-hidden="true">◈</span> Confidence: {analysis.confidence || "not stated"}
        </span>
        <span className="chip">
          <span aria-hidden="true">📚</span> {matchedKnowledge.length} knowledge entries used
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Trend */}
        <SectionCard icon="📈" title="Trend" accent="#dc2626">
          <Paragraph text={analysis.trend} empty="No trend information returned." />
        </SectionCard>

        {/* Market structure */}
        <SectionCard icon="🧱" title="Market Structure" accent="#7c3aed">
          <Paragraph text={analysis.marketStructure} empty="No structure information returned." />
        </SectionCard>

        {/* Candlestick patterns */}
        <SectionCard icon="🕯️" title="Candlestick Patterns" accent="#d97706">
          <ListItems items={analysis.candlestickPatterns} empty="No candlestick patterns identified." />
        </SectionCard>

        {/* Chart patterns */}
        <SectionCard icon="📐" title="Chart Patterns" accent="#db2777">
          <ListItems items={analysis.chartPatterns} empty="No chart patterns identified." />
        </SectionCard>

        {/* Support */}
        <SectionCard icon="🛡️" title="Support Levels" accent="#059669">
          {analysis.supportLevels?.length ? (
            <ul className="space-y-2">
              {analysis.supportLevels.map((l, i) => (
                <LevelChip key={i} label={l} tone="bull" />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No clear support levels visible.</p>
          )}
        </SectionCard>

        {/* Resistance */}
        <SectionCard icon="🧱" title="Resistance Levels" accent="#dc2626">
          {analysis.resistanceLevels?.length ? (
            <ul className="space-y-2">
              {analysis.resistanceLevels.map((l, i) => (
                <LevelChip key={i} label={l} tone="bear" />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No clear resistance levels visible.</p>
          )}
        </SectionCard>

        {/* Indicators */}
        <SectionCard icon="📊" title="Visible Indicators" accent="#2563eb">
          <ListItems items={analysis.indicators} empty="No indicators detected on the chart." />
        </SectionCard>

        {/* Key levels to watch */}
        <SectionCard icon="🎯" title="Key Levels To Watch" accent="#0891b2">
          <ListItems items={analysis.keyLevelsToWatch} empty="No key levels highlighted." />
        </SectionCard>
      </div>

      {/* Observations — full width */}
      <SectionCard icon="🔍" title="Observations" accent="#475569">
        <ListItems items={analysis.observations} empty="No additional observations." />
      </SectionCard>

      {/* Scenarios */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card border-emerald-200 bg-emerald-50/40 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            <span aria-hidden="true">▲</span> Possible Bullish Scenario
          </h3>
          <Paragraph text={analysis.possibleBullishScenario} empty="No bullish scenario provided." />
        </section>
        <section className="card border-red-200 bg-red-50/40 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            <span aria-hidden="true">▼</span> Possible Bearish Scenario
          </h3>
          <Paragraph text={analysis.possibleBearishScenario} empty="No bearish scenario provided." />
        </section>
      </div>

      {/* Matched knowledge */}
      {matchedKnowledge.length > 0 && (
        <SectionCard icon="📖" title="Knowledge Base Entries Used" accent="#9333ea">
          <div className="grid gap-3 md:grid-cols-2">
            {matchedKnowledge.map((k, i) => (
              <details key={i} className="group rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 transition group-hover:text-red-600">
                  {k.title}
                  {k.category && (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                      {k.category}
                    </span>
                  )}
                  <span className="float-right text-slate-400 transition group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{k.content}</p>
                {k.keywords?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.keywords.slice(0, 6).map((kw) => (
                      <span key={kw} className="rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Disclaimer */}
      <section className="card border-amber-200 bg-amber-50 p-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-700">
          <span aria-hidden="true">⚠️</span> Educational Disclaimer
        </h3>
        <p className="text-sm leading-relaxed text-amber-800">{analysis.educationalDisclaimer}</p>
      </section>
    </div>
  );
}
