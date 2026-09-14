import { NextResponse } from "next/server";
import { searchKnowledge, loadKnowledge, getCategories } from "@/lib/knowledge";

export const runtime = "nodejs";

/**
 * GET /api/knowledge            -> all entries + categories
 * GET /api/knowledge?q=hammer   -> top matches for a query
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q) {
      return NextResponse.json({
        ok: true,
        entries: loadKnowledge(),
        categories: getCategories(),
      });
    }

    const results = searchKnowledge(q, 20);
    return NextResponse.json({
      ok: true,
      query: q,
      entries: results.map(({ score: _score, ...entry }) => entry),
      scores: results.map((r) => r.score),
    });
  } catch (err) {
    console.error("[/api/knowledge] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to read the knowledge base." },
      { status: 500 }
    );
  }
}
