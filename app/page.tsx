import Link from "next/link";

const FEATURES = [
  {
    icon: "👁️",
    title: "Gemini Vision reads your chart",
    text: "Trend, candlestick & chart patterns, support/resistance, market structure and visible indicators — extracted from your screenshot.",
  },
  {
    icon: "📚",
    title: "Grounded in a local knowledge base",
    text: "Detected features are matched against a built-in library of trading concepts (seeded + your own PDFs), so explanations are grounded, not hallucinated.",
  },
  {
    icon: "⚖️",
    title: "Scenarios, never predictions",
    text: "ChartMind always presents both bullish and bearish scenarios with supporting evidence, key levels to watch, and honest uncertainty — it never claims to know the next candle.",
  },
];

const STEPS = [
  "Upload a JPG, PNG or WEBP chart screenshot",
  "Gemini Vision extracts structured observations",
  "The local knowledge base is searched for relevant concepts",
  "A final educational analysis is generated and displayed",
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="relative py-16 text-center sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center opacity-40" aria-hidden="true">
          <svg viewBox="0 0 600 200" className="h-full w-full max-w-3xl">
            <polyline
              points="0,160 60,140 120,150 180,110 240,125 300,80 360,95 420,55 480,70 540,30 600,45"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
          </svg>
        </div>

        <span className="chip mb-6 inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          AI-powered · Educational · No sign-up
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Understand any trading chart in <span className="text-red-600">seconds</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          ChartMind analyzes your chart screenshot with Gemini Vision and explains it using a
          built-in trading knowledge base — trends, patterns, key levels, and both bullish and
          bearish scenarios. It tells you what&apos;s visible, never what price &ldquo;will&rdquo; do.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/analyze" className="btn-primary text-base">
            Analyze Chart <span aria-hidden="true">→</span>
          </Link>
          <Link href="/knowledge" className="btn-secondary text-base">
            Browse Knowledge Base
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Installable as a PWA · Works on mobile &amp; desktop
        </p>
      </section>

      {/* Features */}
      <section className="grid gap-5 pb-16 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6 transition hover:border-red-200">
            <div className="mb-3 text-3xl" aria-hidden="true">{f.icon}</div>
            <h2 className="mb-2 text-base font-semibold text-slate-900">{f.title}</h2>
            <p className="text-sm leading-relaxed text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
        <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={i} className="card flex items-start gap-4 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-600">{s}</p>
            </li>
          ))}
        </ol>

        <div className="card mx-auto mt-8 max-w-4xl border-amber-200 bg-amber-50 p-5">
          <p className="text-center text-xs leading-relaxed text-amber-800">
            ⚠️ <strong>Disclaimer:</strong> ChartMind is an educational tool. All output is analysis of a
            static screenshot, not financial advice. Markets are uncertain — no AI, indicator, or pattern
            can predict what the next candle will do.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link href="/analyze" className="btn-primary">
            Analyze a Chart Now
          </Link>
        </div>
      </section>
    </div>
  );
}
