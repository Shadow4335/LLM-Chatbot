import { availableProviders, defaultModelKey } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ providers: availableProviders(), defaultModel: defaultModelKey() });
}
