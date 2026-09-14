"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnalysisResult from "@/components/AnalysisResult";
import AnalysisLoader from "@/components/AnalysisLoader";
import type { AnalyzeResponse } from "@/lib/types";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type Phase = "idle" | "loading" | "done" | "error";

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Revoke object URLs to avoid leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stageTimers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptFile = useCallback((f: File | undefined | null) => {
    setError(null);
    setResult(null);
    setPhase("idle");
    if (!f) return;
    if (!ACCEPTED.includes(f.type.toLowerCase())) {
      setError("Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP screenshot.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File is too large (max 8 MB). Try a smaller screenshot.");
      return;
    }
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      acceptFile(e.dataTransfer.files?.[0]);
    },
    [acceptFile]
  );

  const analyze = useCallback(async () => {
    if (!file) return;
    setPhase("loading");
    setError(null);
    setResult(null);
    setStageIndex(0);

    // Simulated stage progression (the pipeline has fixed steps server-side)
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [
      setTimeout(() => setStageIndex(1), 5000),
      setTimeout(() => setStageIndex(2), 11000),
      setTimeout(() => setStageIndex(3), 18000),
    ];

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? "");
          resolve(dataUrl.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      const data: AnalyzeResponse = await res.json().catch(() => ({
        ok: false,
        error: "The server returned an invalid response.",
      }));

      if (!res.ok || !data.ok || !data.analysis) {
        setPhase("error");
        setError(data.error || `Analysis failed (HTTP ${res.status}). Please try again.`);
        return;
      }

      setResult(data);
      setPhase("done");
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Network error while analyzing. Please try again.");
    } finally {
      stageTimers.current.forEach(clearTimeout);
      stageTimers.current = [];
    }
  }, [file]);

  const reset = useCallback(() => {
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResult(null);
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Analyze a <span className="text-accent">Trading Chart</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Upload a screenshot (JPG, JPEG, PNG or WEBP, max 8 MB). ChartMind will detect patterns and
          levels with Gemini Vision, ground the explanation in the local trading knowledge base, and
          show both bullish and bearish scenarios — educational analysis, never a prediction.
        </p>
      </div>

      {/* Upload zone / preview */}
      {phase !== "done" && (
        <div className="card p-5 sm:p-6">
          {!previewUrl ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload chart screenshot"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
                dragActive
                  ? "border-accent bg-accent/5"
                  : "border-white/10 bg-ink-800/40 hover:border-accent/40 hover:bg-ink-800/70"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-3xl" aria-hidden="true">
                📸
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Drop your chart screenshot here
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  or <span className="text-accent underline underline-offset-2">browse files</span> —
                  JPG, JPEG, PNG, WEBP · max 8 MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Chart screenshot preview"
                  className="max-h-[480px] w-full object-contain"
                />
                {phase === "loading" && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="h-16 w-full animate-scan bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="truncate text-xs text-slate-500">
                  {file?.name} · {((file?.size ?? 0) / 1024).toFixed(0)} KB
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn-secondary flex-1 sm:flex-none"
                    onClick={reset}
                    disabled={phase === "loading"}
                  >
                    ✕ Remove
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-1 sm:flex-none"
                    onClick={analyze}
                    disabled={phase === "loading" || !file}
                  >
                    {phase === "loading" ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/40 border-t-ink-950" aria-hidden="true" />
                        Analyzing…
                      </>
                    ) : (
                      <>⚡ Analyze Chart</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && phase !== "loading" && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-bear/30 bg-bear/10 p-4 text-sm text-red-200"
        >
          <span aria-hidden="true">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Analysis failed</p>
            <p className="mt-1 leading-relaxed text-red-200/80">{error}</p>
          </div>
          {phase === "error" && previewUrl && (
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={analyze}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <div className="mt-5">
          <AnalysisLoader stageIndex={stageIndex} />
        </div>
      )}

      {/* Result */}
      {phase === "done" && result?.analysis && (
        <div ref={resultRef} className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-white">Analysis Result</h2>
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={reset}>
              ↺ Analyze another chart
            </button>
          </div>

          {previewUrl && file && (
            <details className="card p-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-400">
                📷 View uploaded screenshot ({file.name})
              </summary>
              <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Analyzed chart" className="max-h-[400px] w-full object-contain" />
              </div>
            </details>
          )}

          <AnalysisResult analysis={result.analysis} matchedKnowledge={result.matchedKnowledge ?? []} />
        </div>
      )}
    </div>
  );
}
