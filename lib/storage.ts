// Server-only access to the private "wish-photos" bucket in Supabase Storage.
// Photos are never public: pages get short-lived signed URLs.
import { DbError, headers } from "./db";

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;
const BUCKET = "wish-photos";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export async function uploadPhoto(path: string, file: File): Promise<void> {
  const h = headers({ "Content-Type": file.type, "x-upsert": "true" });
  const res = await fetch(`${BASE}/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: h,
    body: Buffer.from(await file.arrayBuffer()),
    cache: "no-store",
  });
  if (!res.ok) throw new DbError(`Photo upload failed (${res.status})`, res.status);
}

export async function deletePhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await fetch(`${BASE}/object/${BUCKET}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ prefixes: paths }),
    cache: "no-store",
  }).catch(() => undefined); // a leftover file is harmless
}

/** path → signed URL (valid for 2 hours). Missing photos are left out. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  try {
    const res = await fetch(`${BASE}/object/sign/${BUCKET}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ expiresIn: 7200, paths }),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as { path: string; signedURL: string | null }[];
    const out: Record<string, string> = {};
    for (const r of rows) if (r.signedURL) out[r.path] = `${BASE}${r.signedURL}`;
    return out;
  } catch {
    return {};
  }
}
