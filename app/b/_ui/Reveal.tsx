"use client";

// The sealed red envelope and the reveal: seal cracks → flap opens → the card
// slides up out of the pocket with your giftee's name. Tap to skip ahead.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { openEnvelope } from "../[token]/actions";

type Stage = "sealed" | "crack" | "open" | "card";
const CRACK_MS = 1400;
const OPEN_MS = 1300;

const SPARKS: [number, number, number, number][] = [
  [6, 40, 22, 1.8], [262, 26, 26, 1.95], [30, 150, 16, 2.1], [252, 140, 18, 2.0],
  [140, 6, 18, 2.2], [96, 190, 14, 2.3], [200, 196, 14, 2.15],
];

export function RevealEnvelope({
  token, me, giftee, preview,
}: { token: string; me: string; giftee: string; preview: boolean }) {
  const [stage, setStage] = useState<Stage>("sealed");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const q = preview ? "?preview=1" : "";

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function start() {
    if (stage !== "sealed") return;
    if (!preview) openEnvelope(token).catch(() => undefined);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("card");
      return;
    }
    setStage("crack");
    timers.current.push(setTimeout(() => setStage("open"), CRACK_MS));
    timers.current.push(setTimeout(() => setStage("card"), CRACK_MS + OPEN_MS));
  }

  function skip() {
    if (stage === "crack" || stage === "open") {
      timers.current.forEach(clearTimeout);
      setStage("card");
    }
  }

  const caption =
    stage === "sealed" ? null : stage === "crack" ? "The seal cracks…" : stage === "open" ? "Opening…" : null;

  return (
    <main className="reveal" onClick={skip}>
      <div className="reveal__band stripes" aria-hidden />
      <section className="reveal__body">
        {stage === "sealed" && (
          <div className="reveal__head">
            <p className="label-m accent">The draw is done</p>
            <h1 className="reveal__title">A letter for you, {me}.</h1>
          </div>
        )}
        {caption && <p className="reveal__caption script-m" key={stage}>{caption}</p>}

        <div className={`reveal__stage is-${stage}`}>
          {(stage === "sealed" || stage === "crack") && (
            <button type="button" className="reveal__sealed" onClick={start} aria-label="Break the seal" disabled={stage !== "sealed"}>
              <img src="/assets/envelope-red-sealed.webp" alt="" />
              {stage === "crack" && (
                <span className="reveal__crack" aria-hidden>
                  {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 45 + 20}deg) translateY(-40px)` }} />)}
                </span>
              )}
            </button>
          )}

          {(stage === "open" || stage === "card") && (
            <div className="reveal__opened">
              <img className="reveal__env" src="/assets/envelope-red-opened.webp" alt="" />
              <div className={`reveal-card-wrap ${stage === "card" ? "is-out" : ""}`}>
                <div className="reveal-card">
                  <span className="reveal-card__bells" aria-hidden />
                  <span className="label-m accent">You&apos;re Santa for</span>
                  <span className="reveal-card__name">{giftee}</span>
                </div>
              </div>
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
            <Link href={`/b/${token}/giftee${q}`} className="button button--primary button-m">See {giftee}&apos;s box</Link>
          </div>
        )}
        {(stage === "crack" || stage === "open") && <p className="reveal__skip label-s muted">Tap to skip</p>}
      </section>
      <div className="reveal__band stripes" aria-hidden />
    </main>
  );
}
