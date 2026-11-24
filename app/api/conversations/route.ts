import { desc } from "drizzle-orm";
import { conversations, db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db()
      .select({ id: conversations.id, title: conversations.title, updatedAt: conversations.updatedAt })
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(500);
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return new Response("Database error", { status: 500 });
  }
}
