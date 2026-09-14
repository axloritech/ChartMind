import "server-only";

/**
 * Minimal Gemini API client (REST, no SDK dependency).
 * The API key is read from process.env on the server ONLY.
 *
 * Model resilience: Google retires Gemini model IDs regularly (e.g.
 * gemini-2.0-flash was shut down June 1, 2026). If the configured
 * GEMINI_MODEL returns 404, we automatically retry with known-good
 * fallback models instead of failing the request.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Known-good models, newest first (as of Sept 2026). */
const MODEL_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
];

export function getGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured on the server. Add it to .env.local (or Vercel environment variables) and restart.",
      500
    );
  }
  const model = process.env.GEMINI_MODEL?.trim() || MODEL_FALLBACKS[0];
  return { apiKey, model };
}

/** Ordered list of models to try: configured one first, then known-good fallbacks. */
export function getModelCandidates(): string[] {
  const { model } = getGeminiConfig();
  return Array.from(new Set([model, ...MODEL_FALLBACKS]));
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GenerateOptions {
  /** Request a JSON object response. */
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

async function callModel(
  model: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiError("Could not reach the Gemini API (network error).", 502);
  }
}

async function generateContent(
  parts: GeminiPart[],
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { apiKey } = getGeminiConfig();
  const candidates = getModelCandidates();

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  let lastError: GeminiError | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    const res = await callModel(model, apiKey, body);

    if (res.ok) {
      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p?.text ?? "")
          .join("") ?? undefined;

      if (!text) {
        const reason = data?.promptFeedback?.blockReason;
        throw new GeminiError(
          reason
            ? `Gemini returned no content (blocked: ${reason}). Try a different screenshot.`
            : "Gemini returned an empty response. Please try again.",
          502
        );
      }
      return text;
    }

    // Handle failure statuses
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message ?? "";
    } catch {
      /* ignore */
    }

    if (res.status === 404) {
      // Model retired/unknown — try the next candidate silently.
      lastError = new GeminiError(
        `Gemini model "${model}" was not found or has been retired by Google.`,
        404
      );
      continue;
    }
    if (res.status === 400 && detail.toLowerCase().includes("api key")) {
      throw new GeminiError("Gemini rejected the API key. Check GEMINI_API_KEY.", 500);
    }
    if (res.status === 429) {
      // rate limited on this model — also worth trying a fallback
      lastError = new GeminiError("Gemini rate limit hit.", 429);
      continue;
    }
    throw new GeminiError(
      `Gemini API error (${res.status})${detail ? `: ${detail}` : ""}`,
      res.status
    );
  }

  // All candidates failed
  if (lastError?.status === 429) {
    throw new GeminiError(
      "Gemini rate limit hit on all available models. Please wait a moment and try again.",
      429
    );
  }
  throw new GeminiError(
    `No available Gemini model responded (tried: ${candidates.join(", ")}). ` +
      `Check GEMINI_MODEL / GEMINI_API_KEY.`,
    502
  );
}

/** Send an image + prompt to Gemini Vision, expecting a JSON object back. */
export async function generateFromImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<string> {
  return generateContent(
    [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
    systemInstruction,
    { ...options, jsonMode: true }
  );
}

/** Text-only call, expecting a JSON object back. */
export async function generateFromText(
  prompt: string,
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<string> {
  return generateContent([{ text: prompt }], systemInstruction, {
    ...options,
    jsonMode: true,
  });
}

/** Parse a JSON object out of a model response, tolerating code fences. */
export function parseJsonResponse<T>(raw: string): T {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) text = text.slice(first, last + 1);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("The AI returned a malformed JSON response. Please try again.", 502);
  }
}
