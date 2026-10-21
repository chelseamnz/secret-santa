// Private link landing — placeholder until the player screens are built.
// It confirms the link works without marking it "opened".
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secret Santa 2026", robots: { index: false } };

export default async function PlayerLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-f]{32}$/.test(token);
  const [person] = valid
    ? await db.select<{ name: string }>("people", `link_token=eq.${token}&select=name`)
    : [];

  return (
    <main style={{ minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      <div className="stripes" style={{ height: 72 }} aria-hidden />
      <section style={{ display: "grid", placeItems: "center", padding: "var(--spacing-xl) var(--spacing-md)" }}>
        <div
          className="postcard"
          style={{ width: "min(420px, 100%)", padding: "var(--spacing-xl) var(--spacing-lg)", textAlign: "center", display: "grid", gap: "var(--spacing-sm)" }}
        >
          {person ? (
            <>
              <p className="label-s" style={{ margin: 0, color: "var(--color-text-accent)" }}>Welcome</p>
              <h1 className="script-l" style={{ margin: 0 }}>{person.name}</h1>
              <p className="body-m" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                Your link works! The tree is still being decorated — check back soon.
              </p>
            </>
          ) : (
            <>
              <h1 className="display-m" style={{ margin: 0 }}>This link doesn&apos;t work</h1>
              <p className="body-m" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                It may be old or it was reset. Ask the organizer for your own link.
              </p>
            </>
          )}
        </div>
      </section>
      <div className="stripes" style={{ height: 72 }} aria-hidden />
    </main>
  );
}
