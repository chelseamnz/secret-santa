"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, DbError, type Settings } from "@/lib/db";
import {
  endSession,
  passwordMatches,
  requireOrganizer,
  startSession,
} from "@/lib/organizer-auth";
import { fromManilaInput } from "@/lib/time";

function back(kind: "notice" | "error", message: string): never {
  revalidatePath("/organizer");
  redirect(`/organizer?${kind}=${encodeURIComponent(message)}`);
}

async function phase(): Promise<Settings["phase"]> {
  const [s] = await db.select<Settings>("settings", "id=eq.1&select=phase");
  return s?.phase ?? "open";
}

// ---------- Sign in / out

export async function signIn(formData: FormData) {
  const attempt = String(formData.get("password") ?? "");
  if (!passwordMatches(attempt)) back("error", "That password doesn't match.");
  await startSession();
  redirect("/organizer");
}

export async function signOut() {
  await endSession();
  redirect("/organizer");
}

// ---------- Family

export async function addPerson(formData: FormData) {
  await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name) back("error", "Type a name first.");
  if (name.length > 40) back("error", "Keep names under 40 characters.");
  if ((await phase()) !== "open") back("error", "The draw already happened.");

  const existing = await db.select<{ sort_order: number }>(
    "people",
    "select=sort_order&order=sort_order.desc&limit=1",
  );
  try {
    await db.insert("people", {
      name,
      sort_order: (existing[0]?.sort_order ?? 0) + 1,
    });
  } catch (e) {
    if (e instanceof DbError && e.code === "23505") {
      back("error", `${name} is already on the list.`);
    }
    throw e;
  }
  back("notice", `${name} added. Copy their link to send it.`);
}

export async function removePerson(id: string, name: string) {
  await requireOrganizer();
  if ((await phase()) !== "open") back("error", "People can't be removed after the draw.");
  await db.remove("people", `id=eq.${encodeURIComponent(id)}`);
  back("notice", `${name} removed.`);
}

export async function resetLink(id: string, name: string) {
  await requireOrganizer();
  await db.update("people", `id=eq.${encodeURIComponent(id)}`, {
    link_token: randomBytes(16).toString("hex"),
  });
  back("notice", `${name}'s old link no longer works. Copy the new one and send it.`);
}

// ---------- Settings

export async function saveSettings(formData: FormData) {
  await requireOrganizer();
  const budget = Number(String(formData.get("budget") ?? "").replace(/[^\d]/g, ""));
  const drawDate = String(formData.get("draw_date") ?? "");
  const revealRaw = String(formData.get("reveal_at") ?? "");

  if (!Number.isFinite(budget) || budget < 0) back("error", "Budget should be a number.");
  if (drawDate && !/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) back("error", "Check the draw date.");
  const revealAt = revealRaw ? fromManilaInput(revealRaw) : null;
  if (revealRaw && !revealAt) back("error", "Check the reveal date and time.");

  await db.update("settings", "id=eq.1", {
    budget_php: budget,
    draw_date: drawDate || null,
    reveal_at: revealAt,
  });
  back("notice", "Settings saved.");
}

// ---------- The draw

export async function startDraw() {
  await requireOrganizer();
  try {
    const n = await db.rpc<number>("run_draw");
    back("notice", `Done! ${n} pairs made. Tell everyone to open their link.`);
  } catch (e) {
    if (e instanceof DbError) back("error", e.message);
    throw e;
  }
}
