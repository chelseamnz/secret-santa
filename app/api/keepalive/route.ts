// Daily ping (Vercel Cron) so the free Supabase database never pauses for inactivity.
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.select("settings", "id=eq.1&select=id");
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
