import { getPlayer } from "@/lib/player";
import { LinkNotFound } from "../../_ui/LinkNotFound";

export const dynamic = "force-dynamic";

export default async function NotYou({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getPlayer(token);
  if (!p) return <LinkNotFound />;
  return <LinkNotFound notYou={p.name} backHref={`/b/${token}`} />;
}
