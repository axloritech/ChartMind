"use client";

const STAGES = [
  "Reading the chart with Gemini Vision…",
  "Detecting patterns, levels & structure…",
  "Searching the local trading knowledge base…",
  "Composing the final educational analysis…",
];

/** Animated loading state shown while the multi-step AI pipeline runs. */
export default function AnalysisLoader({ stageIndex = 0 }: { stageIndex?: number }) {
  return (
    <div className="card relative overflow-hidden p-8" role="status" aria-live="polite">
      {/* scanning beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
        <div className="h-24 w-full animate-scan bg-gradient-to-b from-transparent via-accent/10 to-transparent" />
      </div>

      <div className="relative flex flex-col items-center gap-5 text-center">
        {/* pulsing candle logo */}
        <div className="flex items-end gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-2.5 rounded-sm bg-accent/80"
              style={{
                height: `${14 + ((i * 13) % 28)}px`,
                animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{STAGES[Math.min(stageIndex, STAGES.length - 1)]}</p>
          <p className="mt-1 text-xs text-slate-500">This usually takes 10–30 seconds</p>
        </div>

        {/* stage progress */}
        <ol className="flex w-full max-w-md flex-col gap-2">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-left text-xs">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  i < stageIndex
                    ? "border-bull/50 bg-bull/15 text-bull"
                    : i === stageIndex
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-white/10 bg-ink-800 text-slate-600"
                }`}
              >
                {i < stageIndex ? "✓" : i + 1}
              </span>
              <span className={i <= stageIndex ? "text-slate-300" : "text-slate-600"}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
