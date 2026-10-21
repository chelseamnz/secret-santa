import Link from "next/link";
import { redirect } from "next/navigation";
import { bowLabel, countWords, paperLabel } from "@/lib/catalog";
import { canEdit, getBox, getPlayer, getSettings, getWishes } from "@/lib/player";
import { formatDateOnly } from "@/lib/time";
import { LinkNotFound } from "../../_ui/LinkNotFound";
import { StepHead, StepShell } from "../../_ui/pieces";

export const dynamic = "force-dynamic";

export default async function EditHub({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;
  const [settings, box] = await Promise.all([getSettings(), getBox(me.id)]);
  if (!canEdit(settings)) redirect(`/b/${token}`);
  if (!box) redirect(`/b/${token}/wrap`);
  if (!box.posted_at) redirect(`/b/${token}`);
  const wishes = await getWishes(me.id);
  const store = wishes.filter((w) => w.kind === "store").length;
  const heart = wishes.length - store;
  const words = countWords(box.letter ?? "");
  const kicker =
    settings.phase === "drawn"
      ? "Your Santa sees an Updated tag"
      : `Edit until the draw${settings.draw_date ? ` · ${formatDateOnly(settings.draw_date)}` : ""}`;

  const rows = [
    { title: "Wrapping", sub: `${paperLabel(box.paper)}  ·  ${bowLabel(box.bow)}`, href: `/b/${token}/wrap` },
    { title: "Wishes", sub: `${store} from the store  ·  ${heart} from the heart`, href: `/b/${token}/fill` },
    { title: "Letter", sub: words ? `${words.toLocaleString()} ${words === 1 ? "word" : "words"}` : "No letter — your Santa gets a greeting", href: `/b/${token}/letter` },
  ];

  return (
    <StepShell name={me.name} paper={box.paper} bow={box.bow} caption="Your box, wrapped and waiting.">
      <div className="pc-shadow">
        <div className="postcard pc step-form">
          <StepHead kicker={kicker} title="Edit your box" />
          <ul className="hub">
            {rows.map((r) => (
              <li key={r.title}>
                <Link href={r.href} className="hub__row">
                  <span>
                    <b className="button-m">{r.title}</b>
                    <span className="body-s muted">{r.sub}</span>
                  </span>
                  <span className="label-s accent">Edit ›</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/b/${token}`} className="button button--danger-outline button-m full">Back to the tree</Link>
        </div>
      </div>
    </StepShell>
  );
}
