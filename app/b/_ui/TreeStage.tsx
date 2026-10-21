"use client";

// The tree with one spot per person. Posted boxes show their paper + bow;
// everyone else is a dashed "?" spot. Tap a spot to see whose it is.
import { useEffect, useState, type CSSProperties } from "react";
import { GiftBox, NameTag } from "./pieces";

export type Spot = {
  id: string;
  name: string;
  posted: boolean;
  paper: string | null;
  bow: string | null;
};

// Spot positions from Figma (Tree / In progress), in design pixels.
// Mobile stage 390×456, box 60×76. Desktop stage 660×710, box 64×81.
const M = { w: 390, h: 456, bw: 60, bh: 76, tree: [88, 4, 214, 314] };
const D = { w: 660, h: 710, bw: 64, bh: 81, tree: [120, 0, 420, 616] };
const M_SPOTS = [
  [22, 224], [100, 216], [232, 224], [308, 228], [6, 294], [82, 302], [164, 288],
  [246, 300], [322, 294], [40, 368], [122, 380], [206, 364], [288, 374],
];
const D_SPOTS = [
  [68, 534], [160, 542], [252, 534], [344, 542], [436, 534], [528, 540], [22, 612],
  [114, 622], [206, 614], [298, 622], [390, 614], [482, 622], [574, 614],
];

// More than 13 people: add extra spots in a row below (rare).
function spotAt(list: number[][], i: number, layout: typeof M): number[] {
  if (i < list.length) return list[i];
  const extra = i - list.length;
  return [(extra % 6) * (layout.bw + 8) + 8, layout.h - layout.bh + Math.floor(extra / 6) * 8];
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const TAG_HALF = 74; // half a name tag's width, in design px, to keep it on screen

export function TreeStage({
  spots,
  meId,
  initialTag = null,
  caption,
}: {
  spots: Spot[];
  meId: string;
  initialTag?: string | null;
  caption?: string;
}) {
  const [open, setOpen] = useState<string | null>(initialTag);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest?.(".spot")) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const [mt, dt] = [M.tree, D.tree];
  const treeStyle = {
    "--m-l": pct(mt[0], M.w), "--m-t": pct(mt[1], M.h), "--m-w": pct(mt[2], M.w),
    "--d-l": pct(dt[0], D.w), "--d-t": pct(dt[1], D.h), "--d-w": pct(dt[2], D.w),
  } as CSSProperties;

  const openSpot = spots.find((s) => s.id === open);
  const openIndex = spots.findIndex((s) => s.id === open);

  return (
    <div className="tree-wrap">
      <div className="stage">
        <img className="stage__tree sticker" src="/assets/tree.webp" alt="" style={treeStyle} />
        {spots.map((s, i) => {
          const [mx, my] = spotAt(M_SPOTS, i, M);
          const [dx, dy] = spotAt(D_SPOTS, i, D);
          const style = {
            "--m-l": pct(mx, M.w), "--m-t": pct(my, M.h),
            "--d-l": pct(dx, D.w), "--d-t": pct(dy, D.h),
            "--m-z": my, "--d-z": dy,
          } as CSSProperties;
          const me = s.id === meId;
          const label = s.posted ? `${s.name}'s box${me ? " (yours)" : ""}` : `${s.name}'s spot, still wrapping`;
          return (
            <button
              key={s.id}
              type="button"
              className={`spot ${s.posted ? "spot--box" : "spot--empty"} ${open === s.id ? "is-open" : ""}`}
              style={style}
              aria-label={label}
              aria-expanded={open === s.id}
              onClick={() => setOpen((o) => (o === s.id ? null : s.id))}
            >
              {s.posted && s.paper && s.bow ? (
                <GiftBox paper={s.paper} bow={s.bow} className="sticker" />
              ) : (
                <span className="spot__empty" aria-hidden>?</span>
              )}
              {me && <span className="you label-s" aria-hidden>You</span>}
            </button>
          );
        })}

        {openSpot && (() => {
          const [mx, my] = spotAt(M_SPOTS, openIndex, M);
          const [dx, dy] = spotAt(D_SPOTS, openIndex, D);
          const clamp = (x: number, w: number) => Math.min(Math.max(x, TAG_HALF), w - TAG_HALF);
          const style = {
            "--m-l": pct(clamp(mx + M.bw / 2, M.w), M.w), "--m-t": pct(my + 10, M.h),
            "--d-l": pct(clamp(dx + D.bw / 2, D.w), D.w), "--d-t": pct(dy + 10, D.h),
          } as CSSProperties;
          return (
            <span className="stage__tag" style={style} role="status">
              <NameTag
                name={openSpot.name}
                state={openSpot.posted ? "posted" : "waiting"}
                sub={openSpot.posted ? undefined : "Still wrapping"}
              />
            </span>
          );
        })()}
      </div>
      {caption && <p className="stage__caption script-m">{caption}</p>}
    </div>
  );
}
