"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, DbError, type WishRow } from "@/lib/db";
import { HEART_IDEAS, LETTER_MAX_WORDS, countWords, isBow, isPaper } from "@/lib/catalog";
import { canEdit, getBox, getPlayer, getSettings, type Player } from "@/lib/player";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, deletePhotos, uploadPhoto } from "@/lib/storage";

export type ActionResult = { ok: boolean; error?: string };

// Every action starts here: the private link is the only key.
async function player(token: string): Promise<Player> {
  const [p, s] = await Promise.all([getPlayer(token), getSettings()]);
  if (!p) throw new Error("This link doesn't work anymore.");
  if (!canEdit(s)) throw new Error("Boxes are sealed for Christmas — no more changes.");
  return p;
}

const refresh = (token: string) => revalidatePath(`/b/${token}`, "layout");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- First visit (called from the browser, so link previews don't count)

export async function markOpened(token: string): Promise<void> {
  const p = await getPlayer(token);
  if (!p || p.link_opened_at) return;
  await db.update("people", `id=eq.${p.id}&link_opened_at=is.null`, {
    link_opened_at: new Date().toISOString(),
  });
}

// ---------- Step 1: wrapping

export async function saveWrap(token: string, fd: FormData): Promise<void> {
  const p = await player(token);
  const paper = str(fd, "paper");
  const bow = str(fd, "bow");
  if (!isPaper(paper) || !isBow(bow)) throw new Error("Pick a paper and a bow.");
  await db.upsert("boxes", { person_id: p.id, paper, bow });
  refresh(token);
  redirect(str(fd, "mode") === "edit" ? `/b/${token}?saved=1` : `/b/${token}/fill`);
}

// ---------- Step 2: store wishes

function cleanUrl(raw: string): string | null | "bad" {
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return "bad";
    return u.toString();
  } catch {
    return "bad";
  }
}

export async function saveWish(token: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const p = await player(token);
    if (!(await getBox(p.id))) return { ok: false, error: "Wrap your box first." };

    const id = str(fd, "id");
    const title = str(fd, "title");
    if (!title) return { ok: false, error: "Give your wish a name." };
    if (title.length > 120) return { ok: false, error: "That name is a bit long — keep it under 120 letters." };

    const url = cleanUrl(str(fd, "url"));
    if (url === "bad") return { ok: false, error: "That link doesn't look right. Try copying it again." };

    const priceRaw = str(fd, "price").replace(/[₱,\s]/g, "");
    let price: number | null = null;
    if (priceRaw) {
      if (!/^\d{1,7}$/.test(priceRaw)) return { ok: false, error: "Price should be a whole number, like 1200." };
      price = Number(priceRaw);
    }
    const note = str(fd, "note");
    if (note.length > 500) return { ok: false, error: "Keep the note under 500 letters." };

    let existing: WishRow | undefined;
    if (id) {
      [existing] = await db.select<WishRow>("wishes", `id=eq.${id}&person_id=eq.${p.id}&kind=eq.store&select=*`);
      if (!existing) return { ok: false, error: "That wish isn't in your box anymore." };
    }

    // Photo: new upload, removal, or unchanged.
    let photo_path = existing?.photo_path ?? null;
    const photo = fd.get("photo");
    const oldPath = photo_path;
    if (photo instanceof File && photo.size > 0) {
      if (!PHOTO_TYPES.includes(photo.type)) return { ok: false, error: "Photos can be JPG, PNG, WebP or HEIC." };
      if (photo.size > PHOTO_MAX_BYTES) return { ok: false, error: "That photo is too big. Try a smaller one." };
      const ext = photo.type.split("/")[1].replace("jpeg", "jpg");
      photo_path = `${p.id}/${randomUUID()}.${ext}`;
      await uploadPhoto(photo_path, photo);
    } else if (str(fd, "removePhoto") === "1") {
      photo_path = null;
    }

    const row = { title, url, price_php: price, note: note || null, photo_path };
    if (existing) {
      await db.update("wishes", `id=eq.${existing.id}&person_id=eq.${p.id}`, row);
    } else {
      await db.insert("wishes", { ...row, person_id: p.id, kind: "store", sort_order: Date.now() % 2_000_000_000 });
    }
    if (oldPath && oldPath !== photo_path) await deletePhotos([oldPath]);
    refresh(token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong. Try again." };
  }
}

export async function deleteWish(token: string, id: string): Promise<ActionResult> {
  try {
    const p = await player(token);
    const [w] = await db.select<WishRow>("wishes", `id=eq.${id}&person_id=eq.${p.id}&select=id,photo_path`);
    if (!w) return { ok: true };
    await db.remove("wishes", `id=eq.${id}&person_id=eq.${p.id}`);
    if (w.photo_path) await deletePhotos([w.photo_path]);
    refresh(token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't remove it. Try again." };
  }
}

// ---------- Step 2: from the heart

export async function toggleHeart(token: string, key: string, on: boolean): Promise<ActionResult> {
  try {
    const p = await player(token);
    const idea = HEART_IDEAS.find((h) => h.slug === key);
    if (!idea) return { ok: false, error: "Unknown idea." };
    if (on) {
      try {
        await db.insert("wishes", { person_id: p.id, kind: "heart", title: idea.label, heart_key: key, sort_order: HEART_IDEAS.indexOf(idea) });
      } catch (e) {
        if (!(e instanceof DbError && e.code === "23505")) throw e; // already checked
      }
    } else {
      await db.remove("wishes", `person_id=eq.${p.id}&heart_key=eq.${key}`);
    }
    refresh(token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save that. Try again." };
  }
}

export async function addHeartIdea(token: string, title: string): Promise<ActionResult> {
  try {
    const p = await player(token);
    const t = title.trim();
    if (!t) return { ok: false, error: "Write your idea first." };
    if (t.length > 120) return { ok: false, error: "Keep it under 120 letters." };
    await db.insert("wishes", { person_id: p.id, kind: "heart", title: t, sort_order: 100 + (Date.now() % 1_000_000) });
    refresh(token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't add it. Try again." };
  }
}

// ---------- Step 3: letter, and wrapping it up

export async function saveLetter(token: string, fd: FormData): Promise<void> {
  const p = await player(token);
  const box = await getBox(p.id);
  if (!box) redirect(`/b/${token}/wrap`);

  const letter = String(fd.get("letter") ?? "").replace(/\r\n/g, "\n").trim();
  if (countWords(letter) > LETTER_MAX_WORDS || letter.length > 8000) {
    throw new Error(`Letters can be up to ${LETTER_MAX_WORDS.toLocaleString()} words.`);
  }
  const intent = str(fd, "intent"); // "back" | "wrap" | "save"
  const patch: Record<string, unknown> = { letter: letter || null };

  if (intent === "wrap" && !box.posted_at) {
    const wishes = await db.select<{ id: string }>("wishes", `person_id=eq.${p.id}&select=id&limit=1`);
    if (!wishes.length) redirect(`/b/${token}/fill`);
    patch.posted_at = new Date().toISOString();
  }
  await db.update("boxes", `person_id=eq.${p.id}`, patch);
  refresh(token);

  if (intent === "back") redirect(`/b/${token}/fill`);
  if (intent === "wrap" && patch.posted_at) redirect(`/b/${token}?wrapped=1`);
  redirect(`/b/${token}?saved=1`);
}
