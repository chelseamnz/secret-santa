// Server-only access to Supabase's REST API (PostgREST) using the secret key.
// Never import this from a client component.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class DbError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function headers(extra?: Record<string, string>): Record<string, string> {
  if (!URL_ || !KEY) {
    throw new DbError(
      "Database keys are missing. Check the Vercel environment variables.",
      500,
    );
  }
  const h: Record<string, string> = {
    apikey: KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  // Legacy service_role keys are JWTs and go in Authorization too.
  // New-style keys (sb_secret_…) are sent as apikey only.
  if (!KEY.startsWith("sb_")) h.Authorization = `Bearer ${KEY}`;
  return h;
}

async function request<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const { prefer, ...rest } = init;
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...rest,
    headers: headers(prefer ? { Prefer: prefer } : undefined),
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Database error (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.message || body.hint || message;
      code = body.code;
    } catch {
      /* not JSON */
    }
    throw new DbError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const db = {
  select: <T>(table: string, query: string) =>
    request<T[]>(`${table}?${query}`),
  insert: (table: string, row: Record<string, unknown>) =>
    request<void>(table, {
      method: "POST",
      body: JSON.stringify(row),
      prefer: "return=minimal",
    }),
  /** Insert, or update the existing row with the same primary key. */
  upsert: (table: string, row: Record<string, unknown>) =>
    request<void>(table, {
      method: "POST",
      body: JSON.stringify(row),
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
  update: (table: string, filter: string, patch: Record<string, unknown>) =>
    request<void>(`${table}?${filter}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=minimal",
    }),
  remove: (table: string, filter: string) =>
    request<void>(`${table}?${filter}`, {
      method: "DELETE",
      prefer: "return=minimal",
    }),
  rpc: <T>(fn: string, args: Record<string, unknown> = {}) =>
    request<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
};

// ---------- Types matching supabase/migrations/0001_init.sql

export type Phase = "open" | "drawn";

export type Settings = {
  id: number;
  budget_php: number;
  draw_date: string | null;
  reveal_at: string | null;
  phase: Phase;
  drawn_at: string | null;
  reveal_order: string[] | null;
};

export type PersonStatus = "not_opened" | "wrapping" | "under_tree";

export type PersonRow = {
  id: string;
  name: string;
  sort_order: number;
  link_token: string;
  link_opened_at: string | null;
};

export type StatusRow = {
  id: string;
  status: PersonStatus;
  posted_at: string | null;
  box_updated_at: string | null;
};

export type BoxRow = {
  person_id: string;
  paper: string;
  bow: string;
  letter: string | null;
  posted_at: string | null;
  updated_at: string;
};

export type WishRow = {
  id: string;
  person_id: string;
  kind: "store" | "heart";
  title: string;
  price_php: number | null;
  url: string | null;
  note: string | null;
  photo_path: string | null;
  heart_key: string | null;
  sort_order: number;
  created_at: string;
};
