# ChartMind 🕯️🧠

**AI trading-chart analysis — educational, knowledge-grounded, never predictive.**

ChartMind is a full-stack **Next.js + TypeScript + Tailwind CSS** PWA. You upload a screenshot of a
trading chart, **Gemini Vision** extracts what's visible (trend, candlestick & chart patterns,
support/resistance, market structure, indicators), the app searches a **local file-based knowledge
base** for relevant trading concepts, and Gemini composes a final structured educational analysis
with **both bullish and bearish scenarios** — never a prediction of the next candle.

No Supabase. No Firebase. No MongoDB. No external database — the knowledge base is a JSON file in
the repository.

---

## ✨ Features

- 📸 **Chart upload** — drag & drop or browse, JPG / JPEG / PNG / WEBP, max 8 MB, with preview
- 👁️ **Gemini Vision analysis** — two-pass pipeline (observations → knowledge-grounded analysis)
- 📚 **Local knowledge base** — `/knowledge/trading-knowledge.json`, searched at runtime by keyword scoring
- 📄 **PDF ingestion** — drop trading PDFs into `/knowledge/pdfs`, run `npm run ingest`, get searchable JSON chunks
- 🧾 **Structured results** — trend, patterns, levels, market structure, indicators, scenarios, key levels, confidence, disclaimer — rendered as professional dashboard cards
- ⚖️ **Safe AI behavior** — system prompts forbid price predictions; both scenarios + uncertainty are always required
- 🔒 **Secure** — `GEMINI_API_KEY` only ever exists on the server (API route); never sent to the browser
- 📱 **PWA** — installable on mobile/desktop, service worker caches the app shell + knowledge base for offline browsing
- 🌙 **Dark fintech UI** — responsive Tailwind design

## 🗂️ Project structure

```
chartmind/
├── app/
│   ├── page.tsx                  # "/" landing page
│   ├── analyze/page.tsx          # "/analyze" upload + pipeline + results
│   ├── knowledge/page.tsx        # "/knowledge" searchable knowledge browser
│   ├── api/
│   │   ├── analyze/route.ts      # POST — the full AI pipeline (server-side)
│   │   └── knowledge/route.ts    # GET  — knowledge search API
│   ├── layout.tsx                # shell + PWA metadata
│   └── globals.css
├── components/
│   ├── Header.tsx / Footer.tsx
│   ├── AnalysisResult.tsx        # result dashboard cards
│   ├── AnalysisLoader.tsx        # staged loading animation
│   ├── KnowledgeBrowser.tsx      # client-side search UI
│   └── ServiceWorkerRegister.tsx
├── lib/
│   ├── knowledge.ts              # load + search the local knowledge base (server-only)
│   ├── gemini.ts                 # minimal Gemini REST client (server-only)
│   ├── prompts.ts                # vision/analysis prompts + AI safety rules
│   └── types.ts
├── knowledge/
│   ├── trading-knowledge.json    # the knowledge base (seeded + PDF chunks)
│   └── pdfs/                     # ← put your trading PDFs here
├── scripts/
│   └── ingest-pdfs.mjs           # PDF → searchable JSON chunks
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # service worker
│   └── icons/
├── .env.example
└── README.md
```

## 🚀 Local setup

1. **Clone & install**

   ```bash
   git clone <your-repo-url> chartmind
   cd chartmind
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-3.5-flash
   ```

   Get a key at <https://aistudio.google.com/apikey>.
   ⚠️ `GEMINI_API_KEY` must **never** be prefixed with `NEXT_PUBLIC_` and must **never** be committed.

3. **Run**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## 📄 Adding your own PDFs to the knowledge base

1. Place PDFs (candlestick patterns, chart patterns, support/resistance, technical analysis,
   indicators, market structure, trading concepts…) into `knowledge/pdfs/`.
2. Run the ingestion script:

   ```bash
   npm run ingest
   ```

   It extracts text, splits it into ~1200-char overlapping chunks, auto-tags keywords, guesses
   categories, and merges everything into `knowledge/trading-knowledge.json`. Re-running replaces
   previous PDF chunks; hand-written seed entries (`source: "seed"`) are never touched.
3. Commit the updated `trading-knowledge.json`.

Notes:
- Scanned/image-only PDFs have no extractable text and are skipped.
- Runtime never parses PDFs — it only reads the JSON, so it's fast and works on serverless.

### Knowledge entry format

```json
[
  {
    "title": "Hammer Candlestick",
    "content": "Educational explanation of the hammer pattern...",
    "keywords": ["hammer", "candlestick", "reversal", "bullish"],
    "category": "candlestick-patterns",
    "source": "seed"
  }
]
```

## 🔄 How the analysis pipeline works

```
User uploads screenshot
        │  (base64, client → server API route; key never leaves the server)
        ▼
POST /api/analyze
        │
        ├─ 1. Gemini Vision pass → structured observations JSON
        │      (trend, candlestick/chart patterns, S/R levels, structure, indicators…)
        │
        ├─ 2. Local knowledge search → top 8 entries scored against the observations
        │
        ├─ 3. Gemini text pass (observations + knowledge excerpts + strict safety rules)
        │      → final ChartAnalysis JSON
        ▼
Dashboard cards: trend · patterns · levels · structure · indicators ·
bullish scenario · bearish scenario · key levels · confidence · **buy/sell-side educational lean** · disclaimer
```

### Structured response shape

```json
{
  "trend": "",
  "candlestickPatterns": [],
  "chartPatterns": [],
  "supportLevels": [],
  "resistanceLevels": [],
  "marketStructure": "",
  "indicators": [],
  "observations": [],
  "possibleBullishScenario": "",
  "possibleBearishScenario": "",
  "keyLevelsToWatch": [],
  "confidence": "",
  "directionalBias": {
    "lean": "bullish | bearish | neutral",
    "strength": "weak | moderate | strong",
    "reasoning": "visible evidence behind the lean",
    "invalidation": "what would flip the lean"
  },
  "educationalDisclaimer": ""
}
```

## ▲ Deploy to Vercel (from GitHub)

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New → Project** and import the repo.
   Next.js is auto-detected — no build settings changes needed.
3. In **Project → Settings → Environment Variables**, add:

   | Name             | Value                     | Environment              |
   | ---------------- | ------------------------- | ------------------------ |
   | `GEMINI_API_KEY` | your key                  | Production, Preview, Dev |
   | `GEMINI_MODEL`   | e.g. `gemini-3.5-flash`   | Production, Preview, Dev |

4. **Deploy.**

Deployment notes:
- The knowledge base is a committed JSON file — it ships with the build and is **read-only at
  runtime**, which is exactly what Vercel's serverless filesystem requires. No DB, no volumes.
- If you add PDFs later: run `npm run ingest` **locally**, commit the updated
  `knowledge/trading-knowledge.json`, and push — Vercel redeploys automatically.
- The `/api/analyze` route sets `maxDuration = 60`. On Vercel Hobby the effective limit may be
  lower; if analyses time out on large models, use a fast model (e.g. `gemini-3.5-flash`) or upgrade.
- **Model resilience:** Google retires Gemini model IDs regularly (`gemini-2.0-flash` was shut down
  June 1, 2026) and popular models occasionally return 503 "high demand". ChartMind handles both:
  it retries overloaded models with backoff, then falls through the chain
  `GEMINI_MODEL → gemini-3.5-flash → gemini-3.8-flash → gemini-2.5-flash → gemini-3.1-flash-lite`.
  If you also set an optional `OPENAI_API_KEY`, it finally falls back across providers to
  `gpt-4o-mini → gpt-4o`. The results dashboard shows which model produced the analysis.

## 🔐 Security

- `GEMINI_API_KEY` is read **only** inside `lib/gemini.ts`, which imports `server-only` — importing
  it from client code fails the build.
- Images are sent to the API route as base64 in the request body and forwarded to Gemini; nothing
  is written to disk.
- Uploads are validated: MIME allowlist (JPEG/PNG/WEBP), 8 MB cap, base64 sanity check.
- The service worker never caches `/api/analyze`.

## ⚠️ Disclaimer

ChartMind is an **educational tool**. It analyzes static screenshots with limited context, always
presents both bullish and bearish scenarios, and never claims to know what price will do next.
Nothing it outputs is financial advice. Trading involves substantial risk of loss.
