export type Chunk = {
  content: string;
  index: number;
};

const DEFAULT_MAX_CHARS = 2000;
const DEFAULT_OVERLAP_CHARS = 200;

export function chunkText(
  text: string,
  maxChars: number = DEFAULT_MAX_CHARS,
  overlapChars: number = DEFAULT_OVERLAP_CHARS
): Chunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    const content = buffer.trim();
    if (content) {
      chunks.push({ content, index });
      index += 1;
    }
    if (overlapChars > 0 && content.length > overlapChars) {
      buffer = content.slice(-overlapChars);
    } else {
      buffer = "";
    }
  };

  for (const paragraph of paragraphs) {
    if ((buffer + "\n\n" + paragraph).length <= maxChars) {
      buffer = buffer ? buffer + "\n\n" + paragraph : paragraph;
      continue;
    }

    if (buffer) {
      flush();
    }

    if (paragraph.length <= maxChars) {
      buffer = paragraph;
      continue;
    }

    // Hard wrap long paragraphs
    let start = 0;
    while (start < paragraph.length) {
      const slice = paragraph.slice(start, start + maxChars);
      chunks.push({ content: slice.trim(), index });
      index += 1;
      start += maxChars - overlapChars;
    }
    buffer = "";
  }

  if (buffer) flush();

  return chunks;
}
