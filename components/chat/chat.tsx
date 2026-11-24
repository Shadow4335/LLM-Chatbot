"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTheme } from "next-themes";
import { ArrowDown, Moon, PanelLeftOpen, SquarePen, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { readLS, useApp, writeLS } from "./app-context";
import { Composer } from "./composer";
import { Message } from "./message";
import { ModelPicker } from "./model-picker";
import { SettingsPopover } from "./settings-popover";

const chatTransport = new DefaultChatTransport<ChatMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: { ...body, conversationId: id, messages },
  }),
});

type Props = {
  id?: string;
  initialMessages?: ChatMessage[];
  initialModel?: string;
  initialSystemPrompt?: string;
};

async function patchConversation(id: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) toast.error("Failed to save setting");
}

export function Chat({ id, initialMessages = [], initialModel, initialSystemPrompt = "" }: Props) {
  const app = useApp();
  const { providers, defaultModel, sidebarOpen, setSidebarOpen, temperature, refreshConversations } = app;
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [conversationId] = useState(() => id ?? crypto.randomUUID());
  const persisted = useRef(Boolean(id));
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [chosenModel, setChosenModel] = useState<string | null>(initialModel ?? null);

  // Resolve to an available model (key may have been removed since).
  const availableKeys = useMemo(() => providers.flatMap((p) => p.models.map((m) => m.key)), [providers]);
  const model = useMemo(() => {
    if (chosenModel && availableKeys.includes(chosenModel)) return chosenModel;
    if (!availableKeys.length) return chosenModel;
    const last = typeof window !== "undefined" ? readLS("lastModel") : null;
    if (!chosenModel && last && availableKeys.includes(last)) return last;
    return defaultModel ?? availableKeys[0];
  }, [chosenModel, availableKeys, defaultModel]);

  const { messages, sendMessage, regenerate, stop, status } = useChat<ChatMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: chatTransport,
    generateId: () => crypto.randomUUID(),
    onError: (e) => {
      const network = /load failed|failed to fetch|networkerror|network error/i.test(e.message);
      toast.error(network ? "Connection lost. Check your network and try again." : e.message || "Request failed");
    },
    onFinish: () => {
      void refreshConversations();
      // Title is generated in the background; pick it up shortly after.
      setTimeout(() => void refreshConversations(), 3000);
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // ---- auto-scroll ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => {
    if (stick.current) scrollToBottom();
  }, [messages, status, scrollToBottom]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stick.current = atBottom;
    setShowJump(!atBottom);
  };

  const ensurePersisted = () => {
    if (persisted.current) return;
    persisted.current = true;
    window.history.replaceState(null, "", `/c/${conversationId}`);
    app.upsertLocalConversation({ id: conversationId, title: "New chat", updatedAt: new Date().toISOString() });
  };

  const guard = () => {
    if (!model) {
      toast.error("No model available. Configure an API key.");
      return false;
    }
    return true;
  };

  // Current settings are sent with every request (send, edit, regenerate).
  const requestBody = () => ({ model, systemPrompt: systemPrompt || null, temperature });

  const submit = () => {
    const text = input.trim();
    if (!text || !guard()) return;
    stick.current = true;
    ensurePersisted();
    setInput("");
    void sendMessage({ text }, { body: requestBody() });
  };

  const onEdit = (messageId: string, text: string) => {
    if (!guard()) return;
    stick.current = true;
    void sendMessage({ text, messageId }, { body: requestBody() });
  };

  const onRegenerate = (messageId: string) => {
    if (!guard()) return;
    void regenerate({ messageId, body: requestBody() });
  };

  const onModelChange = (key: string) => {
    setChosenModel(key);
    writeLS("lastModel", key);
    if (persisted.current) void patchConversation(conversationId, { model: key });
  };

  const onSystemPromptChange = (v: string) => {
    setSystemPrompt(v);
    if (persisted.current) void patchConversation(conversationId, { systemPrompt: v || null });
  };

  const newChat = () => {
    app.bumpNewChat();
    router.push("/");
  };

  const empty = messages.length === 0;
  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-1 px-2">
        <div className={cn("flex items-center", sidebarOpen && "md:hidden")}>
          <Button variant="ghost" size="icon-lg" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <PanelLeftOpen className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-lg" onClick={newChat} aria-label="New chat">
            <SquarePen className="size-5" />
          </Button>
        </div>
        <ModelPicker value={model} onChange={onModelChange} />
        <div className="ml-auto flex items-center gap-1">
          <SettingsPopover
            key={conversationId}
            systemPrompt={systemPrompt}
            onSystemPromptChange={onSystemPromptChange}
          />
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="hidden size-5 dark:block" />
            <Moon className="size-5 dark:hidden" />
          </button>
        </div>
      </header>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[12vh]">
          <h1 suppressHydrationWarning className="mb-8 text-center text-2xl font-medium sm:text-3xl">{greeting()}</h1>
          <div className="w-full max-w-3xl">
            <Composer value={input} onChange={setInput} onSubmit={submit} onStop={stop} busy={busy} disabled={!model} />
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-4 pb-10">
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  streaming={busy && i === messages.length - 1 && m.role === "assistant"}
                  busy={busy}
                  onRegenerate={onRegenerate}
                  onEdit={onEdit}
                />
              ))}
              {status === "submitted" && lastIsUser && (
                <span className="inline-block size-3 animate-pulse rounded-full bg-foreground" />
              )}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-3">
            {showJump && (
              <button
                onClick={() => {
                  stick.current = true;
                  scrollToBottom(true);
                }}
                className="absolute -top-12 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border bg-background shadow"
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="size-4" />
              </button>
            )}
            <Composer value={input} onChange={setInput} onSubmit={submit} onStop={stop} busy={busy} disabled={!model} />
            <p className="mt-2 text-center text-xs text-muted-foreground">AI can make mistakes. Check important info.</p>
          </div>
        </>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil?";
  if (h < 12) return "Good morning. What's on your mind?";
  if (h < 18) return "Good afternoon. What can I help with?";
  return "Good evening. What can I help with?";
}
