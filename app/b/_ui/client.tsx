"use client";

import { useEffect, useState } from "react";
import { markOpened } from "../[token]/actions";
import { GiftBox } from "./pieces";

/** Marks the link as opened from the browser, so Messenger's link preview doesn't count. */
export function OpenedPing({ token }: { token: string }) {
  useEffect(() => {
    markOpened(token).catch(() => undefined);
  }, [token]);
  return null;
}

/** Removes ?wrapped=1 / ?saved=1 from the address bar so a refresh doesn't replay it. */
export function CleanUrl() {
  useEffect(() => {
    const t = setTimeout(() => window.history.replaceState(null, "", window.location.pathname), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}

// Each beat gets time to land. Total ≈ 9.5s, then a soft fade to the tree.
const SCENES = [
  { caption: "Tucking in your letter…", ms: 2200 },
  { caption: "Sealing it with wax…", ms: 1900 },
  { caption: "Tucked under your ribbon…", ms: 2000 },
  { caption: "Off it goes, under the tree!", ms: 3800 },
];
// Twinkles around the tree once the box lands: [left, top, size, delay(s)].
const SPARKLES: [number, number, number, number][] = [
  [44, 112, 28, 2.0], [200, 80, 32, 2.15], [126, 22, 24, 2.3], [70, 214, 22, 2.4],
  [210, 190, 28, 2.25], [96, 290, 24, 2.1], [178, 280, 26, 2.45], [22, 262, 18, 2.55],
  [146, 146, 20, 2.6], [234, 254, 20, 2.35],
];
const FADE_MS = 700;

/** The wrapping moment after "Wrap it up". Tap anywhere to skip. */
export function WrapMoment({
  name,
  paper,
  bow,
  letter,
}: {
  name: string;
  paper: string;
  bow: string;
  letter: string;
}) {
  const [scene, setScene] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    SCENES.forEach((sc, i) => {
      timers.push(setTimeout(() => setScene(i), at));
      at += sc.ms;
    });
    timers.push(setTimeout(() => setLeaving(true), at));
    timers.push(setTimeout(() => setDone(true), at + FADE_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  function skip() {
    setLeaving(true);
    setTimeout(() => setDone(true), 350);
  }

  if (done) return null;
  return (
    <div className={`moment ${leaving ? "is-leaving" : ""}`} onClick={skip} role="dialog" aria-label="Wrapping your box">
      <p className="moment__caption script-m" key={scene}>{SCENES[scene].caption}</p>
      <div className="moment__stage">
        {scene === 0 && (
          <div className="moment__scene" key="s0">
            <img className="moment__envelope" src="/assets/envelope-green-opened.webp" alt="" />
            <div className="moment__letter letter-m">
              <span>Dear Santa,</span>
              <span className="moment__letter-text">{letter || "Merry Christmas!"}</span>
              <span>Love,</span>
              <span className="moment__letter-sign script-m">{name}</span>
            </div>
            <img className="moment__envelope moment__envelope--front" src="/assets/envelope-green-opened.webp" alt="" />
          </div>
        )}
        {scene === 1 && (
          <div className="moment__scene" key="s1">
            <svg className="moment__hearts" viewBox="0 0 120 100" aria-hidden>
              <path className="h1" d="M28 62c-14-10-20-22-12-30 6-6 13-1 14 6 2-8 10-11 15-5 7 9-4 21-17 29z" />
              <path className="h2" d="M72 30c-10-7-14-16-8-21 4-4 9-1 10 4 1-5 7-8 11-4 5 6-3 15-13 21z" />
              <path className="h3" d="M78 86c-12-8-17-18-10-25 5-5 11-1 12 5 2-7 9-9 13-4 6 7-3 17-15 24z" />
            </svg>
            <img className="moment__opened-out" src="/assets/envelope-green-opened.webp" alt="" />
            <img className="moment__sealed" src="/assets/envelope-green-sealed.webp" alt="" />
          </div>
        )}
        {scene === 2 && (
          <div className="moment__scene moment__scene--box" key="s2">
            <GiftBox paper={paper} bow={bow} tag={name} className="moment__box sticker" />
            <img className="moment__tucked" src="/assets/envelope-green-sealed.webp" alt="" />
          </div>
        )}
        {scene === 3 && (
          <div className="moment__scene moment__scene--tree" key="s3">
            <img className="moment__tree sticker" src="/assets/tree.webp" alt="" />
            <GiftBox paper={paper} bow={bow} className="moment__drop sticker" />
            {SPARKLES.map(([x, y, size, delay], i) => (
              <svg key={i} className="sparkle" viewBox="0 0 24 24" aria-hidden
                style={{ left: x, top: y, width: size, height: size, animationDelay: `${delay}s` }}>
                <path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" />
              </svg>
            ))}
          </div>
        )}
      </div>
      <p className="moment__skip label-s">Tap to skip</p>
    </div>
  );
}
