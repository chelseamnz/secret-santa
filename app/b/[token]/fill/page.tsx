import { redirect } from "next/navigation";
import { canEdit, getBox, getPlayer, getSettings, getWishes } from "@/lib/player";
import { LinkNotFound } from "../../_ui/LinkNotFound";
import { FillStep } from "./FillStep";

export const dynamic = "force-dynamic";

export default async function FillPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { token } = await params;
  const { tab } = await searchParams;
  const me = await getPlayer(token);
  if (!me) return <LinkNotFound />;
  const [settings, box] = await Promise.all([getSettings(), getBox(me.id)]);
  if (!canEdit(settings)) redirect(`/b/${token}`);
  if (!box) redirect(`/b/${token}/wrap`);
  const wishes = await getWishes(me.id);
  return (
    <FillStep
      token={token}
      name={me.name}
      paper={box.paper}
      bow={box.bow}
      budget={settings.budget_php}
      editing={!!box.posted_at}
      initialTab={tab === "heart" ? "heart" : "store"}
      store={wishes.filter((w) => w.kind === "store")}
      heart={wishes.filter((w) => w.kind === "heart")}
    />
  );
}
