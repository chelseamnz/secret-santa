import type { Metadata } from "next";
import { headers } from "next/headers";
import { db, DbError, type PersonRow, type PersonStatus, type Settings, type StatusRow } from "@/lib/db";
import { isOrganizer } from "@/lib/organizer-auth";
import { formatDateOnly, formatDateTime, formatShort, toManilaInput } from "@/lib/time";
import {
  addPerson,
  removePerson,
  resetLink,
  saveSettings,
  signIn,
  signOut,
  startDraw,
} from "./actions";
import { ConfirmAction, CopyLinkButton, EmergencyButton, PendingButton, Toast } from "./ui";
import "./organizer.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Organizer · Secret Santa" };

type SearchParams = Promise<{ notice?: string; error?: string; view?: string }>;

const STATUS_LABEL: Record<PersonStatus, string> = {
  under_tree: "Under the tree",
  wrapping: "Wrapping",
  not_opened: "Not opened",
};

function Header() {
  return (
    <header className="org-header stripes">
      <div className="title-label postcard">
        <span className="label-s title-label__year">2026</span>
        <span className="label-s title-label__year title-label__year--right">2026</span>
        <span className="script-l title-label__secret">Secret</span>
        <span className="display-xl title-label__santa">Santa</span>
        <span className="label-s title-label__sub">Organizer</span>
      </div>
    </header>
  );
}

function Notices({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {notice && <Toast message={notice} />}
      {error && <Toast message={error} tone="error" />}
    </>
  );
}

async function SignIn({ error }: { error?: string }) {
  return (
    <main className="org">
      <Header />
      <section className="org-signin">
        <form action={signIn} className="card postcard org-signin__card">
          <p className="label-s accent">Organizer only</p>
          <h1 className="display-m">Organizer sign in</h1>
          <label className="field">
            <span className="button-m">Password</span>
            <input name="password" type="password" autoComplete="current-password" required className="input body-m" />
          </label>
          <PendingButton label="Sign in" className="button button--primary button-m full" />
        </form>
      </section>
      <Notices error={error} />
    </main>
  );
}

function activity(p: PersonRow, s?: StatusRow): string {
  if (s?.posted_at) return `Posted ${formatShort(s.posted_at)}`;
  if (p.link_opened_at) return `Started ${formatShort(p.link_opened_at)}`;
  return "Link not opened yet";
}

export default async function OrganizerPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error, view } = await searchParams;
  if (!(await isOrganizer())) return <SignIn error={error} />;

  let people: PersonRow[] = [];
  let statuses: StatusRow[] = [];
  let settings: Settings | undefined;
  let loadError: string | undefined;
  try {
    [people, statuses, [settings]] = await Promise.all([
      db.select<PersonRow>("people", "select=id,name,sort_order,link_token,link_opened_at&order=sort_order.asc,name.asc"),
      db.select<StatusRow>("people_status", "select=id,status,posted_at,box_updated_at"),
      db.select<Settings>("settings", "id=eq.1&select=*"),
    ]);
  } catch (e) {
    loadError = e instanceof DbError ? e.message : "Couldn't reach the database.";
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const statusOf = new Map(statuses.map((s) => [s.id, s]));
  const total = people.length;
  const posted = statuses.filter((s) => s.status === "under_tree").length;
  const drawn = settings?.phase === "drawn";
  const ready = !drawn && total >= 3 && posted === total;

  // ---------- Emergency view
  if (view === "pairings" && drawn) {
    const pairs = await db.select<{ santa_id: string; giftee_id: string }>("pairings", "select=santa_id,giftee_id");
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const order = new Map(people.map((p, i) => [p.id, i]));
    pairs.sort((a, b) => (order.get(a.santa_id) ?? 0) - (order.get(b.santa_id) ?? 0));
    return (
      <main className="org">
        <Header />
        <section className="org-content org-content--single">
          <div className="card postcard">
            <p className="warning body-s">Only you can see this. Close it as soon as you&apos;re done.</p>
            <div className="card__head">
              <h1 className="display-m">Who drew whom</h1>
              <span className="label-s muted">{pairs.length} pairs</span>
            </div>
            <ul className="pairs">
              {pairs.map((p) => (
                <li key={p.santa_id} className="pairs__row">
                  <span className="button-m">{nameOf.get(p.santa_id)}</span>
                  <span className="body-m muted">→</span>
                  <span className="body-m">{nameOf.get(p.giftee_id)}</span>
                </li>
              ))}
            </ul>
            <a href="/organizer" className="button button--primary button-m full">Hide pairings</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="org">
      <Header />

      <section className="org-content">
        {/* ---------- Family */}
        <div className="card postcard org-family">
          <div className="card__head">
            <h1 className="display-m">Family</h1>
            <span className="label-s muted">{total} {total === 1 ? "person" : "people"}</span>
          </div>
          <p className="body-s muted">
            Send each person their own link in a private Messenger chat. Reset a link if it gets
            forwarded — the old one stops working.
          </p>

          {loadError && <p className="warning body-s">{loadError}</p>}

          {total === 0 && !loadError && (
            <p className="empty body-m muted">No one yet. Add the family below, one name at a time.</p>
          )}

          <ul className="people">
            {people.map((p) => {
              const s = statusOf.get(p.id);
              const status = s?.status ?? "not_opened";
              const url = `${origin}/b/${p.link_token}`;
              return (
                <li key={p.id} className="person">
                  <div className="person__who">
                    <span className="button-m">{p.name}</span>
                    <span className="body-s muted">{activity(p, s)}</span>
                  </div>
                  <span className={`chip chip--${status} label-s`}>{STATUS_LABEL[status]}</span>
                  <div className="person__actions">
                    <CopyLinkButton url={url} name={p.name} compact />
                    <ConfirmAction
                      trigger="Reset"
                      triggerClass="link-action link-action--muted label-s"
                      title={`Reset ${p.name}'s link?`}
                      body="Their old link will stop working. Send them the new one in Messenger. Their box and wishes stay."
                      cancelLabel="Keep it"
                      confirmLabel="Reset link"
                      action={resetLink.bind(null, p.id, p.name)}
                    />
                    {!drawn && (
                      <ConfirmAction
                        trigger="Remove"
                        triggerClass="link-action link-action--muted label-s"
                        title={`Remove ${p.name}?`}
                        body="Their link, box and wishes will be deleted. This can't be undone."
                        cancelLabel="Keep"
                        confirmLabel="Remove"
                        action={removePerson.bind(null, p.id, p.name)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {!drawn && (
            <form action={addPerson} className="add-person">
              <input name="name" placeholder="Add a name" maxLength={40} required className="input body-m" aria-label="Name" />
              <PendingButton label="Add" className="button button--primary button-m" />
            </form>
          )}
        </div>

        <div className="org-side">
          {/* ---------- Status & draw */}
          <div className="card postcard">
            {drawn ? (
              <>
                <p className="label-s accent">Drawn · {formatDateTime(settings?.drawn_at ?? null)}</p>
                <p className="display-l">{total} pairs made</p>
                <p className="body-s muted">Everyone can open their envelope now. Nobody got themselves.</p>
                <EmergencyButton />
              </>
            ) : (
              <>
                <p className="label-s accent">
                  The draw{settings?.draw_date ? ` · ${formatDateOnly(settings.draw_date)}` : ""}
                </p>
                <p className="count">
                  <span className="display-l">{posted} of {total}</span>{" "}
                  <span className="body-m muted">under the tree</span>
                </p>
                <div className="progress" aria-hidden>
                  {people.map((p, i) => (
                    <span key={p.id} className={i < posted ? "progress__on" : ""} />
                  ))}
                </div>
                <ConfirmAction
                  trigger="Start the draw"
                  triggerClass={`button button-m full ${ready ? "button--primary" : "button--disabled"}`}
                  disabled={!ready}
                  title="Start the draw?"
                  body={`This pairs all ${total} people at once. It can't be undone.`}
                  cancelLabel="Not yet"
                  confirmLabel="Start the draw"
                  action={startDraw}
                />
                <a href="/organizer/preview" className="link-action label-s preview-link">Preview the reveal</a>
              </>
            )}
          </div>

          {/* ---------- Settings */}
          <form action={saveSettings} className="card postcard settings">
            <h2 className="display-m">Settings</h2>
            <label className="field">
              <span className="button-m">Budget per gift (₱)</span>
              <input name="budget" inputMode="numeric" defaultValue={settings?.budget_php ?? 1000} className="input body-m" />
            </label>
            <label className="field">
              <span className="button-m">Draw date</span>
              <input name="draw_date" type="date" defaultValue={settings?.draw_date ?? ""} className="input body-m" />
            </label>
            <label className="field">
              <span className="button-m">Reveal on Dec 24 at (Manila time)</span>
              <input name="reveal_at" type="datetime-local" defaultValue={toManilaInput(settings?.reveal_at ?? null)} className="input body-m" />
            </label>
            <PendingButton label="Save settings" className="button button--secondary button-m full" />
          </form>

          <form action={signOut}>
            <button type="submit" className="link-action link-action--muted label-s">Sign out</button>
          </form>
        </div>
      </section>

      <Notices notice={notice} error={error} />
    </main>
  );
}
