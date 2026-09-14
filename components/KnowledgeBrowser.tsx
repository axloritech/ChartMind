"use client";

import { useMemo, useState } from "react";
import type { KnowledgeEntry } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  "candlestick-patterns": "🕯️ Candlestick Patterns",
  "chart-patterns": "📐 Chart Patterns",
  "support-resistance": "🛡️ Support & Resistance",
  "market-structure": "🧱 Market Structure",
  indicators: "📊 Indicators",
  "technical-analysis": "🔬 Technical Analysis",
  "trading-concepts": "💡 Trading Concepts",
  general: "📄 General",
};

function categoryLabel(c: string) {
  return CATEGORY_LABELS[c] ?? c;
}

/** Mirror of the server-side scoring, kept lightweight for instant client search. */
function scoreEntry(entry: KnowledgeEntry, tokens: string[]): number {
  let score = 0;
  const keywords = (entry.keywords ?? []).map((k) => k.toLowerCase());
  const title = entry.title.toLowerCase();
  const content = entry.content.toLowerCase();
  for (const t of tokens) {
    for (const kw of keywords) {
      if (kw === t) score += 5;
      else if (kw.includes(t) || t.includes(kw)) score += 2;
    }
    if (title.includes(t)) score += 3;
    if (content.includes(t)) score += 1;
  }
  return score;
}

export default function KnowledgeBrowser({
  entries,
  categories,
}: {
  entries: KnowledgeEntry[];
  categories: { category: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let list = entries;
    if (activeCategory) list = list.filter((e) => (e.category ?? "general") === activeCategory);

    if (tokens.length === 0) return list;

    return list
      .map((e) => ({ e, s: scoreEntry(e, tokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [entries, query, activeCategory]);

  const pdfCount = entries.filter((e) => String(e.source ?? "").startsWith("pdf:")).length;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search concepts — e.g. hammer, double top, RSI divergence, liquidity sweep…"
          className="input !pl-11"
          aria-label="Search the knowledge base"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`chip transition ${!activeCategory ? "!border-accent/50 !text-accent" : "hover:!text-white"}`}
        >
          All ({entries.length})
        </button>
        {categories.map(({ category, count }) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(activeCategory === category ? null : category)}
            className={`chip transition ${
              activeCategory === category ? "!border-accent/50 !text-accent" : "hover:!text-white"
            }`}
          >
            {categoryLabel(category)} ({count})
          </button>
        ))}
      </div>

      {/* Results */}
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {entries.length} entries
        {pdfCount > 0 && ` · ${pdfCount} ingested from PDFs`}
      </p>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl" aria-hidden="true">🤷</p>
          <p className="mt-3 text-sm font-semibold text-white">No matching entries</p>
          <p className="mt-1 text-xs text-slate-500">
            Try different keywords, or add PDFs to /knowledge/pdfs and run <code className="font-mono">npm run ingest</code>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry, i) => (
            <article key={`${entry.title}-${i}`} className="card flex flex-col p-5 transition hover:border-accent/25">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold text-white">{entry.title}</h2>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {categoryLabel(entry.category ?? "general")}
                </span>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-slate-400">{entry.content}</p>
              {entry.keywords?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.keywords.slice(0, 8).map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setQuery(kw)}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-accent/10 hover:text-accent"
                      title={`Search for "${kw}"`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              )}
              {entry.source && String(entry.source).startsWith("pdf:") && (
                <p className="mt-3 truncate text-[10px] text-slate-600">Source: {entry.source}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
