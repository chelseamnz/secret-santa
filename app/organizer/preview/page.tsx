import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db, type PersonRow, type Settings } from "@/lib/db";
import { isOrganizer } from "@/lib/organizer-auth";
import "../organizer.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview the reveal · Secret Santa" };

export default async function RevealPreview() {
  if (!(await isOrganizer())) redirect("/organizer");
  const [[settings], people, posted] = await Promise.all([
    db.select<Settings>("settings", "id=eq.1&select=phase"),
    db.select<PersonRow>("people", "select=id,name,link_token&order=sort_order.asc,name.asc"),
    db.select<{ id: string }>("people_status", "status=eq.under_tree&select=id"),
  ]);
  const postedIds = new Set(posted.map((p) => p.id));
  const ready = people.filter((p) => postedIds.has(p.id));

  return (
    <main className="org">
      <section className="org-content org-content--single">
        <div className="card postcard">
          <div className="card__head">
            <h1 className="display-m">Preview the reveal</h1>
            <a href="/organizer" className="link-action link-action--muted label-s">Back</a>
          </div>
          {settings?.phase === "drawn" ? (
            <p className="body-m muted">The real draw has happened, so previews are off.</p>
          ) : (
            <>
              <p className="body-s muted">
                Walk through what happens after the draw: the sealed envelope, &ldquo;You&rsquo;re Santa for&hellip;&rdquo;,
                and the unwrapped box. It pretends the draw happened and makes the person their own Santa, so you
                only ever see that person&rsquo;s box. Nothing is saved and the real draw isn&rsquo;t affected.
              </p>
              <p className="warning body-s">
                Use your test person. Previewing a relative would show you their wishlist.
              </p>
              {ready.length === 0 ? (
                <p className="empty body-m muted">No one has posted a box yet.</p>
              ) : (
                <ul className="pairs">
                  {ready.map((p) => (
                    <li key={p.id} className="pairs__row">
                      <span className="button-m">{p.name}</span>
                      <span className="grow-space" />
                      <a href={`/b/${p.link_token}?preview=reveal`} target="_blank" rel="noreferrer" className="link-action label-s">
                        Preview as {p.name} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
