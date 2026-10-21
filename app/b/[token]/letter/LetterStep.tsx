"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LETTER_MAX_WORDS, countWords } from "@/lib/catalog";
import { saveLetter } from "../actions";
import { StepHead, StepShell } from "../../_ui/pieces";

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending, data } = useFormStatus();
  const mine = data?.get("intent") !== "back";
  return (
    <button type="submit" name="intent" value={label === "Wrap it up" ? "wrap" : "save"}
      className="button button--primary button-m grow" disabled={disabled || pending}>
      {pending && mine ? (label === "Wrap it up" ? "Wrapping…" : "Saving…") : label}
    </button>
  );
}

export function LetterStep({
  token, name, paper, bow, letter: initial, editing,
}: { token: string; name: string; paper: string; bow: string; letter: string; editing: boolean }) {
  const [letter, setLetter] = useState(initial);
  const words = countWords(letter);
  const tooLong = words > LETTER_MAX_WORDS;

  return (
    <StepShell name={name} paper={paper} bow={bow} caption={words ? "Your letter is tucked inside." : "A little note for your Santa."}>
      <div className="pc-shadow">
        <form action={saveLetter.bind(null, token)} className="postcard pc step-form">
          <StepHead kicker={editing ? "Edit your letter  ·  optional" : "Step 3 of 3  ·  optional"} title="Write your letter" />

          <div className="letter-paper">
            <p className="letter-m letter-paper__greet">Dear Santa,</p>
            <textarea
              name="letter"
              className="letter-paper__text letter-m"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="Tell your Santa how your year went, what you've been loving lately, or anything at all…"
              aria-label="Your letter to Santa"
              rows={8}
            />
            <p className="letter-m letter-paper__love">Love,</p>
            <p className="script-m accent letter-paper__sign">{name}</p>
            <p className={`letter-paper__count body-s ${tooLong ? "accent" : "muted"}`} aria-live="polite">
              <span>{words.toLocaleString()} / {LETTER_MAX_WORDS.toLocaleString()} words</span>
            </p>
          </div>
          {tooLong && <p className="form-error body-s">That&apos;s a little long — trim it to {LETTER_MAX_WORDS.toLocaleString()} words.</p>}

          <div className="step-actions">
            {editing ? (
              <Link href={`/b/${token}/edit`} className="button button--danger-outline button-m">Back</Link>
            ) : (
              <button type="submit" name="intent" value="back" className="button button--danger-outline button-m" disabled={tooLong}>Back</button>
            )}
            <Submit label={editing ? "Save changes" : "Wrap it up"} disabled={tooLong} />
          </div>
        </form>
      </div>
    </StepShell>
  );
}
