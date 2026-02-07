import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

function toMetadata(raw: string | null) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function extractTextFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const contentType = file.type || "";

  if (contentType.includes("wordprocessingml") || file.name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  const text = new TextDecoder().decode(arrayBuffer);
  return text;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let episodeTitle = "";
  let episodeId = "";
  let metadata = {} as Record<string, unknown>;
  let combinedText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    episodeTitle = String(form.get("episodeTitle") || "").trim();
    episodeId = String(form.get("episodeId") || "").trim();
    metadata = toMetadata(String(form.get("metadata") || ""));

    const file = form.get("file");
    const text = String(form.get("text") || "").trim();

    if (file && file instanceof File) {
      const fileText = await extractTextFromFile(file);
      combinedText = [text, fileText].filter(Boolean).join("\n\n");
    } else {
      combinedText = text;
    }
  } else {
    const body = await req.json();
    episodeTitle = String(body.episodeTitle || "").trim();
    episodeId = String(body.episodeId || "").trim();
    metadata = body.metadata || {};
    combinedText = String(body.text || "").trim();
  }

  if (!combinedText) {
    return NextResponse.json({ error: "No transcript text provided." }, { status: 400 });
  }

  if (!episodeId) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    episodeId = `ep_${stamp}`;
  }

  const chunks = chunkText(combinedText);
  if (!chunks.length) {
    return NextResponse.json({ error: "No chunks created." }, { status: 400 });
  }

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const supabase = supabaseServer();

  const rows = chunks.map((chunk, idx) => ({
    episode_id: episodeId,
    episode_title: episodeTitle || null,
    chunk_index: chunk.index,
    content: chunk.content,
    embedding: embeddings[idx],
    metadata: metadata || {}
  }));

  const { error } = await supabase.from("transcript_chunks").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    episodeId,
    chunks: rows.length
  });
}
