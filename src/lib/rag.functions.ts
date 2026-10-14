// A4MP RAG SYSTEMS — server functions for embedding, retrieval, and chat.
//
// All functions run only for authenticated users (requireSupabaseAuth
// middleware) and use an RLS-scoped Supabase client, so each user only
// sees their own documents, chunks, and messages.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- schemas ----------
const IngestSchema = z.object({
  documentId: z.string().uuid(),
  chunks: z.array(z.string().min(1).max(8000)).min(1).max(500),
});

const AskSchema = z.object({
  conversationId: z.string().uuid(),
  question: z.string().min(1).max(4000),
  documentIds: z.array(z.string().uuid()).optional(),
});

// ---------- helpers ----------
async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  // text-embedding-3-small -> 1536 dims, matches vector(1536) column.
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ---------- ingest chunks (embed + store) ----------
export const ingestChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IngestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Confirm document belongs to this user (RLS also enforces this).
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id")
      .eq("id", data.documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found");

    // Batch embed. Provider caps: 300k tokens per request for OpenAI models.
    // We keep batches of 96 chunks which stays well under limits.
    const BATCH = 96;
    let inserted = 0;
    for (let i = 0; i < data.chunks.length; i += BATCH) {
      const batch = data.chunks.slice(i, i + BATCH);
      const vectors = await embedTexts(batch);
      const rows = batch.map((content, j) => ({
        document_id: data.documentId,
        user_id: userId,
        chunk_index: i + j,
        content,
        // pgvector accepts a bracketed string literal for insert
        embedding: `[${vectors[j].join(",")}]`,
        token_count: Math.ceil(content.length / 4),
      }));
      const { error: insErr } = await supabase.from("document_chunks").insert(rows);
      if (insErr) throw new Error(`Chunk insert failed: ${insErr.message}`);
      inserted += rows.length;
    }

    await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: inserted })
      .eq("id", data.documentId);

    return { ok: true, inserted };
  });

// ---------- ask a question ----------
export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AskSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // 1. Persist user message immediately
    const { error: umErr } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "user",
      content: data.question,
      citations: [],
    });
    if (umErr) throw new Error(umErr.message);

    // 2. Embed the query
    const [queryEmbedding] = await embedTexts([data.question]);

    // 3. Retrieve top-k chunks via RLS-scoped RPC
    const { data: matches, error: matchErr } = await supabase.rpc("match_document_chunks", {
      query_embedding: `[${queryEmbedding.join(",")}]` as unknown as string,
      match_count: 6,
      filter_document_ids:
        data.documentIds && data.documentIds.length > 0 ? data.documentIds : (undefined as unknown as string[]),
    });
    if (matchErr) throw new Error(`Retrieval failed: ${matchErr.message}`);
    const chunks = (matches ?? []) as Array<{
      id: string;
      document_id: string;
      chunk_index: number;
      content: string;
      similarity: number;
      filename: string;
    }>;

    // 4. Fetch recent chat history for context
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // 5. Compose prompt with numbered sources
    const contextBlock = chunks.length
      ? chunks
          .map(
            (c, i) =>
              `[Source ${i + 1}] (file: ${c.filename}, chunk #${c.chunk_index})\n${c.content}`,
          )
          .join("\n\n---\n\n")
      : "(No relevant documents were found in the user's library.)";

    const systemPrompt = `You are A4MP RAG SYSTEMS, a helpful personal knowledge assistant.
You answer using ONLY the provided sources from the user's document library.

Rules:
- If the sources don't contain the answer, say so clearly. Never invent facts.
- Cite every claim inline using [1], [2], etc. matching the source numbers below.
- You fluently speak English and Telugu (తెలుగు). Reply in whichever language the user used.
- Be concise, warm, and precise.

Sources:
${contextBlock}`;

    const messagesForModel = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    // 6. Call the chat model
    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: messagesForModel,
      }),
    });
    if (!chatRes.ok) {
      const text = await chatRes.text();
      if (chatRes.status === 429)
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      if (chatRes.status === 402)
        throw new Error("AI credits exhausted. Please add credits in your workspace settings.");
      throw new Error(`Chat failed (${chatRes.status}): ${text}`);
    }
    const chatJson = (await chatRes.json()) as {
      choices: { message: { content: string } }[];
    };
    const answer = chatJson.choices?.[0]?.message?.content ?? "(no answer)";

    // 7. Build citations payload
    const citations = chunks.map((c, i) => ({
      index: i + 1,
      documentId: c.document_id,
      chunkIndex: c.chunk_index,
      filename: c.filename,
      similarity: Math.round(c.similarity * 100) / 100,
      snippet: c.content.slice(0, 260),
    }));

    // 8. Persist assistant message with citations
    const { error: amErr } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "assistant",
      content: answer,
      citations,
    });
    if (amErr) throw new Error(amErr.message);

    // 9. Auto-title new conversations
    const { data: convo } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (convo?.title === "New chat") {
      const title = data.question.slice(0, 60);
      await supabase.from("conversations").update({ title }).eq("id", data.conversationId);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversationId);
    }

    return { answer, citations };
  });

// ---------- create a fresh conversation ----------
export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "New chat" })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Insert failed");
    return { id: data.id };
  });
