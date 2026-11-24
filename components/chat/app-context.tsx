"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AvailableProvider } from "@/lib/models";
import type { ConversationSummary } from "@/lib/chat-types";

type Ctx = {
  providers: AvailableProvider[];
  defaultModel: string | null;
  modelsLoaded: boolean;
  conversations: ConversationSummary[];
  refreshConversations: () => Promise<void>;
  upsertLocalConversation: (c: ConversationSummary) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  newChatNonce: number;
  bumpNewChat: () => void;
  temperature: number;
  setTemperature: (v: number) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

export function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<AvailableProvider[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [newChatNonce, setNonce] = useState(0);
  const [temperature, setTemperatureState] = useState(1);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const saved = readLS("sidebarOpen");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpenState(mobile ? false : saved !== "false");
    const t = Number(readLS("temperature"));
    if (readLS("temperature") !== null && !Number.isNaN(t)) setTemperatureState(t);

    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers ?? []);
        setDefaultModel(d.defaultModel ?? null);
        if (!d.providers?.length) toast.error("No API keys configured. Set at least one provider key.");
      })
      .catch(() => toast.error("Failed to load models"))
      .finally(() => setModelsLoaded(true));
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      setConversations(await r.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load chats");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshConversations();
  }, [refreshConversations]);

  const value = useMemo<Ctx>(
    () => ({
      providers,
      defaultModel,
      modelsLoaded,
      conversations,
      refreshConversations,
      upsertLocalConversation: (c) =>
        setConversations((prev) => [c, ...prev.filter((p) => p.id !== c.id)]),
      sidebarOpen,
      setSidebarOpen: (v) => {
        setSidebarOpenState(v);
        if (!window.matchMedia("(max-width: 767px)").matches) writeLS("sidebarOpen", String(v));
      },
      newChatNonce,
      bumpNewChat: () => setNonce((n) => n + 1),
      temperature,
      setTemperature: (v) => {
        setTemperatureState(v);
        writeLS("temperature", String(v));
      },
    }),
    [providers, defaultModel, modelsLoaded, conversations, refreshConversations, sidebarOpen, newChatNonce, temperature],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
