# knowledge/pdfs

Drop your trading PDFs here (candlestick patterns, chart patterns, support &
resistance, technical analysis, indicators, market structure, trading
concepts...).

PDFs are **not parsed at runtime**. Instead, run the ingestion script from the
project root:

```bash
npm install
npm run ingest
```

This extracts text from every PDF in this folder, splits it into overlapping
chunks, auto-tags keywords, and merges the chunks into
`../trading-knowledge.json`. Re-running the script replaces previously
ingested PDF chunks (hand-written seed entries are never touched).

Commit the updated `trading-knowledge.json` so the knowledge base deploys to
Vercel with the app.

Notes:
- Scanned/image-only PDFs cannot be text-extracted and will be skipped.
- Large PDFs add many chunks; search is keyword-scored so this stays fast.
