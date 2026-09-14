// Shared types for ChartMind

export interface KnowledgeEntry {
  title: string;
  content: string;
  keywords: string[];
  category?: string;
  source?: string; // e.g. "seed" | "pdf:<filename>#chunk-3"
}

export interface ScoredKnowledgeEntry extends KnowledgeEntry {
  score: number;
}

/** Structured observations returned by the first Gemini vision pass. */
export interface ChartObservations {
  trend: string;
  candlestickPatterns: string[];
  chartPatterns: string[];
  supportLevels: string[];
  resistanceLevels: string[];
  marketStructure: string;
  indicators: string[];
  observations: string[];
  timeframeGuess?: string;
  instrumentGuess?: string;
}

/** Educational directional lean derived from the visible evidence. */
export interface DirectionalBias {
  lean: "bullish" | "bearish" | "neutral";
  strength: "weak" | "moderate" | "strong";
  reasoning: string;
  invalidation: string;
}

/** Final structured analysis returned to the client. */
export interface ChartAnalysis {
  trend: string;
  candlestickPatterns: string[];
  chartPatterns: string[];
  supportLevels: string[];
  resistanceLevels: string[];
  marketStructure: string;
  indicators: string[];
  observations: string[];
  possibleBullishScenario: string;
  possibleBearishScenario: string;
  keyLevelsToWatch: string[];
  confidence: string;
  directionalBias: DirectionalBias;
  educationalDisclaimer: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  analysis?: ChartAnalysis;
  /** e.g. "gemini/gemini-3.5-flash" or "openai/gpt-4o-mini" — which model produced the analysis */
  modelUsed?: string;
  matchedKnowledge?: KnowledgeEntry[];
  error?: string;
  stage?: string;
}
