import { organizer } from "@/lib/player";
import { Postcard } from "./pieces";

/** Broken/old link, or "Not you?" — shows nothing personal. */
export function LinkNotFound({ notYou, backHref }: { notYou?: string; backHref?: string }) {
  return (
    <main className="lost stripes">
      <Postcard className="lost__card">
        <p className="label-s accent">{notYou ? "Not for you" : "Return to sender"}</p>
        <h1 className="display-m">{notYou ? `This link is ${notYou}'s` : "This link doesn't work"}</h1>
        <p className="body-m muted">
          {notYou
            ? `Everyone has their own link. Ask ${organizer.name} to send you yours.`
            : `It may be old or it was reset. Ask ${organizer.name} for your own link.`}
        </p>
        {organizer.messenger && (
          <a href={organizer.messenger} className="button button--primary button-m full" target="_blank" rel="noreferrer">
            Message {organizer.name}
          </a>
        )}
        {backHref && (
          <a href={backHref} className="button button--secondary button-m full">Oops, it&apos;s me — go back</a>
        )}
      </Postcard>
    </main>
  );
}
