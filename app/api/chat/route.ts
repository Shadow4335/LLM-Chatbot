import { after } from "next/server";
import { convertToModelMessages, generateText, streamText } from "ai";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { conversations, db, messages as messagesTable } from "@/lib/db";
import { errorStatus, friendlyError } from "@/lib/errors";
import { cheapestModelKey, getModel, ModelError, providerLabelFor } from "@/lib/providers";
import { messageText, type ChatMessage } from "@/lib/chat-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  conversationId: z.uuid(),
  model: z.string().min(1),
  messages: z.array(z.any()).min(1),
  systemPrompt: z.string().max(20000).optional().nullable(),
  temperature: z.number().min(0).max(2).optional(),
});

const err = (status: number, message: string) => new Response(message, { status });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid request.");
  const { conversationId, model: modelKey, systemPrompt, temperature } = parsed.data;
  const uiMessages = parsed.data.messages as ChatMessage[];
  const last = uiMessages[uiMessages.length - 1];
  if (last.role !== "user") return err(400, "Last message must be from the user.");
  if (!z.uuid().safeParse(last.id).success) return err(400, "Invalid message id.");

  let model;
  try {
    model = getModel(modelKey);
  } catch (e) {
    return err(400, e instanceof ModelError ? e.message : "Unknown model.");
  }
  const providerLabel = providerLabelFor(modelKey);

  // --- Persist conversation + user message before streaming ---
  const d = db();
  const system = systemPrompt?.trim() || null;
  let isNew = false;
  try {
    const inserted = await d
      .insert(conversations)
      .values({ id: conversationId, model: modelKey, systemPrompt: system })
      .onConflictDoUpdate({
        target: conversations.id,
        set: { model: modelKey, systemPrompt: system, updatedAt: sql`now()` },
      })
      .returning({ createdAt: conversations.createdAt, updatedAt: conversations.updatedAt });
    isNew = inserted[0]?.createdAt.getTime() === inserted[0]?.updatedAt.getTime();

    // Drop anything the client no longer has (edit / regenerate truncation).
    const keepIds = uiMessages.map((m) => m.id).filter((id) => z.uuid().safeParse(id).success);
    await d
      .delete(messagesTable)
      .where(and(eq(messagesTable.conversationId, conversationId), notInArray(messagesTable.id, keepIds)));

    const content = messageText(last);
    await d
      .insert(messagesTable)
      .values({ id: last.id, conversationId, role: "user", content })
      .onConflictDoUpdate({ target: messagesTable.id, set: { content } });
  } catch (e) {
    console.error("db error", e);
    return err(500, "Database error — is DATABASE_URL set and `npm run db:push` run?");
  }

  // --- Title from first message, using cheapest available model ---
  if (isNew) {
    after(async () => {
      const titleKey = cheapestModelKey() ?? modelKey;
      try {
        const { text } = await generateText({
          model: getModel(titleKey),
          prompt: `Write a short title (max 6 words, no quotes, no trailing punctuation) for a chat that starts with:\n\n${messageText(last).slice(0, 2000)}`,
        });
        const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80) || "New chat";
        await d.update(conversations).set({ title }).where(eq(conversations.id, conversationId));
      } catch (e) {
        console.error("title error", e);
        const fallback = messageText(last).slice(0, 50).trim() || "New chat";
        await d.update(conversations).set({ title: fallback }).where(eq(conversations.id, conversationId));
      }
    });
  }

  const assistantId = crypto.randomUUID();
  let saved: () => void = () => {};
  const savedPromise = new Promise<void>((r) => (saved = r));

  const result = streamText({
    model,
    system: system ?? undefined,
    temperature,
    messages: await convertToModelMessages(uiMessages),
    onFinish: async ({ text, totalUsage }) => {
      try {
        if (text) {
          await d.insert(messagesTable).values({
            id: assistantId,
            conversationId,
            role: "assistant",
            content: text,
            model: modelKey,
            tokensIn: totalUsage.inputTokens ?? null,
            tokensOut: totalUsage.outputTokens ?? null,
          });
        }
        await d.update(conversations).set({ updatedAt: sql`now()` }).where(eq(conversations.id, conversationId));
      } catch (e) {
        console.error("save assistant error", e);
      } finally {
        saved();
      }
    },
    onError: ({ error }) => {
      console.error("stream error", error);
      saved();
    },
    onAbort: () => saved(),
  });

  // Run to completion even if the client disconnects; keep the function alive until saved.
  result.consumeStream({ onError: () => saved() });
  after(() => savedPromise);

  // Wait until the provider either produces output or fails. Failing before any output
  // (bad key, quota, unknown model) returns a plain HTTP error instead of an error part
  // mid-stream, which some browsers (Safari) surface only as "Load failed".
  const reader = result.fullStream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "error") {
        return err(errorStatus(value.error), friendlyError(value.error, providerLabel));
      }
      if (value.type === "text-delta" || value.type === "reasoning-delta" || value.type === "finish-step") break;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }

  return result.toUIMessageStreamResponse<ChatMessage>({
    generateMessageId: () => assistantId,
    messageMetadata: ({ part }) => {
      if (part.type === "start") return { model: modelKey };
      if (part.type === "finish")
        return { model: modelKey, tokensIn: part.totalUsage.inputTokens, tokensOut: part.totalUsage.outputTokens };
    },
    onError: (e) => friendlyError(e, providerLabel),
  });
}
