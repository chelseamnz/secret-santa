import Link from "next/link";
import { capitalize, defaultLook, joinNames, numberWord } from "@/lib/catalog";
import { db } from "@/lib/db";
import { isOrganizer } from "@/lib/organizer-auth";
import { canEdit, getBox, getPairing, getPlayer, getSettings, getTree, getWishes, previewGiftee, updatedSinceDraw } from "@/lib/player";
import { ago, daysUntilExchange, exchangeLabel, formatDateOnly, formatShort } from "@/lib/time";
import { PreviewBanner } from "../_ui/PreviewBanner";
import { RevealEnvelope } from "../_ui/Reveal";
import { CleanUrl, OpenedPing, WrapMoment } from "../_ui/client";
import { LinkNotFound } from "../_ui/LinkNotFound";
import { GiftBox, Postcard, TitleLabel } from "../_ui/pieces";
import { TreeStage } from "../_ui/TreeStage";

export const dynamic = "force-dynamic";

type Search = Promise<{ wrapped?: string; saved?: string; preview?: string }>;

export default async function TreeHome({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Search }) {
  const { token } = await params;
  const { wrapped, saved, preview: previewParam } = await searchParams;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;

  const [settings, tree, box] = await Promise.all([getSettings(), getTree(), getBox(me.id)]);
  const total = tree.length;
  const posted = tree.filter((t) => t.posted).length;
  const mine = tree.find((t) => t.id === me.id);
  const iPosted = !!mine?.posted;
  const myIndex = tree.findIndex((t) => t.id === me.id);
  const look = box ?? defaultLook(myIndex);
  const drawLabel = settings.draw_date ? `The draw · ${formatDateOnly(settings.draw_date)}` : "The draw · soon";
  const titleLine = `${posted} of ${total} wishlists under the tree`;

  // ---------- After the draw (or the organizer's rehearsal of it)
  const preview = !!previewParam && settings.phase === "open" && (await isOrganizer());
  if (settings.phase === "drawn" || preview) {
    let giftee = null as (typeof tree)[number] | null;
    let opened = false;
    if (preview) {
      giftee = previewGiftee(tree, me.id);
      opened = previewParam === "home";
    } else {
      const pairing = await getPairing(me.id);
      giftee = pairing ? tree.find((t) => t.id === pairing.giftee_id) ?? null : null;
      opened = !!pairing?.envelope_opened_at;
    }

    if (!giftee) {
      return (
        <main className="lost stripes">
          <Postcard className="lost__card">
            <p className="label-s accent">{preview ? "Preview" : "The names are drawn"}</p>
            <h2 className="display-m">{preview ? "No boxes to draw yet" : "Your envelope is on its way"}</h2>
            <p className="body-m muted">
              {preview ? "Wrap and post this box first, then preview the reveal." : "Check back soon to find out who you're Santa for."}
            </p>
          </Postcard>
        </main>
      );
    }

    if (!opened) {
      return (
        <>
          {preview && <PreviewBanner />}
          <RevealEnvelope token={token} me={me.name} giftee={giftee.name} preview={preview} />
        </>
      );
    }

    const [gBox] = await db.select<{ updated_at: string }>("boxes", `person_id=eq.${giftee.id}&select=updated_at`);
    const updated = !preview && updatedSinceDraw(gBox?.updated_at ?? null, settings.drawn_at);
    const days = daysUntilExchange(settings.reveal_at);
    const q = preview ? "?preview=1" : "";
    return (
      <main className="home">
        {preview && <PreviewBanner />}
        {!preview && <OpenedPing token={token} />}
        <div className="home__title"><TitleLabel line={`${total} of ${total}  ·  the draw is done`} /></div>
        <section className="home__tree" aria-label="The tree">
          <TreeStage spots={tree} meId={me.id} initialTag={giftee.id} caption="Tap a box to see whose it is." />
        </section>
        <div className="home__card">
          <Postcard className="status">
            <p className="label-s accent desk-only">
              The draw is done{days > 0 ? `  ·  ${days} ${days === 1 ? "day" : "days"} to go` : ""}
            </p>
            <h2 className="display-m home__h">You&apos;re Santa for {giftee.name}</h2>
            <p className="body-s muted home__p">
              {updated ? `${giftee.name} updated their box ${ago(gBox!.updated_at)}.` : `Everything ${giftee.name} wished for is inside.`}
            </p>
            {giftee.paper && giftee.bow && (
              <div className="yourbox desk-only">
                <GiftBox paper={giftee.paper} bow={giftee.bow} className="yourbox__img" />
                <span>
                  <b className="button-m">{giftee.name}&apos;s box</b>
                  <span className="body-s muted">{updated ? `Updated ${ago(gBox!.updated_at)}` : "Wrapped and waiting"}</span>
                </span>
              </div>
            )}
            <div className="row-between">
              <p className="label-s accent">Exchange · {exchangeLabel(settings.reveal_at)}</p>
              <Link href={`/b/${token}/giftee${q}`} className="button button--primary button-m">Open {giftee.name}&apos;s box</Link>
            </div>
          </Postcard>
          {!preview && canEdit(settings) && (
            <p className="home__own body-s muted">
              Need to change your own wishlist? <Link href={`/b/${token}/edit`} className="accent">Edit my box</Link>
            </p>
          )}
        </div>
      </main>
    );
  }

  const waiting = tree.filter((t) => !t.posted && t.id !== me.id).map((t) => t.name);
  const waitingLine =
    waiting.length === 0
      ? settings.draw_date
        ? `The draw is on ${formatDateOnly(settings.draw_date)}.`
        : "The draw is coming soon."
      : waiting.length <= 3
        ? `Waiting on ${joinNames(waiting)}.`
        : `Waiting on ${waiting.length} more people.`;

  // Where "Wrap my box" picks up.
  let next = `/b/${token}/wrap`;
  if (box && !iPosted) {
    const wishes = await getWishes(me.id);
    next = wishes.length ? `/b/${token}/letter` : `/b/${token}/fill`;
  }

  const left = waiting.length;
  const moreShort = left === 0 ? "Everyone's under the tree!" : `${capitalize(numberWord(left))} more to go`;
  const moreLong =
    left === 0 ? "Everyone's under the tree!" : left === 1 ? "One more wishlist to go" : `${capitalize(numberWord(left))} more wishlists to go`;

  const caption =
    posted === 0 ? `${capitalize(numberWord(total))} spots, one for each of us.` : "Tap a box to see whose it is.";

  return (
    <main className="home">
      <OpenedPing token={token} />
      {(wrapped || saved) && <CleanUrl />}
      {wrapped && iPosted && box && (
        <WrapMoment name={me.name} paper={box.paper} bow={box.bow} letter={(box.letter ?? "").slice(0, 220)} />
      )}

      <div className="home__title"><TitleLabel line={titleLine} /></div>

      <section className="home__tree" aria-label="The tree">
        <TreeStage spots={tree} meId={me.id} initialTag={wrapped || saved ? me.id : null} caption={caption} />
      </section>

      <div className="home__card">
        {!iPosted ? (
          <Postcard className="welcome">
            <div className="row-between">
              <p className="label-s accent">Welcome, {me.name}</p>
              <Link href={`/b/${token}/not-you`} className="label-s muted link-quiet">Not {me.name}?</Link>
            </div>
            <h2 className="display-m home__h">
              {box ? "Your box is waiting" : posted === 0 ? "Be the first under the tree" : "Your spot is waiting"}
            </h2>
            <p className="body-s muted home__p">
              Each of us gets one gift box. Wrap yours, fill it with your wishes, and tuck in a letter to Santa.
            </p>
            <ol className="steps3">
              <li><span className="steps3__n">1</span><span><b>Wrap<span className="desk-only"> your box</span></b><span className="steps3__d">Pick a paper and a bow.</span></span></li>
              <li><span className="steps3__n">2</span><span><b><span className="mob-only">Wish</span><span className="desk-only">Fill it with wishes</span></b><span className="steps3__d">Add what you&apos;d love, with links and photos.</span></span></li>
              <li><span className="steps3__n">3</span><span><b><span className="mob-only">Write</span><span className="desk-only">Write to Santa</span></b><span className="steps3__d">A short letter, typed on the box.</span></span></li>
            </ol>
            <Link href={next} className="button button--primary button-m full">
              {box ? "Keep wrapping" : "Wrap my box"}
            </Link>
            <p className="label-s muted">{drawLabel} &nbsp;·&nbsp; Exchange · {exchangeLabel(settings.reveal_at)}</p>
          </Postcard>
        ) : (
          <Postcard className="status">
            <p className="label-s accent desk-only">
              {wrapped ? `Posted · ${formatShort(mine?.posted_at ?? null)}` : saved ? "Saved · just now" : `Welcome back, ${me.name}`}
            </p>
            <h2 className="display-m home__h">
              {wrapped ? "You're under the tree!" : saved ? "Your box is updated!" : (
                <><span className="mob-only">{moreLong}</span><span className="desk-only">{moreShort}</span></>
              )}
            </h2>
            <p className="body-s muted home__p">{waitingLine}</p>
            <div className="yourbox desk-only">
              <GiftBox paper={look.paper} bow={look.bow} className="yourbox__img" />
              <span>
                <b className="button-m">
                  {wrapped ? "Wrapped and waiting" : saved ? "Same spot under the tree" : "Your box is under the tree"}
                </b>
                <span className="body-s muted">
                  {saved ? "Your Santa will see an Updated tag after the draw." : "You can still edit your wishlist until the draw."}
                </span>
              </span>
            </div>
            <div className="row-between">
              <p className="label-s accent">{drawLabel}</p>
              <Link href={`/b/${token}/edit`} className="button button--primary button-m">Edit my wishlist</Link>
            </div>
          </Postcard>
        )}
      </div>
    </main>
  );
}
