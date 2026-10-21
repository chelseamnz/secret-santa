"use client";

import { useEffect, useState } from "react";
import { markOpened } from "../[token]/actions";
import { GiftBox, SealedEnvelope } from "./pieces";

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

// Each beat gets time to land. Total ≈ 18s, then a slow fade to the tree.
const SCENES = [
  { caption: "Tucking in your letter…", ms: 4000 },
  { caption: "Sealing it with wax…", ms: 4000 },
  { caption: "Tucked under your ribbon…", ms: 4000 },
  { caption: "Off it goes, under the tree!", ms: 7400 },
];
// Twinkles around the tree once the box lands: [left, top, size, delay(s)].
const SPARKLES: [number, number, number, number][] = [
  [44, 112, 28, 4.0], [200, 80, 32, 4.2], [126, 22, 24, 4.4], [70, 214, 22, 4.55],
  [210, 190, 28, 4.3], [96, 290, 24, 4.1], [178, 280, 26, 4.6], [22, 262, 18, 4.7],
  [146, 146, 20, 4.8], [234, 254, 20, 4.45],
];
const FADE_MS = 1000;

// Fairy lights around the sealed envelope: an oval of small warm lights that
// blink on one by one. [left, top, delay(s)] in the 280×340 scene.
const FAIRY_LIGHTS: [number, number, number][] = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + 0.15;
  const wobble = i % 2 ? 7 : -5;
  return [
    Math.round(140 + Math.cos(a) * (142 + wobble)) - 4,
    Math.round(170 + Math.sin(a) * (96 + wobble)) - 4,
    +(2.35 + ((i * 7) % 18) * 0.07).toFixed(2),
  ];
});

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
    setTimeout(() => setDone(true), 600);
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
          <div className="moment__scene moment__scene--seal" key="s1">
            <span className="moment__warm" aria-hidden />
            {FAIRY_LIGHTS.map(([x, y, d], i) => (
              <span key={i} className="fairy" aria-hidden style={{ left: x, top: y, animationDelay: `${d}s, ${d + 0.9}s` }} />
            ))}
            <SealedEnvelope color="green" stamp="press" className="moment__sealed" />
          </div>
        )}
        {scene === 2 && (
          <div className="moment__scene moment__scene--box" key="s2">
            <GiftBox paper={paper} bow={bow} tag={name} className="moment__box sticker" />
            <SealedEnvelope color="green" className="moment__tucked" />
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
