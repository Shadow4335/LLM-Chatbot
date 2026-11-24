// Single source of truth for providers/models. Safe to import on the client:
// it only names env vars, never reads them.

export type ProviderId = "openai" | "anthropic" | "google" | "groq" | "openrouter";

export type ModelDef = { id: string; label: string; vision: boolean };

export type ProviderDef = {
  provider: ProviderId;
  label: string;
  envVar: string;
  /** Cheapest model; used for title generation. */
  cheapest: string;
  models: ModelDef[];
};

export const PROVIDERS: ProviderDef[] = [
  {
    provider: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    cheapest: "gpt-5.4-nano",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", vision: true },
      { id: "gpt-5.4", label: "GPT-5.4", vision: true },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini", vision: true },
      { id: "gpt-5.4-nano", label: "GPT-5.4 nano", vision: true },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    cheapest: "claude-haiku-5-5",
    models: [
      { id: "claude-opus-5-5", label: "Claude Opus 5.5", vision: true },
      { id: "claude-fable-5-2", label: "Claude Fable 5.2", vision: true },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", vision: true },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", vision: true },
    ],
  },
  {
    provider: "google",
    label: "Google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    cheapest: "gemini-flash-lite-latest",
    models: [
      { id: "gemini-pro-latest", label: "Gemini Pro", vision: true },
      { id: "gemini-flash-latest", label: "Gemini Flash", vision: true },
      { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite", vision: true },
    ],
  },
  {
    provider: "groq",
    label: "Groq",
    envVar: "GROQ_API_KEY",
    cheapest: "openai/gpt-oss-20b",
    models: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", vision: false },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", vision: false },
      { id: "qwen/qwen3.8-27b", label: "Qwen3.8 27B", vision: false },
    ],
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    envVar: "OPENROUTER_API_KEY",
    cheapest: "deepseek/deepseek-chat",
    models: [
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", vision: false },
      { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", vision: false },
    ],
  },
];

/** Model keys are namespaced "provider:modelId" so ids can't collide across providers. */
export const modelKey = (provider: ProviderId, id: string) => `${provider}:${id}`;

export function parseModelKey(key: string): { provider: ProviderDef; model: ModelDef } | null {
  const i = key.indexOf(":");
  if (i < 0) return null;
  const provider = PROVIDERS.find((p) => p.provider === key.slice(0, i));
  const model = provider?.models.find((m) => m.id === key.slice(i + 1));
  return provider && model ? { provider, model } : null;
}

export function modelLabel(key: string | null | undefined) {
  if (!key) return "";
  return parseModelKey(key)?.model.label ?? key.split(":").slice(1).join(":");
}

export type AvailableProvider = {
  provider: ProviderId;
  label: string;
  models: (ModelDef & { key: string })[];
};
