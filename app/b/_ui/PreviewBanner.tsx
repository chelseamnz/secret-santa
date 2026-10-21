/** Shown on organizer previews so it's clear nothing here is real or saved. */
export function PreviewBanner() {
  return (
    <div className="preview-banner label-s" role="note">
      Preview · nothing is saved · <a href="/organizer/preview">back to previews</a>
    </div>
  );
}
