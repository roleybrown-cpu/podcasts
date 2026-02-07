import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const episodeId = String(url.searchParams.get("episodeId") || "").trim();
  const limit = Number(url.searchParams.get("limit") || 200);

  if (!episodeId) {
    return NextResponse.json({ error: "Missing episodeId" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("transcript_chunks")
    .select("id, episode_id, episode_title, chunk_index, content, metadata")
    .eq("episode_id", episodeId)
    .order("chunk_index", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    episodeId,
    count: data?.length || 0,
    chunks: data || []
  });
}
