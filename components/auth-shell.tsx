import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Portfolio product introduction">
        <Link className="auth-wordmark" href="/">
          Portfolio<span>/</span>
        </Link>
        <div>
          <p>Not a template. A point of view.</p>
          <h2>Make the route to your best work feel unmistakably yours.</h2>
        </div>
        <div className="auth-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <small>Built for technical and non-technical professionals.</small>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
