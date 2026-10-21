import { redirect } from "next/navigation";
import { defaultLook } from "@/lib/catalog";
import { canEdit, getBox, getPlayer, getSettings, getTree } from "@/lib/player";
import { LinkNotFound } from "../../_ui/LinkNotFound";
import { WrapStep } from "./WrapStep";

export const dynamic = "force-dynamic";

export default async function WrapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;
  const [settings, box, tree] = await Promise.all([getSettings(), getBox(me.id), getTree()]);
  if (!canEdit(settings)) redirect(`/b/${token}`);
  const look = box ?? defaultLook(Math.max(0, tree.findIndex((t) => t.id === me.id)));
  return (
    <WrapStep
      token={token}
      name={me.name}
      paper={look.paper}
      bow={look.bow}
      editing={!!box?.posted_at}
    />
  );
}
