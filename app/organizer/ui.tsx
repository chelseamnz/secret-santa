"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";

// ---------- Toast (bottom-center, 3 seconds)
// Rendered into <body> through a portal so a masked postcard can't clip it.

export function Toast({ message, tone = "notice" }: { message: string; tone?: "notice" | "error" }) {
  const [shown, setShown] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setShown(true);
    const t = setTimeout(() => setShown(false), tone === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [message, tone]);
  if (!shown || !mounted) return null;
  return createPortal(
    <div className={`toast toast--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {tone === "notice" ? "✓ " : ""}
      {message}
    </div>,
    document.body,
  );
}

// ---------- Copy link

export function CopyLinkButton({ url, name, compact }: { url: string; name: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: fall back to a temporary text field.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={compact ? "link-action label-s" : "button button--secondary button--small button-m"}
      >
        Copy link
      </button>
      {copied && <Toast message={`${name}'s link copied — paste it in their Messenger chat`} />}
    </>
  );
}

// ---------- Confirm dialog wrapping a server action

function SubmitButton({ label, destructive }: { label: string; destructive?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`button button-m ${destructive ? "button--destructive" : "button--primary"}`}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function ConfirmAction({
  trigger,
  triggerClass,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel,
  destructive = true,
  action,
  disabled,
}: {
  trigger: string;
  triggerClass: string;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<void>;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={triggerClass}
        disabled={disabled}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog ref={ref} className="dialog postcard" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <form action={action} className="dialog__inner">
          <h2 className="display-m dialog__title">{title}</h2>
          <p className="body-m dialog__body">{body}</p>
          <div className="dialog__actions">
            <button type="button" className="button button--secondary button-m" onClick={() => ref.current?.close()}>
              {cancelLabel}
            </button>
            <SubmitButton label={confirmLabel} destructive={destructive} />
          </div>
        </form>
      </dialog>
    </>
  );
}

// ---------- Two-step confirm for the emergency view (navigates, no action)

export function EmergencyButton() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="button button--danger-outline button-m full" onClick={() => ref.current?.showModal()}>
        Open emergency view
      </button>
      <dialog ref={ref} className="dialog postcard" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="dialog__inner">
          <h2 className="display-m dialog__title">Open emergency view?</h2>
          <p className="body-m dialog__body">
            You&apos;ll see every pairing — including who your own Santa is.
          </p>
          <div className="dialog__actions">
            <button type="button" className="button button--secondary button-m" onClick={() => ref.current?.close()}>
              Close
            </button>
            <a href="/organizer?view=pairings" className="button button--destructive button-m">
              Show pairings
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function PendingButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : label}
    </button>
  );
}
