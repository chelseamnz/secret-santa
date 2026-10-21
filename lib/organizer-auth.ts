// Organizer password gate. The cookie holds an HMAC of the password, never the
// password itself, and every organizer action re-checks it.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "organizer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const p = process.env.ORGANIZER_PASSWORD;
  if (!p) throw new Error("ORGANIZER_PASSWORD is not set.");
  return p;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(attempt: string): boolean {
  return safeEqual(sign(attempt), sign(secret()));
}

export async function isOrganizer(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, sign("organizer-session"));
}

export async function startSession(): Promise<void> {
  (await cookies()).set(COOKIE, sign("organizer-session"), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/organizer",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/organizer" });
}

export async function requireOrganizer(): Promise<void> {
  if (!(await isOrganizer())) throw new Error("Not signed in as organizer.");
}
