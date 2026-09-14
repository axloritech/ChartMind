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
  educationalDisclaimer: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  analysis?: ChartAnalysis;
  matchedKnowledge?: KnowledgeEntry[];
  error?: string;
  stage?: string;
}
