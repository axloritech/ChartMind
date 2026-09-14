/**
 * ChartMind PDF ingestion script
 * ------------------------------
 * Converts every PDF in /knowledge/pdfs into searchable JSON chunks and
 * merges them into /knowledge/trading-knowledge.json.
 *
 * Usage:
 *   1. Drop your trading PDFs (candlestick patterns, chart patterns,
 *      support/resistance, indicators, market structure, ...) into
 *      knowledge/pdfs/
 *   2. Run:  npm install   (pdf-parse is a devDependency)
 *   3. Run:  npm run ingest
 *
 * Behavior:
 *   - Text is extracted per PDF, split into overlapping chunks (~1200 chars).
 *   - Chunks with too little meaningful text are skipped (cover pages, etc.).
 *   - Each chunk gets auto-generated keywords (frequent trading terms).
 *   - Previously ingested chunks (source: "pdf:<file>...") are REPLACED, so
 *     re-running after editing/removing a PDF stays consistent.
 *   - Hand-written seed entries (source: "seed") are never touched.
 *
 * Run this BEFORE deploying to Vercel and commit the updated
 * trading-knowledge.json — the deployed app only reads the JSON at runtime.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, "..");
const PDF_DIR = path.join(ROOT, "knowledge", "pdfs");
const JSON_PATH = path.join(ROOT, "knowledge", "trading-knowledge.json");

const CHUNK_SIZE = 1200; // characters
const CHUNK_OVERLAP = 200;
const MIN_CHUNK_TEXT = 150; // skip chunks shorter than this

// Vocabulary used to auto-tag keywords for each chunk.
const TRADING_TERMS = [
  "hammer", "shooting star", "doji", "engulfing", "marubozu", "spinning top",
  "morning star", "evening star", "three white soldiers", "three black crows",
  "hanging man", "inverted hammer", "tweezer", "harami",
  "head and shoulders", "double top", "double bottom", "triple top", "triple bottom",
  "triangle", "wedge", "flag", "pennant", "rectangle", "cup and handle", "rounded bottom",
  "support", "resistance", "trendline", "channel", "breakout", "retest", "fakeout",
  "trend", "uptrend", "downtrend", "consolidation", "range", "reversal", "continuation",
  "higher high", "higher low", "lower high", "lower low", "market structure",
  "break of structure", "change of character", "liquidity", "order block",
  "supply", "demand", "volume", "momentum", "volatility",
  "rsi", "macd", "moving average", "ema", "sma", "bollinger", "stochastic",
  "atr", "fibonacci", "retracement", "ichimoku", "vwap", "obv",
  "candlestick", "candle", "wick", "shadow", "body", "price action",
  "risk management", "stop loss", "position sizing", "risk reward",
  "divergence", "confluence", "timeframe", "order flow", "psychology",
];

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/-\n/g, "") // join hyphenated line breaks
    .trim();
}

function chunkText(text) {
  const chunks = [];
  // Prefer splitting on paragraph boundaries.
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      // overlap: keep the tail of the previous chunk
      current = current.slice(-CHUNK_OVERLAP) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
    while (current.length > CHUNK_SIZE * 1.6) {
      chunks.push(current.slice(0, CHUNK_SIZE).trim());
      current = current.slice(CHUNK_SIZE - CHUNK_OVERLAP);
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks.filter((c) => c.length >= MIN_CHUNK_TEXT);
}

function extractKeywords(text, limit = 10) {
  const lower = text.toLowerCase();
  const found = [];
  for (const term of TRADING_TERMS) {
    if (lower.includes(term)) {
      const count = lower.split(term).length - 1;
      found.push({ term, count });
    }
  }
  found.sort((a, b) => b.count - a.count);
  const keywords = found.slice(0, limit).map((f) => f.term);
  if (keywords.length === 0) keywords.push("trading", "technical analysis");
  return Array.from(new Set(keywords));
}

function guessCategory(keywords) {
  const has = (arr) => arr.some((k) => keywords.includes(k));
  if (has(["hammer", "doji", "engulfing", "marubozu", "shooting star", "morning star", "evening star", "candlestick", "hanging man", "inverted hammer", "tweezer", "harami", "three white soldiers", "three black crows", "spinning top", "wick"]))
    return "candlestick-patterns";
  if (has(["head and shoulders", "double top", "double bottom", "triangle", "wedge", "flag", "pennant", "rectangle", "cup and handle", "triple top", "triple bottom", "rounded bottom"]))
    return "chart-patterns";
  if (has(["support", "resistance", "trendline", "channel"])) return "support-resistance";
  if (has(["higher high", "lower low", "market structure", "break of structure", "change of character", "liquidity"]))
    return "market-structure";
  if (has(["rsi", "macd", "moving average", "ema", "sma", "bollinger", "stochastic", "atr", "fibonacci", "ichimoku", "vwap", "obv", "volume"]))
    return "indicators";
  if (has(["risk management", "stop loss", "position sizing", "risk reward", "psychology"]))
    return "trading-concepts";
  return "technical-analysis";
}

function deriveTitle(chunk, fallback, index) {
  // Use the first non-empty line if it looks like a heading (short, not ending in a comma)
  const firstLine = chunk.split("\n").map((l) => l.trim()).find((l) => l.length > 3);
  if (firstLine && firstLine.length <= 80 && !/[.,;:]$/.test(firstLine)) {
    return firstLine;
  }
  // Otherwise: first sentence, truncated
  const sentence = chunk.split(/(?<=[.!?])\s/)[0] ?? "";
  const title = sentence.slice(0, 70).trim();
  if (title.length > 15) return title.endsWith(".") ? title : title + "…";
  return `${fallback} — part ${index + 1}`;
}

async function main() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
    console.log(`Created ${PDF_DIR} — drop PDFs there and re-run.`);
  }

  const pdfFiles = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  let entries = [];
  if (fs.existsSync(JSON_PATH)) {
    try {
      entries = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
    } catch (e) {
      console.error("Existing trading-knowledge.json is invalid JSON:", e.message);
      process.exit(1);
    }
  }

  // Remove previously ingested PDF chunks so re-runs stay consistent.
  const kept = entries.filter((e) => !String(e.source ?? "").startsWith("pdf:"));
  const removed = entries.length - kept.length;

  if (pdfFiles.length === 0) {
    console.log("No PDFs found in knowledge/pdfs — nothing new to ingest.");
    if (removed > 0) {
      fs.writeFileSync(JSON_PATH, JSON.stringify(kept, null, 2));
      console.log(`Removed ${removed} stale pdf chunk(s) and rewrote trading-knowledge.json.`);
    }
    return;
  }

  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
  } catch {
    console.error('pdf-parse is not installed. Run "npm install" first (it is a devDependency).');
    process.exit(1);
  }

  const newEntries = [];
  for (const file of pdfFiles) {
    const filePath = path.join(PDF_DIR, file);
    process.stdout.write(`Ingesting ${file} ... `);
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      const text = cleanText(data.text ?? "");
      if (text.length < MIN_CHUNK_TEXT) {
        console.log("skipped (too little extractable text — possibly scanned/image PDF).");
        continue;
      }
      const chunks = chunkText(text);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const keywords = extractKeywords(chunk);
        newEntries.push({
          title: deriveTitle(chunk, path.basename(file, ".pdf"), i),
          content: chunk,
          keywords,
          category: guessCategory(keywords),
          source: `pdf:${file}#chunk-${i + 1}`,
        });
      }
      console.log(`${chunks.length} chunk(s).`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  const output = [...kept, ...newEntries];
  fs.writeFileSync(JSON_PATH, JSON.stringify(output, null, 2));
  console.log(
    `\nDone. trading-knowledge.json now has ${output.length} entries ` +
    `(${kept.length} kept, ${newEntries.length} added from PDFs, ${removed} stale removed).`
  );
  console.log("Commit knowledge/trading-knowledge.json so the update deploys with the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
