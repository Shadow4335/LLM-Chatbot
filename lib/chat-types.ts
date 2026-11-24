import type { UIMessage } from "ai";

export type ChatMetadata = { model?: string; tokensIn?: number; tokensOut?: number };
export type ChatMessage = UIMessage<ChatMetadata>;

export const messageText = (m: { parts: { type: string }[] }) =>
  m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

export type ConversationSummary = { id: string; title: string; updatedAt: string };
