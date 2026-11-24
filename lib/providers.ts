import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { PROVIDERS, modelKey, parseModelKey, type AvailableProvider, type ProviderDef } from "./models";

const hasKey = (p: ProviderDef) => Boolean(process.env[p.envVar]?.trim());

export function availableProviders(): AvailableProvider[] {
  return PROVIDERS.filter(hasKey).map((p) => ({
    provider: p.provider,
    label: p.label,
    models: p.models.map((m) => ({ ...m, key: modelKey(p.provider, m.id) })),
  }));
}

export function defaultModelKey(): string | null {
  return availableProviders()[0]?.models[0]?.key ?? null;
}

export class ModelError extends Error {}

export function getModel(key: string): LanguageModel {
  const parsed = parseModelKey(key);
  if (!parsed) throw new ModelError(`Unknown model "${key}"`);
  const { provider, model } = parsed;
  const apiKey = process.env[provider.envVar]?.trim();
  if (!apiKey) throw new ModelError(`${provider.label} is not configured (${provider.envVar} missing)`);
  switch (provider.provider) {
    case "openai":
      return createOpenAI({ apiKey })(model.id);
    case "anthropic":
      return createAnthropic({ apiKey })(model.id);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model.id);
    case "groq":
      return createGroq({ apiKey })(model.id);
    case "openrouter":
      return createOpenRouter({ apiKey }).chat(model.id);
  }
}

/** Cheapest model among configured providers (Google → OpenAI → Groq → Anthropic → OpenRouter). */
export function cheapestModelKey(): string | null {
  const order = ["google", "openai", "groq", "anthropic", "openrouter"];
  const p = PROVIDERS.filter(hasKey).sort((a, b) => order.indexOf(a.provider) - order.indexOf(b.provider))[0];
  return p ? modelKey(p.provider, p.cheapest) : null;
}

export function providerLabelFor(key: string) {
  return parseModelKey(key)?.provider.label ?? "Provider";
}
