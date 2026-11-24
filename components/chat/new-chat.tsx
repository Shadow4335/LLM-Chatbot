"use client";

import { useApp } from "./app-context";
import { Chat } from "./chat";

export function NewChat() {
  const { newChatNonce } = useApp();
  return <Chat key={newChatNonce} />;
}
