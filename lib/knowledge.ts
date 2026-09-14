import "server-only";
import fs from "fs";
import path from "path";
import type { KnowledgeEntry, ScoredKnowledgeEntry } from "./types";

/**
 * File-based knowledge base.
 *
 * The knowledge lives in /knowledge/trading-knowledge.json (committed to the
 * repository). At runtime the file is treated as READ-ONLY — this works on
 * Vercel's serverless filesystem because we only read, never write.
 *
 * PDFs placed in /knowledge/pdfs are ingested into the JSON file ahead of
 * deployment with `npm run ingest` (see scripts/ingest-pdfs.mjs). This keeps
 * runtime search instant and avoids heavy PDF parsing in serverless functions.
 */

const KNOWLEDGE_PATH = path.join(process.cwd(), "knowledge", "trading-knowledge.json");

let cache: KnowledgeEntry[] | null = null;

export function loadKnowledge(): KnowledgeEntry[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(KNOWLEDGE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("trading-knowledge.json must contain a JSON array of entries.");
    }
    cache = parsed.filter(
      (e) => e && typeof e.title === "string" && typeof e.content === "string"
    ) as KnowledgeEntry[];
  } catch (err) {
    console.error("[knowledge] Failed to load knowledge base:", err);
    cache = [];
  }
  return cache;
}

/** Test-only cache reset. */
export function resetKnowledgeCache(): void {
  cache = null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "were",
  "has", "have", "had", "but", "not", "you", "your", "can", "will", "may",
  "its", "into", "onto", "than", "then", "them", "when", "where", "which",
  "what", "who", "how", "why", "does", "did", "about", "above", "below",
]);

/**
 * Lightweight keyword/relevance search over the local knowledge base.
 * Scoring:
 *  - keyword exact hit:        +5 per matched query token
 *  - keyword substring hit:    +2
 *  - title token hit:          +3
 *  - content token hit:        +1
 */
export function searchKnowledge(query: string, topK = 6): ScoredKnowledgeEntry[] {
  const entries = loadKnowledge();
  const qTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  if (qTokens.length === 0 || entries.length === 0) return [];

  const uniqueTokens = Array.from(new Set(qTokens));

  const scored = entries.map((entry) => {
    let score = 0;
    const keywords = (entry.keywords ?? []).map((k) => k.toLowerCase());
    const titleTokens = new Set(tokenize(entry.title));
    const contentLower = entry.content.toLowerCase();

    for (const token of uniqueTokens) {
      // keyword matches
      for (const kw of keywords) {
        if (kw === token) {
          score += 5;
        } else if (kw.includes(token) || token.includes(kw)) {
          score += 2;
        }
      }
      // title matches
      if (titleTokens.has(token)) score += 3;
      // content matches (count occurrences, capped)
      const occurrences = contentLower.split(token).length - 1;
      if (occurrences > 0) score += Math.min(occurrences, 3);
    }
    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Build one search query string from detected chart features. */
export function buildQueryFromObservations(obs: {
  trend?: string;
  candlestickPatterns?: string[];
  chartPatterns?: string[];
  marketStructure?: string;
  indicators?: string[];
}): string {
  return [
    obs.trend ?? "",
    ...(obs.candlestickPatterns ?? []),
    ...(obs.chartPatterns ?? []),
    obs.marketStructure ?? "",
    ...(obs.indicators ?? []),
    "support resistance market structure",
  ]
    .join(" ")
    .trim();
}

/** Distinct categories present in the knowledge base. */
export function getCategories(): { category: string; count: number }[] {
  const entries = loadKnowledge();
  const map = new Map<string, number>();
  for (const e of entries) {
    const c = e.category ?? "general";
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
