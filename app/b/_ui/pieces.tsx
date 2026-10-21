// Shared, stateless building blocks for the player pages.
import type { CSSProperties, ReactNode } from "react";

const asset = (name: string) => `/assets/${name}.webp`;

/** One gift box: paper + bow layered at Figma's positions (200×255 frame). */
export function GiftBox({
  paper,
  bow,
  tag,
  className = "",
  style,
}: {
  paper: string;
  bow: string;
  tag?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`giftbox ${className}`} style={style} aria-hidden>
      <img className="giftbox__box" src={asset(`box-${paper}`)} alt="" draggable={false} />
      <img className="giftbox__bow" src={asset(`bow-${bow}`)} alt="" draggable={false} />
      {tag && (
        <span className="giftbox__tag">
          <span className="tag tag--posted">
            <span className="tag__name">{tag}</span>
          </span>
        </span>
      )}
    </span>
  );
}

/** Sealed envelope with the wax seal on top. "press" stamps it in (wrapping moment). */
export function SealedEnvelope({
  color,
  stamp = "static",
  className = "",
}: {
  color: "red" | "green";
  stamp?: "static" | "press";
  className?: string;
}) {
  return (
    <span className={`sealed-env ${stamp === "press" ? "is-pressing" : ""} ${className}`} aria-hidden>
      <img className="sealed-env__paper" src={asset(`envelope-${color}-sealed`)} alt="" draggable={false} />
      <img className={`sealed-env__seal ${stamp === "press" ? "is-press" : ""}`} src={asset("wax-seal")} alt="" draggable={false} />
    </span>
  );
}

/** Notched gift tag. Posted = wine name; waiting = muted, dashed, "Still wrapping". */
export function NameTag({
  name,
  state,
  sub,
}: {
  name: string;
  state: "posted" | "waiting" | "revealed";
  sub?: string;
}) {
  return (
    <span className="tag-shadow">
      <span className={`tag tag--${state}`}>
        <span className="tag__name">{name}</span>
        {sub && <span className="tag__sub">{sub}</span>}
      </span>
    </span>
  );
}

/** The "2026 · Secret Santa" postcard label with the gold star sticker. */
export function TitleLabel({ line }: { line: string }) {
  return (
    <div className="title-shadow">
      <span className="pl-title__star" aria-hidden />
      <div className="postcard pl-title">
        <span className="pl-title__year">2026</span>
        <span className="pl-title__year pl-title__year--right">2026</span>
        <h1 className="pl-title__name">
          <span className="pl-title__secret">Secret</span>
          <span className="pl-title__santa">Santa</span>
        </h1>
        <p className="pl-title__line">{line}</p>
      </div>
    </div>
  );
}

/** Card with notched corners and the inner rule, plus a real paper shadow. */
export function Postcard({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "form" }) {
  return (
    <div className={`pc-shadow ${className}`}>
      <Tag className="postcard pc">{children}</Tag>
    </div>
  );
}

/**
 * Layout for Steps 1–3 and the edit hub: tree branches with the live box on
 * top, a script caption, then the striped band with the step's postcard.
 */
export function StepShell({
  name,
  paper,
  bow,
  caption,
  wide,
  enter,
  children,
}: {
  name: string;
  paper: string;
  bow: string;
  caption: string;
  wide?: boolean;
  /** Fade the page in (used after the reveal). */
  enter?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={`step ${enter ? "step--enter" : ""}`}>
      <header className="step__top">
        <img className="step__tree" src={asset("tree")} alt="" aria-hidden />
        <GiftBox paper={paper} bow={bow} tag={name} className="step__box sticker" />
        <p className="step__caption script-m" aria-live="polite">{caption}</p>
      </header>
      <section className="step__band stripes">
        <div className={`step__card ${wide ? "step__card--wide" : ""}`}>{children}</div>
      </section>
    </main>
  );
}

/** "STEP 1 OF 3 · ₱1,000 BUDGET" + title */
export function StepHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="step-head">
      <p className="label-s accent">{kicker}</p>
      <h1 className="display-m">{title}</h1>
    </div>
  );
}
