const embeddingsUrl = process.env.EMBEDDINGS_URL || "http://127.0.0.1:8001";

async function fetchEmbeddings(inputs: string[]) {
  const res = await fetch(`${embeddingsUrl}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Embeddings service error: ${message}`);
  }

  const data = await res.json();
  if (!data.embeddings || !Array.isArray(data.embeddings)) {
    throw new Error("Embeddings service returned invalid payload");
  }
  return data.embeddings as number[][];
}

export async function embedText(input: string) {
  const embeddings = await fetchEmbeddings([input]);
  return embeddings[0];
}

export async function embedTexts(inputs: string[]) {
  return fetchEmbeddings(inputs);
}
