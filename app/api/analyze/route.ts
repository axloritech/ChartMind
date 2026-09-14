import { NextResponse } from "next/server";
import { generateFromImage, generateFromText, parseJsonResponse, GeminiError } from "@/lib/gemini";
import { searchKnowledge, buildQueryFromObservations } from "@/lib/knowledge";
import {
  VISION_SYSTEM,
  VISION_PROMPT,
  ANALYSIS_SYSTEM,
  buildAnalysisPrompt,
  FALLBACK_DISCLAIMER,
} from "@/lib/prompts";
import type { ChartAnalysis, ChartObservations } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds (Vercel: needs Pro plan for >10 on some setups)

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeAnalysis(raw: Record<string, unknown>, obs: ChartObservations): ChartAnalysis {
  return {
    trend: coerceString(raw.trend) || obs.trend,
    candlestickPatterns: coerceStringArray(raw.candlestickPatterns).length
      ? coerceStringArray(raw.candlestickPatterns)
      : obs.candlestickPatterns,
    chartPatterns: coerceStringArray(raw.chartPatterns).length
      ? coerceStringArray(raw.chartPatterns)
      : obs.chartPatterns,
    supportLevels: coerceStringArray(raw.supportLevels).length
      ? coerceStringArray(raw.supportLevels)
      : obs.supportLevels,
    resistanceLevels: coerceStringArray(raw.resistanceLevels).length
      ? coerceStringArray(raw.resistanceLevels)
      : obs.resistanceLevels,
    marketStructure: coerceString(raw.marketStructure) || obs.marketStructure,
    indicators: coerceStringArray(raw.indicators).length
      ? coerceStringArray(raw.indicators)
      : obs.indicators,
    observations: coerceStringArray(raw.observations).length
      ? coerceStringArray(raw.observations)
      : obs.observations,
    possibleBullishScenario: coerceString(raw.possibleBullishScenario),
    possibleBearishScenario: coerceString(raw.possibleBearishScenario),
    keyLevelsToWatch: coerceStringArray(raw.keyLevelsToWatch),
    confidence: coerceString(raw.confidence),
    educationalDisclaimer: coerceString(raw.educationalDisclaimer) || FALLBACK_DISCLAIMER,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.image !== "string" || typeof body.mimeType !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid request. Expected JSON body with 'image' (base64) and 'mimeType'." },
        { status: 400 }
      );
    }

    const mimeType = body.mimeType.toLowerCase();
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported image type. Please upload a JPG, JPEG, PNG, or WEBP file." },
        { status: 400 }
      );
    }

    const imageBase64: string = body.image.replace(/^data:[^;]+;base64,/, "");
    if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64.slice(0, 256))) {
      return NextResponse.json(
        { ok: false, error: "The uploaded file does not look like valid base64 image data." },
        { status: 400 }
      );
    }
    const approxBytes = Math.floor((imageBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image is too large (max 8 MB). Please upload a smaller screenshot." },
        { status: 413 }
      );
    }

    // ---- Step 1: Gemini Vision — extract structured observations ----
    const visionRes = await generateFromImage(imageBase64, mimeType, VISION_PROMPT, VISION_SYSTEM, {
      temperature: 0.2,
      maxOutputTokens: 3072,
    });
    const obsRaw = parseJsonResponse<Record<string, unknown>>(visionRes.text);

    const observations: ChartObservations = {
      trend: coerceString(obsRaw.trend),
      candlestickPatterns: coerceStringArray(obsRaw.candlestickPatterns),
      chartPatterns: coerceStringArray(obsRaw.chartPatterns),
      supportLevels: coerceStringArray(obsRaw.supportLevels),
      resistanceLevels: coerceStringArray(obsRaw.resistanceLevels),
      marketStructure: coerceString(obsRaw.marketStructure),
      indicators: coerceStringArray(obsRaw.indicators),
      observations: coerceStringArray(obsRaw.observations),
      timeframeGuess: coerceString(obsRaw.timeframeGuess),
      instrumentGuess: coerceString(obsRaw.instrumentGuess),
    };

    // If the vision model says this isn't a chart, stop early.
    const notChart = observations.observations
      .join(" ")
      .toLowerCase()
      .includes("not a trading chart");
    if (notChart || (!observations.trend && observations.observations.length === 0)) {
      return NextResponse.json({
        ok: false,
        error:
          "The uploaded image does not appear to be a trading chart. Please upload a screenshot of a price chart (candles, lines, indicators, etc.).",
        stage: "vision",
      }, { status: 422 });
    }

    // ---- Step 2: search the local knowledge base ----
    const query = buildQueryFromObservations(observations);
    const matched = searchKnowledge(query, 8);

    // ---- Step 3: Gemini text — final knowledge-grounded analysis ----
    const analysisRes = await generateFromText(
      buildAnalysisPrompt(
        observations,
        matched.map((m) => ({ title: m.title, content: m.content }))
      ),
      ANALYSIS_SYSTEM,
      { temperature: 0.4, maxOutputTokens: 4096 }
    );
    const analysisParsed = parseJsonResponse<Record<string, unknown>>(analysisRes.text);
    const analysis = normalizeAnalysis(analysisParsed, observations);
    const modelUsed = `${analysisRes.provider}/${analysisRes.model}`;

    return NextResponse.json({
      ok: true,
      analysis,
      modelUsed,
      matchedKnowledge: matched.map(({ score: _score, ...entry }) => entry),
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ ok: false, error: err.message, stage: "gemini" }, { status: err.status });
    }
    console.error("[/api/analyze] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong while analyzing the chart. Please try again." },
      { status: 500 }
    );
  }
}
