"use client";

// Read-only view of someone's box: their letter (or a greeting), store wishes
// with a detail sheet, and from-the-heart ideas.
import { useEffect, useRef, useState } from "react";
import { HEART_IDEAS, formatPeso } from "@/lib/catalog";
import type { Wish } from "@/lib/player";

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** What a Santa sees when the letter was skipped. Nothing is written for them. */
export function Greeting({ name }: { name: string }) {
  return (
    <div className="greeting">
      <span className="greeting__tree" aria-hidden />
      <p className="letter-m greeting__merry">Merry Christmas!</p>
      <p className="letter-m">Love,</p>
      <p className="script-m accent greeting__sign">{name}</p>
    </div>
  );
}

export function LetterRead({ name, letter }: { name: string; letter: string }) {
  return (
    <div className="letter-paper letter-paper--read">
      <p className="letter-m letter-paper__greet">Dear Santa,</p>
      <div className="letter-m letter-paper__body">{letter}</div>
      <p className="letter-m letter-paper__love">Love,</p>
      <p className="script-m accent letter-paper__sign">{name}</p>
    </div>
  );
}

export function GifteeWishes({ name, store, heart }: { name: string; store: Wish[]; heart: Wish[] }) {
  const [open, setOpen] = useState<Wish | null>(null);
  return (
    <div className="giftee-lists">
      {store.length > 0 && (
        <section className="giftee-section">
          <h3 className="label-s muted">From the store</h3>
          <div className="wish-list">
            {store.map((w) => (
              <button key={w.id} type="button" className="wish-row" onClick={() => setOpen(w)}>
                <span className="wish-row__photo">{w.photo_url && <img src={w.photo_url} alt="" />}</span>
                <span className="wish-row__text">
                  <span className="button-m">{w.title}</span>
                  <span className="body-s muted">{w.price_php != null ? formatPeso(w.price_php) : domainOf(w.url) ?? "Tap for details"}</span>
                </span>
                <span className="wish-row__chev" aria-hidden>›</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {heart.length > 0 && (
        <section className="giftee-section">
          <h3 className="label-s muted">From the heart</h3>
          <ul className="hearts__list hearts__list--read">
            {heart.map((w) => (
              <li key={w.id} className="heart-opt heart-opt--read">
                {w.heart_key && HEART_IDEAS.some((h) => h.slug === w.heart_key) ? (
                  <span className="heart-opt__icon" style={{ backgroundImage: `url(/assets/heart-${w.heart_key}.webp)` }} aria-hidden />
                ) : (
                  <span className="heart-opt__icon heart-opt__icon--own" aria-hidden>♥</span>
                )}
                <span className="button-m">{w.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {open && <WishDetail name={name} wish={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function WishDetail({ name, wish, onClose }: { name: string; wish: Wish; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const domain = domainOf(wish.url);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="sheet__inner">
        <span className="sheet__handle" aria-hidden />
        <div className="sheet__head">
          <p className="label-s accent">From {name}&apos;s box</p>
          <button type="button" className="close-btn" aria-label="Close" onClick={() => ref.current?.close()}>✕</button>
        </div>
        <div className="detail">
          {wish.photo_url && <img className="detail__photo" src={wish.photo_url} alt={wish.title} />}
          <div className="detail__text">
            <h2 className="display-m">{wish.title}</h2>
            {(wish.price_php != null || domain) && (
              <p className="detail__meta">
                {wish.price_php != null && <b className="button-m">{formatPeso(wish.price_php)}</b>}
                {domain && <span className="detail__chip label-s">{domain}</span>}
              </p>
            )}
            {wish.note && (
              <div className="detail__note">
                <p className="label-s muted">{name}&apos;s note</p>
                <p className="letter-m">{wish.note}</p>
              </div>
            )}
            {wish.url && (
              <>
                <a href={wish.url} target="_blank" rel="noopener noreferrer" className="button button--primary button-m full">Open link ↗</a>
                <p className="body-s muted">Opens the store in a new tab.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
