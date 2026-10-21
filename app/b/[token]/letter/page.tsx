import { redirect } from "next/navigation";
import { canEdit, getBox, getPlayer, getSettings } from "@/lib/player";
import { LinkNotFound } from "../../_ui/LinkNotFound";
import { LetterStep } from "./LetterStep";

export const dynamic = "force-dynamic";

export default async function LetterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;
  const [settings, box] = await Promise.all([getSettings(), getBox(me.id)]);
  if (!canEdit(settings)) redirect(`/b/${token}`);
  if (!box) redirect(`/b/${token}/wrap`);
  return (
    <LetterStep
      token={token}
      name={me.name}
      paper={box.paper}
      bow={box.bow}
      letter={box.letter ?? ""}
      editing={!!box.posted_at}
    />
  );
}
