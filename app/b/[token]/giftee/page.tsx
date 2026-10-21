import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isOrganizer } from "@/lib/organizer-auth";
import { getBox, getPairing, getPlayer, getSettings, getTree, getWishes, previewGiftee, updatedSinceDraw } from "@/lib/player";
import { ago } from "@/lib/time";
import { GifteeWishes, Greeting, LetterRead } from "../../_ui/GifteeBox";
import { LinkNotFound } from "../../_ui/LinkNotFound";
import { PreviewBanner } from "../../_ui/PreviewBanner";
import { StepHead, StepShell } from "../../_ui/pieces";

export const dynamic = "force-dynamic";

export default async function GifteePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const { preview: previewParam } = await searchParams;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;
  const settings = await getSettings();
  const preview = !!previewParam && settings.phase === "open" && (await isOrganizer());

  let gifteeId: string | null = null;
  let gifteeName = "";
  if (preview) {
    const g = previewGiftee(await getTree(), me.id);
    if (g) { gifteeId = g.id; gifteeName = g.name; }
  } else if (settings.phase === "drawn") {
    const pairing = await getPairing(me.id);
    if (pairing) {
      gifteeId = pairing.giftee_id;
      const [g] = await db.select<{ name: string }>("people", `id=eq.${gifteeId}&select=name`);
      gifteeName = g?.name ?? "";
      // Remember the visit: first unwrap, and "seen" for the Updated tag.
      const now = new Date().toISOString();
      await db.update("pairings", `santa_id=eq.${me.id}`, {
        last_seen_at: now,
        ...(pairing.box_opened_at ? {} : { box_opened_at: now }),
      }).catch(() => undefined);
    }
  }
  if (!gifteeId) redirect(`/b/${token}`);

  const [box, wishes] = await Promise.all([getBox(gifteeId), getWishes(gifteeId)]);
  if (!box) redirect(`/b/${token}`);
  const updated = !preview && updatedSinceDraw(box.updated_at, settings.drawn_at);
  const store = wishes.filter((w) => w.kind === "store");
  const heart = wishes.filter((w) => w.kind === "heart");
  const back = preview ? `/b/${token}?preview=home` : `/b/${token}`;

  return (
    <>
      {preview && <PreviewBanner />}
      <StepShell name={gifteeName} paper={box.paper} bow={box.bow} caption={`${gifteeName}'s box, unwrapped.`} wide>
        <div className="pc-shadow">
          <div className="postcard pc step-form giftee">
            <StepHead
              kicker={`${gifteeName}'s box${updated ? `  ·  Updated ${ago(box.updated_at)}` : ""}`}
              title={`What ${gifteeName} wished for`}
            />
            <div className="giftee__cols">
              <section className="giftee-section">
                <h3 className="label-s muted">{gifteeName}&apos;s letter</h3>
                {box.letter?.trim() ? <LetterRead name={gifteeName} letter={box.letter} /> : <Greeting name={gifteeName} />}
              </section>
              <GifteeWishes name={gifteeName} store={store} heart={heart} />
            </div>
            <Link href={back} className="button button--danger-outline button-m full">Back to the tree</Link>
          </div>
        </div>
      </StepShell>
    </>
  );
}
