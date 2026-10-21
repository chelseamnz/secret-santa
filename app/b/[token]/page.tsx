import Link from "next/link";
import { capitalize, defaultLook, joinNames, numberWord } from "@/lib/catalog";
import { getBox, getPlayer, getSettings, getTree, getWishes } from "@/lib/player";
import { formatDateOnly, formatShort } from "@/lib/time";
import { CleanUrl, OpenedPing, WrapMoment } from "../_ui/client";
import { LinkNotFound } from "../_ui/LinkNotFound";
import { GiftBox, Postcard, TitleLabel } from "../_ui/pieces";
import { TreeStage } from "../_ui/TreeStage";

export const dynamic = "force-dynamic";

type Search = Promise<{ wrapped?: string; saved?: string }>;

export default async function TreeHome({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Search }) {
  const { token } = await params;
  const { wrapped, saved } = await searchParams;
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

  if (settings.phase === "drawn") {
    return (
      <main className="home">
        <div className="home__title"><TitleLabel line={`${total} of ${total} wishlists under the tree`} /></div>
        <section className="home__tree">
          <TreeStage spots={tree} meId={me.id} />
        </section>
        <div className="home__card">
          <Postcard>
            <p className="label-s accent">The names are drawn</p>
            <h2 className="display-m">Your envelope is on its way</h2>
            <p className="body-m muted">Check back soon to find out who you&apos;re Santa for.</p>
          </Postcard>
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
            <p className="label-s muted">{drawLabel} &nbsp;·&nbsp; Exchange · Dec 24</p>
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
