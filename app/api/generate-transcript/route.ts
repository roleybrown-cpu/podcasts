import { NextResponse } from "next/server";
import OpenAI from "openai";
import { embedTexts } from "@/lib/embeddings";
import { chunkText } from "@/lib/chunk";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

function resolveTargetWords(lengthWords?: number, lengthMinutes?: number) {
  if (lengthWords && lengthWords > 0) return Math.round(lengthWords);
  if (lengthMinutes && lengthMinutes > 0) {
    return Math.round(lengthMinutes * 150);
  }
  return 900;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Set it to use /api/generate-transcript." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const topic = String(body.topic || "").trim();
  const style = String(body.style || "Conversational").trim();
  const topK = Number(body.topK || 6);
  const lengthMinutes = Number(body.lengthMinutes || 0);
  const lengthWords = Number(body.lengthWords || 0);
  const save = Boolean(body.save);
  const episodeTitle = String(body.episodeTitle || "").trim();
  let episodeId = String(body.episodeId || "").trim();
  const metadata = body.metadata || {};

  if (!topic) {
    return NextResponse.json({ error: "Missing topic." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const embedding = await embedTexts([topic]);

  const { data, error } = await supabase.rpc("match_transcript_chunks", {
    query_embedding: embedding[0],
    match_count: topK,
    filter_episode_id: null,
    filter_speaker: null,
    filter_date_from: null,
    filter_date_to: null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sources = (data || []).map((row: any, idx: number) => {
    return `Source ${idx + 1} (${row.episode_id}):\n${row.content}`;
  });

  const targetWords = resolveTargetWords(lengthWords, lengthMinutes);

  const system =
    "You are a podcast writer. Use the provided source material to create an original transcript while preserving factual references. Cite sources by number in brackets when you reuse details (e.g., [Source 2]).";

  const user = `Topic: ${topic}\nStyle: ${style}\nTarget length: ~${targetWords} words\n\nSources:\n${sources.join("\n\n")}\n\nWrite the transcript with natural flow, including host cues if appropriate.`;

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: chatModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.7
  });

  const transcript = completion.choices[0]?.message?.content || "";

  let saved = false;
  let savedEpisodeId = episodeId;

  if (save && transcript) {
    if (!episodeId) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      episodeId = `gen_${stamp}`;
      savedEpisodeId = episodeId;
    }

    const chunks = chunkText(transcript);
    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const rows = chunks.map((chunk, idx) => ({
      episode_id: episodeId,
      episode_title: episodeTitle || `Generated: ${topic}`,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[idx],
      metadata: {
        ...metadata,
        generated: true,
        source_topic: topic,
        style,
        target_words: targetWords,
        generated_at: new Date().toISOString()
      }
    }));

    const { error: insertError } = await supabase
      .from("transcript_chunks")
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    saved = true;
  }

  return NextResponse.json({
    topic,
    transcript,
    sources: data || [],
    saved,
    episodeId: savedEpisodeId || null
  });
}
