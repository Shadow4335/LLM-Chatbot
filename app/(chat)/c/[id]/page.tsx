import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Chat } from "@/components/chat/chat";
import { conversations, db, messages } from "@/lib/db";
import type { ChatMessage } from "@/lib/chat-types";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const d = db();
  const [conv] = await d.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) notFound();
  const rows = await d
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const initialMessages: ChatMessage[] = rows
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
      metadata: m.model ? { model: m.model, tokensIn: m.tokensIn ?? undefined, tokensOut: m.tokensOut ?? undefined } : undefined,
    }));

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialModel={conv.model}
      initialSystemPrompt={conv.systemPrompt ?? ""}
    />
  );
}
