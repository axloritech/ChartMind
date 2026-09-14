import { loadKnowledge, getCategories } from "@/lib/knowledge";
import KnowledgeBrowser from "@/components/KnowledgeBrowser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge Base — ChartMind",
  description:
    "Search ChartMind's local trading knowledge base: candlestick patterns, chart patterns, support & resistance, indicators, market structure and trading concepts.",
};

export default function KnowledgePage() {
  const entries = loadKnowledge();
  const categories = getCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Trading <span className="text-red-600">Knowledge Base</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {entries.length} entries across {categories.length} categories. This is the same local
          knowledge ChartMind searches when explaining your charts — seeded concepts plus chunks
          ingested from PDFs in{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-red-600">/knowledge/pdfs</code>.
        </p>
      </div>

      <KnowledgeBrowser entries={entries} categories={categories} />
    </div>
  );
}
