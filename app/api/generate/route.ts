import { NextResponse } from "next/server";
import OpenAI from "openai";
import { embedText } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Set it to use /api/generate." },
      { status: 400 }
    );
  }

  const client = new OpenAI({ apiKey });
  const body = await req.json();
  const topic = String(body.topic || "").trim();
  const topK = Number(body.topK || 6);

  if (!topic) {
    return NextResponse.json({ error: "Missing topic." }, { status: 400 });
  }

  const embedding = await embedText(topic);
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("match_transcript_chunks", {
    query_embedding: embedding,
    match_count: topK,
    filter_episode_id: null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const contextBlocks = (data || []).map((row: any, idx: number) => {
    return `Source ${idx + 1} (${row.episode_id}):\n${row.content}`;
  });

  const system =
    "You are a podcast writer. Use the provided source material to craft a fresh episode outline and talking points. Cite sources by number when relevant.";

  const user = `Topic: ${topic}\n\nSources:\n${contextBlocks.join("\n\n")}`;

  const completion = await client.chat.completions.create({
    model: chatModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.7
  });

  return NextResponse.json({
    topic,
    sources: data || [],
    draft: completion.choices[0]?.message?.content || ""
  });
}
