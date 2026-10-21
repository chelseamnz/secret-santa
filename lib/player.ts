// Server-only helpers for the player pages (/b/<token>/...).
import { db, type BoxRow, type PersonRow, type Settings, type WishRow } from "./db";
import { signPhotos } from "./storage";

export const TOKEN_RE = /^[0-9a-f]{32}$/;

export type Player = Pick<PersonRow, "id" | "name" | "link_opened_at">;

export async function getPlayer(token: string): Promise<Player | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [p] = await db.select<Player>(
    "people",
    `link_token=eq.${token}&select=id,name,link_opened_at`,
  );
  return p ?? null;
}

export async function getSettings(): Promise<Settings> {
  const [s] = await db.select<Settings>("settings", "id=eq.1&select=*");
  return s;
}

export type TreePerson = {
  id: string;
  name: string;
  posted: boolean;
  paper: string | null;
  bow: string | null;
  posted_at: string | null;
};

/** Everyone in tree order (one spot each). */
export async function getTree(): Promise<TreePerson[]> {
  const rows = await db.select<{
    id: string;
    name: string;
    sort_order: number;
    posted_at: string | null;
    paper: string | null;
    bow: string | null;
  }>("people_status", "select=id,name,sort_order,posted_at,paper,bow&order=sort_order.asc,name.asc");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    posted: !!r.posted_at,
    paper: r.paper,
    bow: r.bow,
    posted_at: r.posted_at,
  }));
}

export async function getBox(personId: string): Promise<BoxRow | null> {
  const [b] = await db.select<BoxRow>("boxes", `person_id=eq.${personId}&select=*`);
  return b ?? null;
}

export type Wish = WishRow & { photo_url: string | null };

export async function getWishes(personId: string): Promise<Wish[]> {
  const rows = await db.select<WishRow>(
    "wishes",
    `person_id=eq.${personId}&select=*&order=kind.asc,sort_order.asc,created_at.asc`,
  );
  const urls = await signPhotos(rows.map((w) => w.photo_path).filter((p): p is string => !!p));
  return rows.map((w) => ({ ...w, photo_url: w.photo_path ? urls[w.photo_path] ?? null : null }));
}

/** Players can change their box until the Dec 24 reveal. */
export function canEdit(s: Settings): boolean {
  return !s.reveal_at || Date.now() < new Date(s.reveal_at).getTime();
}

export const organizer = {
  name: process.env.ORGANIZER_NAME?.trim() || "the organizer",
  messenger: process.env.ORGANIZER_MESSENGER_URL?.trim() || null,
};
