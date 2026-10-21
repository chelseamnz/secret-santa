"use client";

// The sealed red envelope and the reveal:
//   1. a gold letter opener slips under the flap and slices along it
//   2. the envelope opens
//   3. the card rises out of the pocket with your giftee's name
// Each beat fades out before the next. Tap to skip ahead.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { openEnvelope } from "../[token]/actions";

type Stage = "sealed" | "slice" | "open" | "card";
const SLICE_MS = 4600;
const OPEN_MS = 2400; // the open envelope with the card waiting inside
const EXIT_MS = 800;
const LEAVE_MS = 650;

const SPARKS: [number, number, number, number][] = [
  [6, 40, 22, 2.0], [262, 26, 26, 2.15], [30, 150, 16, 2.3], [252, 140, 18, 2.2],
  [140, 4, 18, 2.4], [96, 190, 14, 2.5], [200, 196, 14, 2.35],
];

/** Sealed envelope photo from the opener frames; the opener and flap layer on top. */
function OpenerStage({ slicing }: { slicing: boolean }) {
  return (
    <div className={`opener-stage ${slicing ? "is-slicing" : ""}`} aria-hidden>
      <img className="opener-stage__env" src="/assets/envelope-red-opener-stage.webp" alt="" />
      {slicing && <img className="opener-stage__tool" src="/assets/letter-opener.webp" alt="" />}
      {slicing && <img className="opener-stage__env opener-stage__flap" src="/assets/envelope-red-opener-stage.webp" alt="" />}
    </div>
  );
}

export function RevealEnvelope({
  token, me, giftee, preview,
}: { token: string; me: string; giftee: string; preview: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("sealed");
  const [exiting, setExiting] = useState(false);
  const [captionOut, setCaptionOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const href = `/b/${token}/giftee${preview ? "?preview=1" : ""}`;

  useEffect(() => {
    router.prefetch(href);
    return () => timers.current.forEach(clearTimeout);
  }, [router, href]);

  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  function start() {
    if (stage !== "sealed") return;
    if (!preview) openEnvelope(token).catch(() => undefined);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("card");
      return;
    }
    setStage("slice");
    at(SLICE_MS - EXIT_MS, () => setExiting(true));
    at(SLICE_MS, () => { setExiting(false); setStage("open"); });
    // no fade between "open" and "card": the card simply rises out of the envelope
    at(SLICE_MS + OPEN_MS - EXIT_MS, () => setCaptionOut(true));
    at(SLICE_MS + OPEN_MS, () => setStage("card"));
  }

  function skip() {
    if (stage === "slice" || stage === "open") {
      timers.current.forEach(clearTimeout);
      setExiting(false);
      setCaptionOut(true);
      setStage("card");
    }
  }

  function seeBox(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLeaving(true);
    setTimeout(() => router.push(href), LEAVE_MS);
  }

  const caption = stage === "slice" ? "Slicing it open…" : stage === "open" ? "Opening…" : null;
  const nameSize = giftee.length > 16 ? "is-long" : giftee.length > 11 ? "is-mid" : "";

  return (
    <main className={`reveal ${exiting ? "is-exiting" : ""} ${captionOut ? "is-caption-out" : ""} ${leaving ? "is-leaving" : ""}`} onClick={skip}>
      <div className="reveal__band stripes" aria-hidden />
      <section className="reveal__body">
        {stage === "sealed" && (
          <div className="reveal__head">
            <p className="label-m accent">The draw is done</p>
            <h1 className="reveal__title">A letter for you, {me}.</h1>
          </div>
        )}
        {caption && <p className="reveal__caption script-m" key={stage}>{caption}</p>}

        <div className={`reveal__stage is-${stage}`} key={stage === "sealed" || stage === "slice" ? "stage-sealed" : "stage-open"}>
          {(stage === "sealed" || stage === "slice") && (
            <button type="button" className="reveal__sealed" onClick={start} aria-label="Break the seal" disabled={stage !== "sealed"}>
              <OpenerStage slicing={stage === "slice"} />
            </button>
          )}

          {(stage === "open" || stage === "card") && (
            <div className="reveal__opened">
              <img className="reveal__env" src="/assets/envelope-red-opened.webp" alt="" />
              {(stage === "open" || stage === "card") && (
                <div className={`reveal-card-wrap ${stage === "card" ? "is-out" : ""}`}>
                  <div className="reveal-card">
                    <span className="reveal-card__bells" aria-hidden />
                    <span className="label-m accent">You&apos;re Santa for</span>
                    <span className={`reveal-card__name ${nameSize}`}>{giftee}</span>
                  </div>
                </div>
              )}
              <img className="reveal__env reveal__env--front" src="/assets/envelope-red-opened.webp" alt="" />
              {stage === "card" &&
                SPARKS.map(([x, y, s, d], i) => (
                  <svg key={i} className="sparkle" viewBox="0 0 24 24" aria-hidden
                    style={{ left: x, top: y, width: s, height: s, animationDelay: `${d}s` }}>
                    <path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" />
                  </svg>
                ))}
            </div>
          )}
        </div>

        {stage === "sealed" && (
          <div className="reveal__actions">
            <p className="label-s muted">Tap the seal to open</p>
            <button type="button" className="button button--primary button-m" onClick={start}>Break the seal</button>
          </div>
        )}
        {stage === "card" && (
          <div className="reveal__actions reveal__actions--late">
            <a href={href} onClick={seeBox} className="button button--primary button-m">See {giftee}&apos;s box</a>
          </div>
        )}
        {(stage === "slice" || stage === "open") && <p className="reveal__skip label-s muted">Tap to skip</p>}
      </section>
      <div className="reveal__band stripes" aria-hidden />
    </main>
  );
}
