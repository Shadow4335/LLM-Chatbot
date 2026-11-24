import "server-only";
import { APICallError, RetryError } from "ai";

/** Turn provider errors into short, user-facing messages. Never leaks keys. */
export function friendlyError(err: unknown, providerLabel = "Provider"): string {
  let e: unknown = err;
  if (RetryError.isInstance(e)) e = e.lastError;
  if (APICallError.isInstance(e)) {
    const s = e.statusCode;
    if (s === 401 || s === 403) return `${providerLabel}: invalid or unauthorized API key.`;
    if (s === 429) return `${providerLabel}: rate limit or quota exceeded. Try again shortly.`;
    if (s === 404) return `${providerLabel}: model not found or not available for this key.`;
    if (s === 400) return `${providerLabel}: bad request — ${truncate(e.message)}`;
    if (s && s >= 500) return `${providerLabel} is having issues (${s}). Try again.`;
    return `${providerLabel}: ${truncate(e.message)}`;
  }
  if (e instanceof Error) return truncate(e.message);
  return "Something went wrong.";
}

const truncate = (s: string) => (s.length > 200 ? s.slice(0, 200) + "…" : s);

/** HTTP status to return for a provider error that happened before any output. */
export function errorStatus(err: unknown): number {
  let e: unknown = err;
  if (RetryError.isInstance(e)) e = e.lastError;
  if (APICallError.isInstance(e) && e.statusCode && e.statusCode >= 400 && e.statusCode < 600) return e.statusCode;
  return 502;
}
