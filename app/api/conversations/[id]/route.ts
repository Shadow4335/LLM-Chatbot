import { eq } from "drizzle-orm";
import { z } from "zod";
import { conversations, db } from "@/lib/db";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().max(20000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Bad id", { status: 400 });
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response("Invalid request", { status: 400 });
  if (Object.keys(body.data).length === 0) return Response.json({ ok: true });
  await db().update(conversations).set(body.data).where(eq(conversations.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Bad id", { status: 400 });
  await db().delete(conversations).where(eq(conversations.id, id));
  return Response.json({ ok: true });
}
