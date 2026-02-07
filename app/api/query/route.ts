import { NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const query = String(body.query || "").trim();
  const topK = Number(body.topK || 5);
  const episodeId = String(body.episodeId || "").trim();
  const speaker = String(body.speaker || "").trim();
  const dateFrom = String(body.dateFrom || "").trim();
  const dateTo = String(body.dateTo || "").trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const embedding = await embedText(query);
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("match_transcript_chunks", {
    query_embedding: embedding,
    match_count: topK,
    filter_episode_id: episodeId || null,
    filter_speaker: speaker || null,
    filter_date_from: dateFrom || null,
    filter_date_to: dateTo || null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    query,
    results: data || []
  });
}
