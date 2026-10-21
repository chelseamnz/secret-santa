"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { HEART_IDEAS, capitalize, formatPeso, numberWord } from "@/lib/catalog";
import type { Wish } from "@/lib/player";
import { addHeartIdea, deleteWish, toggleHeart } from "../actions";
import { StepHead, StepShell } from "../../_ui/pieces";
import { WishSheet } from "./WishSheet";

type Tab = "store" | "heart";

export function FillStep({
  token, name, paper, bow, budget, editing, initialTab, store, heart,
}: {
  token: string; name: string; paper: string; bow: string; budget: number; editing: boolean;
  initialTab: Tab; store: Wish[]; heart: Wish[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sheet, setSheet] = useState<{ wish: Wish | null; n: number } | null>(null);
  // Heart picks: the checkmarks are the source of truth on this page and update
  // instantly; saves run one after another so quick taps never get lost.
  const [keys, setKeys] = useState(() => new Set(heart.filter((w) => w.heart_key).map((w) => w.heart_key!)));
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [error, setError] = useState<string | null>(null);
  const custom = heart.filter((w) => !w.heart_key && !removed.has(w.id));
  const heartCount = keys.size + custom.length;

  function save(run: () => Promise<{ ok: boolean; error?: string }>, undo: () => void) {
    setError(null);
    queue.current = queue.current.then(async () => {
      const res = await run().catch(() => ({ ok: false, error: "Couldn't save that. Check your connection." }));
      if (!res.ok) { undo(); setError(res.error ?? "Couldn't save that."); }
    });
  }
  function flipKey(key: string, on: boolean) {
    const set = (v: boolean) => setKeys((cur) => { const n = new Set(cur); if (v) n.add(key); else n.delete(key); return n; });
    set(on);
    save(() => toggleHeart(token, key, on), () => set(!on));
  }
  function removeCustom(id: string) {
    setRemoved((cur) => new Set(cur).add(id));
    save(() => deleteWish(token, id), () => setRemoved((cur) => { const n = new Set(cur); n.delete(id); return n; }));
  }

  const total = store.length + heartCount;
  const caption = total === 0 ? "An empty box, ready to fill." : `${capitalize(numberWord(total))} ${total === 1 ? "wish" : "wishes"} packed inside.`;

  return (
    <StepShell name={name} paper={paper} bow={bow} caption={caption}>
      <div className="pc-shadow">
        <div className="postcard pc step-form">
          <StepHead
            kicker={`${editing ? "Edit your wishes" : "Step 2 of 3"}  ·  ${formatPeso(budget)} budget`}
            title="Fill your box"
          />

          <div className="tabs" role="tablist">
            {(["store", "heart"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`tabs__tab ${tab === t ? "is-active" : ""}`}
                onClick={() => setTab(t)}
              >
                <span className="button-m">{t === "store" ? "From the store" : "From the heart"}</span>
                <span className="body-s">{t === "store" ? store.length : heartCount}</span>
              </button>
            ))}
          </div>

          {tab === "store" ? (
            store.length === 0 ? (
              <div className="empty-box">
                <h2 className="display-m">Nothing in here yet</h2>
                <p className="body-m muted">
                  What would you love this year? Add as many wishes as you like — your Santa will pick from them.
                </p>
                <button type="button" className="button button--primary button-m" onClick={() => setSheet({ wish: null, n: Date.now() })}>
                  + Add your first wish
                </button>
              </div>
            ) : (
              <div className="wish-list">
                {store.map((w) => {
                  const over = w.price_php != null && w.price_php > budget;
                  return (
                    <button key={w.id} type="button" className="wish-row" onClick={() => setSheet({ wish: w, n: Date.now() })}>
                      <span className="wish-row__photo">{w.photo_url && <img src={w.photo_url} alt="" />}</span>
                      <span className="wish-row__text">
                        <span className="button-m">{w.title}</span>
                        <span className="body-s muted">
                          {w.price_php != null ? formatPeso(w.price_php) : "No price"}
                          {over && <span className="over-tag label-s">Over budget</span>}
                        </span>
                      </span>
                      <span className="wish-row__chev" aria-hidden>›</span>
                    </button>
                  );
                })}
                <button type="button" className="add-wish button-m" onClick={() => setSheet({ wish: null, n: Date.now() })}>
                  + Add a wish
                </button>
              </div>
            )
          ) : (
            <HeartList keys={keys} custom={custom} onFlip={flipKey} onRemove={removeCustom} token={token} onError={setError} />
          )}

          {error && <p className="form-error body-s" role="alert">{error}</p>}

          <div className="step-actions">
            <Link href={editing ? `/b/${token}/edit` : `/b/${token}/wrap`} className="button button--danger-outline button-m">Back</Link>
            {total === 0 ? (
              <button type="button" className="button button-m grow" disabled>Next: write your letter</button>
            ) : (
              <Link href={editing ? `/b/${token}?saved=1` : `/b/${token}/letter`} className="button button--primary button-m grow">
                {editing ? "Save changes" : "Next: write your letter"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {sheet && (
        <WishSheet
          key={sheet.n}
          token={token}
          wish={sheet.wish}
          budget={budget}
          onClose={() => setSheet(null)}
        />
      )}
    </StepShell>
  );
}

function HeartList({
  keys, custom, onFlip, onRemove, token, onError,
}: {
  keys: Set<string>;
  custom: Wish[];
  onFlip: (key: string, on: boolean) => void;
  onRemove: (id: string) => void;
  token: string;
  onError: (e: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function add() {
    const title = input.current?.value ?? "";
    startTransition(async () => {
      const res = await addHeartIdea(token, title);
      if (res.ok) {
        setAdding(false);
        onError(null);
      } else onError(res.error ?? "Couldn't add it.");
    });
  }

  return (
    <div className="hearts">
      <p className="body-s muted">No-cost ideas anyone can give. Check the ones you&apos;d love.</p>
      <ul className="hearts__list">
        {HEART_IDEAS.map((h) => {
          const on = keys.has(h.slug);
          return (
            <li key={h.slug}>
              <label className="heart-opt">
                <input type="checkbox" checked={on} onChange={(e) => onFlip(h.slug, e.target.checked)} />
                <span className="heart-opt__box" aria-hidden />
                <span className="heart-opt__icon" style={{ backgroundImage: `url(/assets/heart-${h.slug}.webp)` }} aria-hidden />
                <span className="button-m">{h.label}</span>
              </label>
            </li>
          );
        })}
        {custom.map((w) => (
          <li key={w.id}>
            <label className="heart-opt">
              <input type="checkbox" checked onChange={() => onRemove(w.id)} />
              <span className="heart-opt__box" aria-hidden />
              <span className="heart-opt__icon heart-opt__icon--own" aria-hidden>♥</span>
              <span className="button-m">{w.title}</span>
            </label>
          </li>
        ))}
        <li>
          {adding ? (
            <div className="heart-add">
              <input ref={input} className="input body-m" placeholder="Your idea, like “Help me paint my room”" maxLength={120} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
              <button type="button" className="button button--primary button-m" onClick={add} disabled={pending}>{pending ? "Adding…" : "Add"}</button>
            </div>
          ) : (
            <button type="button" className="heart-opt heart-opt--add" onClick={() => setAdding(true)}>
              <span className="heart-opt__box heart-opt__box--spacer" aria-hidden />
              <span className="heart-opt__icon heart-opt__icon--plus" aria-hidden>+</span>
              <span className="button-m accent">Your own idea</span>
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}
