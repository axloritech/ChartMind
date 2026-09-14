import "server-only";

/**
 * ChartMind AI client with layered model resilience.
 *
 * Failure handling order for every generation call:
 *   1. Transient/overload errors (429, 500, 502, 503 "high demand")
 *      → short backoff, retry the same model once.
 *   2. Still failing, or model retired (404)
 *      → next Gemini model in the chain:
 *        GEMINI_MODEL → gemini-3.5-flash → gemini-3.8-flash →
 *        gemini-2.5-flash → gemini-3.1-flash-lite
 *   3. All Gemini models failing AND OPENAI_API_KEY is configured
 *      → cross-provider fallback: gpt-4o-mini → gpt-4o (both vision-capable).
 *
 * The API keys are read from process.env on the server ONLY.
 */

// Overridable for tests / private gateways; defaults to Google's public endpoint.
const GEMINI_BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

/** Known-good Gemini models, newest first (as of Sept 2026). */
const GEMINI_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
];

/** Vision-capable OpenAI models used only as cross-provider last resort. */
const OPENAI_FALLBACKS = ["gpt-4o-mini", "gpt-4o"];

/** Statuses that mean "try again / try another model" instead of hard-failing. */
const TRANSIENT = new Set([429, 500, 502, 503]);

/** Backoff between retries of the same model. */
const BACKOFF_MS = [800, 1600];

/** Hard caps on upstream attempts per user request (keeps us inside serverless time limits). */
const GEMINI_MAX_ATTEMPTS = 6;
const OPENAI_MAX_ATTEMPTS = 3;

export interface GenResult {
  text: string;
  provider: "gemini" | "openai";
  model: string;
}

export function getGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured on the server. Add it to .env.local (or Vercel environment variables) and restart.",
      500
    );
  }
  const model = process.env.GEMINI_MODEL?.trim() || GEMINI_FALLBACKS[0];
  return { apiKey, model };
}

/** Ordered Gemini models to try: configured one first, then known-good fallbacks. */
export function getModelCandidates(): string[] {
  const { model } = getGeminiConfig();
  return Array.from(new Set([model, ...GEMINI_FALLBACKS]));
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
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readError(res: Response): Promise<{ status: number; detail: string }> {
  let detail = "";
  try {
    const errJson = await res.json();
    detail = errJson?.error?.message ?? errJson?.message ?? "";
  } catch {
    /* ignore */
  }
  return { status: res.status, detail };
}

async function callGemini(
  model: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiError("Could not reach the Gemini API (network error).", 502);
  }
}

async function callOpenAI(
  model: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  try {
    return await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    return new Response(JSON.stringify({ error: { message: "network error" } }), { status: 502 });
  }
}

type AttemptOutcome =
  | { kind: "success"; text: string; provider: "gemini" | "openai"; model: string }
  | { kind: "transient"; status: number; detail: string }
  | { kind: "retired"; status: number; detail: string }
  | { kind: "fatal"; status: number; detail: string }
  | { kind: "empty" };

async function attemptGemini(
  model: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<AttemptOutcome> {
  const res = await callGemini(model, apiKey, body);
  if (res.ok) {
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("") ?? undefined;
    if (!text) {
      const reason = data?.promptFeedback?.blockReason;
      if (reason) {
        return {
          kind: "fatal",
          status: 502,
          detail: `Gemini returned no content (blocked: ${reason}). Try a different screenshot.`,
        };
      }
      return { kind: "empty" };
    }
    return { kind: "success", text, provider: "gemini", model };
  }
  const { status, detail } = await readError(res);
  if (status === 404) return { kind: "retired", status, detail };
  if (status === 400 && detail.toLowerCase().includes("api key"))
    return { kind: "fatal", status: 500, detail: "Gemini rejected the API key. Check GEMINI_API_KEY." };
  if (TRANSIENT.has(status)) return { kind: "transient", status, detail };
  return { kind: "fatal", status, detail };
}

function toOpenAIMessages(parts: GeminiPart[], systemInstruction: string) {
  const content = parts.map((p) => {
    if (p.inlineData) {
      return {
        type: "image_url",
        image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
      };
    }
    return { type: "text", text: p.text ?? "" };
  });
  return [
    { role: "system", content: systemInstruction },
    { role: "user", content },
  ];
}

async function attemptOpenAI(
  model: string,
  apiKey: string,
  messages: unknown[],
  options: GenerateOptions
): Promise<AttemptOutcome> {
  const res = await callOpenAI(model, apiKey, {
    model,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxOutputTokens ?? 4096,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  if (res.ok) {
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) return { kind: "empty" };
    return { kind: "success", text, provider: "openai", model };
  }
  const { status, detail } = await readError(res);
  if (status === 401)
    return { kind: "fatal", status: 500, detail: "OpenAI rejected OPENAI_API_KEY. Check the key." };
  if (status === 404) return { kind: "retired", status, detail };
  if (TRANSIENT.has(status)) return { kind: "transient", status, detail };
  return { kind: "fatal", status, detail };
}

async function generateContent(
  parts: GeminiPart[],
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<GenResult> {
  const { apiKey } = getGeminiConfig();
  const geminiModels = getModelCandidates();

  const geminiBody: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  let attempts = 0;
  let lastError: GeminiError | null = null;

  // ---- Layer 1+2: Gemini chain with per-model retry on overload ----
  for (const model of geminiModels) {
    for (let retry = 0; retry < 2; retry++) {
      if (attempts >= GEMINI_MAX_ATTEMPTS) break;
      attempts++;
      const outcome = await attemptGemini(model, apiKey, geminiBody);

      if (outcome.kind === "success") {
        return { text: outcome.text, provider: outcome.provider, model: outcome.model };
      }
      if (outcome.kind === "retired") {
        lastError = new GeminiError(
          `Gemini model "${model}" was not found or has been retired by Google.`,
          404
        );
        break; // next model, no point retrying
      }
      if (outcome.kind === "fatal") {
        throw new GeminiError(outcome.detail, outcome.status);
      }
      // transient or empty: remember, back off, retry once — then fall through
      lastError = new GeminiError(
        outcome.kind === "empty"
          ? `Gemini model "${model}" returned an empty response.`
          : `Gemini model "${model}" is busy or unavailable (${outcome.status}): ${outcome.detail}`,
        outcome.kind === "empty" ? 502 : outcome.status
      );
      if (retry === 0) await sleep(BACKOFF_MS[0]);
      else await sleep(BACKOFF_MS[1]);
    }
    if (attempts >= GEMINI_MAX_ATTEMPTS) break;
  }

  // ---- Layer 3: optional cross-provider fallback (OpenAI vision) ----
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const messages = toOpenAIMessages(parts, systemInstruction);
    let oaAttempts = 0;
    for (const model of OPENAI_FALLBACKS) {
      for (let retry = 0; retry < 2; retry++) {
        if (oaAttempts >= OPENAI_MAX_ATTEMPTS) break;
        oaAttempts++;
        const outcome = await attemptOpenAI(model, openaiKey, messages, options);

        if (outcome.kind === "success") {
          return { text: outcome.text, provider: outcome.provider, model: outcome.model };
        }
        if (outcome.kind === "fatal") {
          throw new GeminiError(outcome.detail, outcome.status);
        }
        if (outcome.kind === "retired") {
          lastError = new GeminiError(`OpenAI model "${model}" unavailable.`, 404);
          break;
        }
        lastError = new GeminiError(
          outcome.kind === "empty"
            ? `OpenAI model "${model}" returned an empty response.`
            : `OpenAI model "${model}" is busy or unavailable (${outcome.status}): ${outcome.detail}`,
          outcome.kind === "empty" ? 502 : outcome.status
        );
        if (retry === 0) await sleep(BACKOFF_MS[0]);
        else await sleep(BACKOFF_MS[1]);
      }
      if (oaAttempts >= OPENAI_MAX_ATTEMPTS) break;
    }
  }

  // ---- Everything failed ----
  if (lastError?.status === 429 || lastError?.status === 503) {
    throw new GeminiError(
      "All configured AI models are currently rate-limited or experiencing high demand. " +
        "Spikes like this are usually temporary — please wait a minute and try again. " +
        `(Last error: ${lastError.message})`,
      lastError.status
    );
  }
  throw new GeminiError(
    lastError?.message ?? "No AI model responded. Check GEMINI_API_KEY / GEMINI_MODEL.",
    lastError?.status ?? 502
  );
}

/** Send an image + prompt for vision analysis, expecting a JSON object back. */
export async function generateFromImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<GenResult> {
  return generateContent(
    [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
    systemInstruction,
    { ...options, jsonMode: true }
  );
}

/** Text-only generation, expecting a JSON object back. */
export async function generateFromText(
  prompt: string,
  systemInstruction: string,
  options: GenerateOptions = {}
): Promise<GenResult> {
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
