"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { BOWS, PAPERS, bowLabel, paperLabel } from "@/lib/catalog";
import { saveWrap } from "../actions";
import { StepHead, StepShell } from "../../_ui/pieces";

function Next({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button button--primary button-m grow" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save changes" : "Next: fill your box"}
    </button>
  );
}

export function WrapStep({
  token,
  name,
  paper: initialPaper,
  bow: initialBow,
  editing,
}: {
  token: string;
  name: string;
  paper: string;
  bow: string;
  editing: boolean;
}) {
  const [paper, setPaper] = useState(initialPaper);
  const [bow, setBow] = useState(initialBow);

  return (
    <StepShell name={name} paper={paper} bow={bow} caption="Here's yours under the tree." wide>
      <div className="pc-shadow"><form action={saveWrap.bind(null, token)} className="postcard pc step-form">
        <input type="hidden" name="mode" value={editing ? "edit" : "new"} />
        <StepHead kicker={editing ? "Edit your wrapping" : "Step 1 of 3"} title="Wrap your box" />

        <fieldset className="picker">
          <legend className="label-s muted">Wrapping paper &nbsp;·&nbsp; {paperLabel(paper)}</legend>
          <div className="swatches">
            {PAPERS.map((p) => (
              <label key={p.slug} className="swatch swatch--paper" title={p.label}>
                <input type="radio" name="paper" value={p.slug} checked={paper === p.slug} onChange={() => setPaper(p.slug)} />
                <img src={`/assets/paper-${p.slug}.webp`} alt={p.label} loading="lazy" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="picker">
          <legend className="label-s muted">Bow &nbsp;·&nbsp; {bowLabel(bow)}</legend>
          <div className="swatches">
            {BOWS.map((b) => (
              <label key={b.slug} className="swatch swatch--bow" title={b.label}>
                <input type="radio" name="bow" value={b.slug} checked={bow === b.slug} onChange={() => setBow(b.slug)} />
                <img src={`/assets/bow-${b.slug}.webp`} alt={b.label} loading="lazy" />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="step-actions">
          <Link href={editing ? `/b/${token}/edit` : `/b/${token}`} className="button button--danger-outline button-m">Back</Link>
          <Next editing={editing} />
        </div>
      </form></div>
    </StepShell>
  );
}
