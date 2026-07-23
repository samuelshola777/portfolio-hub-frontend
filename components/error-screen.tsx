"use client";

import Link from "next/link";

type ErrorScreenProps = {
  code: string;
  eyebrow: string;
  title: string;
  message: string;
  retry?: () => void;
  reference?: string;
};

export function ErrorScreen({ code, eyebrow, title, message, retry, reference }: ErrorScreenProps) {
  return (
    <main className="error-page">
      <nav className="error-nav">
        <Link href="/" className="dashboard-wordmark">
          Portfolio<span>/</span>
        </Link>
        <Link href="/guide">Help guide</Link>
      </nav>

      <section className="error-card" aria-live="polite">
        <div className="error-code" aria-hidden="true">
          {code}
        </div>
        <div className="error-copy">
          <p className="auth-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{message}</p>
          <div className="error-actions">
            {retry && (
              <button type="button" onClick={retry}>
                Try again
              </button>
            )}
            <Link href="/">Go to homepage</Link>
            <Link href="/dashboard" className="error-secondary-action">
              Open dashboard
            </Link>
          </div>
          {reference && <small>Error reference: {reference}</small>}
        </div>
      </section>

      <footer className="error-footer">
        <span>Your saved portfolio information has not been changed.</span>
        <Link href="/guide">How the application works →</Link>
      </footer>
    </main>
  );
}
