// Mock AI upstream for testing ChartMind's retry/fallback chain.
// Usage:
//   node scripts/mock-ai-server.mjs &
//   GEMINI_BASE_URL=http://127.0.0.1:3999 OPENAI_BASE_URL=http://127.0.0.1:3999 \
//   GEMINI_API_KEY=dummy OPENAI_API_KEY=dummy GEMINI_MODEL=gemini-2.0-flash \
//   npm run start
//   # then POST /api/analyze and inspect http://127.0.0.1:3999/stats
// Modes:
//   /mode/retired-then-ok  -> 503 only for model gemini-2.0-flash, 200 otherwise
//   /mode/all-gemini-503   -> 503 for every Gemini model; OpenAI endpoint returns 200
//   /reset                 -> zero counters
//   /stats                 -> JSON call log
import http from "http";

let mode = "retired-then-ok";
let geminiCalls = [];
let openaiCalls = [];

const VISION_JSON = JSON.stringify({
  trend: "Strong uptrend after a V-shaped recovery",
  candlestickPatterns: ["hammer at the low"],
  chartPatterns: ["double bottom"],
  supportLevels: ["7754 zone"],
  resistanceLevels: ["8119 zone"],
  marketStructure: "HH/HL restored",
  indicators: ["none visible"],
  observations: ["mock vision pass"],
  timeframeGuess: "M15",
  instrumentGuess: "VOL75",
});

const ANALYSIS_JSON = JSON.stringify({
  trend: "uptrend",
  candlestickPatterns: ["hammer"],
  chartPatterns: ["double bottom"],
  supportLevels: ["7754"],
  resistanceLevels: ["8119"],
  marketStructure: "bullish",
  indicators: [],
  observations: ["mock"],
  possibleBullishScenario: "bull case",
  possibleBearishScenario: "bear case",
  keyLevelsToWatch: ["7754", "8119"],
  confidence: "medium",
  educationalDisclaimer: "mock disclaimer",
});

const server = http.createServer((req, res) => {
  const url = req.url || "";
  if (url.startsWith("/mode/")) {
    mode = url.slice(6);
    res.end("ok " + mode);
    return;
  }
  if (url === "/reset") {
    geminiCalls = [];
    openaiCalls = [];
    res.end("reset");
    return;
  }
  if (url === "/stats") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ mode, geminiCalls, openaiCalls }));
    return;
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (url.includes("/chat/completions")) {
      // OpenAI
      openaiCalls.push("openai:" + (JSON.parse(body || "{}").model ?? "?"));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ choices: [{ message: { content: ANALYSIS_JSON } }] }));
      return;
    }
    // Gemini: /models/{model}:generateContent
    const m = url.match(/\/models\/([^:]+):generateContent/);
    const model = m ? decodeURIComponent(m[1]) : "?";
    geminiCalls.push(model);
    res.setHeader("Content-Type", "application/json");
    const overload =
      mode === "all-gemini-503" || (mode === "retired-then-ok" && model === "gemini-2.0-flash");
    if (overload) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: { message: "This model is currently experiencing high demand." } }));
      return;
    }
    // first successful call = vision pass, later = analysis pass
    const isVision = (() => {
      try {
        const b = JSON.parse(body || "{}");
        return b.contents?.[0]?.parts?.some((p) => p.inlineData);
      } catch {
        return false;
      }
    })();
    res.end(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: isVision ? VISION_JSON : ANALYSIS_JSON }] } }],
      })
    );
  });
});

server.listen(3999, "127.0.0.1", () => console.log("mock AI upstream on :3999"));
