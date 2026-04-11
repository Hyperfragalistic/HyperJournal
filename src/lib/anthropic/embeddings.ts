import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Generate text embeddings using Claude's embedding endpoint.
 * Note: Anthropic's primary embedding model is via the Messages API
 * with a special embedding request, or we use a proxy approach.
 * For production, you can swap this for OpenAI text-embedding-3-small
 * or Supabase's built-in embedding functions.
 *
 * This implementation uses a hash-based fallback for now and should be
 * replaced with a real embedding API (OpenAI, Cohere, or voyage-2).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Voyage AI is Anthropic's recommended embedding partner
  // If VOYAGE_API_KEY is set, use it. Otherwise fall back to a
  // deterministic pseudo-embedding (for dev only).

  if (process.env.VOYAGE_API_KEY) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "voyage-2",
        input: text,
        input_type: "document",
      }),
    });

    if (!res.ok) {
      throw new Error(`Voyage AI error: ${res.statusText}`);
    }

    const data = await res.json() as { data: [{ embedding: number[] }] };
    return data.data[0].embedding;
  }

  // Development fallback: deterministic pseudo-embedding from text hash
  // NOT suitable for production semantic search
  return pseudoEmbedding(text);
}

function pseudoEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 1536] += charCode / 1000;
  }
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => (magnitude > 0 ? v / magnitude : 0));
}

/**
 * Generate a summary embedding for a coaching session.
 */
export async function generateSessionEmbedding(
  summary: string,
  insights: string,
  recommendations: string[]
): Promise<number[]> {
  const text = [summary, insights, ...recommendations].join("\n\n");
  return generateEmbedding(text);
}

/**
 * Generate a trade embedding for similarity search.
 */
export async function generateTradeEmbedding(trade: {
  coin: string;
  direction: string;
  pnl: number | null;
  notes: string | null;
  setup_tag: string | null;
  emotion_before: string | null;
  emotion_after: string | null;
  tags: string[] | null;
}): Promise<number[]> {
  const parts = [
    `${trade.direction} ${trade.coin}`,
    trade.pnl !== null ? `PnL: ${trade.pnl > 0 ? "win" : "loss"} ${trade.pnl.toFixed(2)}` : "",
    trade.setup_tag ? `Setup: ${trade.setup_tag}` : "",
    trade.notes ?? "",
    trade.emotion_before ? `Emotion before: ${trade.emotion_before}` : "",
    trade.emotion_after ? `Emotion after: ${trade.emotion_after}` : "",
    trade.tags?.join(", ") ?? "",
  ].filter(Boolean);

  return generateEmbedding(parts.join(" | "));
}
