"use client";

// Add / edit a store wish. Bottom sheet on phones, centered postcard on desktop.
import { useActionState, useEffect, useRef, useState } from "react";
import { formatPeso } from "@/lib/catalog";
import type { Wish } from "@/lib/player";
import { deleteWish, saveWish, type ActionResult } from "../actions";

/** Shrinks a photo in the browser so uploads stay small and fast. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file; // the browser couldn't read it; send as-is (the server checks size)
  }
}

function Confirm({
  open, title, body, keep, go, onKeep, onGo,
}: { open: boolean; title: string; body: string; keep: string; go: string; onKeep: () => void; onGo: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog ref={ref} className="confirm" onCancel={(e) => { e.preventDefault(); onKeep(); }}>
      <div className="confirm__inner">
        <h3 className="display-m">{title}</h3>
        <p className="body-m muted">{body}</p>
        <div className="confirm__actions">
          <button type="button" className="button button--secondary button-m" onClick={onKeep} autoFocus>{keep}</button>
          <button type="button" className="button button--destructive button-m" onClick={onGo}>{go}</button>
        </div>
      </div>
    </dialog>
  );
}

export function WishSheet({
  token, wish, budget, onClose,
}: { token: string; wish: Wish | null; budget: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveWish.bind(null, token), { ok: false });
  const [dirty, setDirty] = useState(false);
  const [price, setPrice] = useState(wish?.price_php != null ? String(wish.price_php) : "");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [ask, setAsk] = useState<"close" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const tryClose = () => (dirty ? setAsk("close") : onClose());
  const priceNum = Number(price.replace(/[^\d]/g, ""));
  const over = price !== "" && priceNum > budget;
  const shownPhoto = photo?.url ?? (removePhoto ? null : wish?.photo_url ?? null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const blob = await shrink(f);
    setPhoto({ blob, url: URL.createObjectURL(blob) });
    setRemovePhoto(false);
    setDirty(true);
  }

  async function remove() {
    if (!wish) return;
    setDeleting(true);
    const res = await deleteWish(token, wish.id);
    setDeleting(false);
    if (res.ok) onClose();
    else { setAsk(null); setDelError(res.error ?? "Couldn't remove it."); }
  }

  return (
    <dialog ref={ref} className="sheet" onCancel={(e) => { e.preventDefault(); tryClose(); }}
      onClick={(e) => { if (e.target === ref.current) tryClose(); }}>
      <form
        className="sheet__inner"
        onInput={() => setDirty(true)}
        action={(fd) => {
          fd.delete("photo");
          if (photo) fd.set("photo", photo.blob, "photo.jpg");
          if (removePhoto) fd.set("removePhoto", "1");
          formAction(fd);
        }}
      >
        <span className="sheet__handle" aria-hidden />
        <div className="sheet__head">
          <h2 className="display-m">{wish ? "Edit wish" : "Add a wish"}</h2>
          <button type="button" className="close-btn" aria-label="Close" onClick={tryClose}>✕</button>
        </div>
        {wish && <input type="hidden" name="id" value={wish.id} />}

        <div className="photo-row">
          <button type="button" className={`photo-pick ${shownPhoto ? "has-photo" : ""}`} onClick={() => fileRef.current?.click()}>
            {shownPhoto ? <img src={shownPhoto} alt="Wish photo" /> : (
              <span className="photo-pick__empty"><span className="accent">+</span><span className="label-s accent">Add photo</span></span>
            )}
          </button>
          <div className="photo-row__help">
            <p className="body-s muted">
              {shownPhoto ? "Tap the photo to change it." : "A photo helps your Santa find the right one. Optional."}
            </p>
            {shownPhoto && (
              <button type="button" className="link-quiet label-s muted" onClick={() => { setPhoto(null); setRemovePhoto(true); setDirty(true); }}>
                Remove photo
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        </div>

        <label className="field">
          <span className="button-m">Item name</span>
          <input name="title" required maxLength={120} defaultValue={wish?.title ?? ""} placeholder="What would you love?" className="input body-m" />
        </label>

        <div className="field-row">
          <label className="field grow">
            <span className="button-m">Link <span className="label-s muted">Optional</span></span>
            <input name="url" inputMode="url" defaultValue={wish?.url ?? ""} placeholder="Paste a link from any store" className="input body-m" />
          </label>
          <label className="field field--price">
            <span className="button-m">Price <span className="label-s muted">Optional</span></span>
            <span className="peso">
              <span aria-hidden>₱</span>
              <input name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0" className="input body-m" />
            </span>
          </label>
        </div>
        {over && (
          <p className="body-s accent">
            Over the {formatPeso(budget)} budget — that&apos;s okay, your Santa may find something similar.
          </p>
        )}

        <label className="field">
          <span className="button-m">Note for your Santa <span className="label-s muted">Optional</span></span>
          <textarea name="note" maxLength={500} rows={3} defaultValue={wish?.note ?? ""} placeholder="Size, color, or anything that helps" className="input letter-m" />
        </label>

        {(state.error || delError) && <p className="form-error body-s" role="alert">{state.error || delError}</p>}

        <div className="sheet__actions">
          {wish && (
            <button type="button" className="link-action button-m accent" onClick={() => setAsk("delete")}>Delete</button>
          )}
          <button type="submit" className="button button--primary button-m grow" disabled={pending}>
            {pending ? "Saving…" : wish ? "Save changes" : "Put it in the box"}
          </button>
        </div>
      </form>

      <Confirm
        open={ask === "close"}
        title="Leave without saving?"
        body="Your changes won't be saved."
        keep="Keep editing"
        go="Discard"
        onKeep={() => setAsk(null)}
        onGo={onClose}
      />
      <Confirm
        open={ask === "delete"}
        title="Remove this wish?"
        body={`${wish?.title ?? "This wish"} will be taken out of your box.`}
        keep="Keep it"
        go={deleting ? "Removing…" : "Remove"}
        onKeep={() => setAsk(null)}
        onGo={remove}
      />
    </dialog>
  );
}
