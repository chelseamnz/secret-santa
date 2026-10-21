// Placeholder home page. Proves the deploy, fonts and tokens work.
// The real screens (tree, steps, reveal) replace this as we build them.

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      <div className="stripes" style={{ height: 72 }} aria-hidden />

      <section
        style={{
          display: "grid",
          placeItems: "center",
          padding: "var(--spacing-xl) var(--spacing-md)",
        }}
      >
        <div
          className="postcard"
          style={{
            width: "min(420px, 100%)",
            padding: "var(--spacing-xl) var(--spacing-lg)",
            textAlign: "center",
            display: "grid",
            gap: "var(--spacing-sm)",
          }}
        >
          <p className="label-s" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            2026
          </p>
          <h1 style={{ margin: 0, lineHeight: 1 }}>
            <span className="script-l" style={{ color: "var(--color-text-accent)", display: "block" }}>
              Secret
            </span>
            <span className="display-xl" style={{ display: "block", marginTop: -12 }}>
              Santa
            </span>
          </h1>
          <p className="body-m" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            The tree is being decorated. Your link will arrive in Messenger soon.
          </p>
          <p className="label-s" style={{ margin: 0, color: "var(--color-text-accent)" }}>
            Exchange · Dec 25
          </p>
        </div>
      </section>

      <div className="stripes" style={{ height: 72 }} aria-hidden />
    </main>
  );
}
