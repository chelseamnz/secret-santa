// Everyone is in Manila, so dates are shown and entered in Asia/Manila time.
export const TZ = "Asia/Manila";

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in Manila, for <input type="datetime-local">. */
export function toManilaInput(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" entered in Manila → ISO string. Manila has no DST (+08:00). */
export function fromManilaInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00+08:00`).toISOString();
}

export function formatShort(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "2026-11-29" → "Nov 29" without timezone shifts. */
export function formatDateOnly(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "today", "yesterday", "3 days ago", "2 hours ago" — for Updated tags. */
export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** The exchange/reveal day: the reveal time from Settings, or Dec 25 until it's set. */
export function exchangeDate(revealAt: string | null, now = new Date()): Date {
  if (revealAt) return new Date(revealAt);
  return new Date(`${toManilaInput(now.toISOString()).slice(0, 4)}-12-25T00:00:00+08:00`);
}

/** "Dec 25" */
export function exchangeLabel(revealAt: string | null): string {
  return formatShort(exchangeDate(revealAt).toISOString());
}

/** Whole days from today until the exchange day, both counted in Manila (0 on the day). */
export function daysUntilExchange(revealAt: string | null, now = new Date()): number {
  const day = (d: Date) => new Date(toManilaInput(d.toISOString()).slice(0, 10) + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((day(exchangeDate(revealAt, now)) - day(now)) / 86400000));
}
