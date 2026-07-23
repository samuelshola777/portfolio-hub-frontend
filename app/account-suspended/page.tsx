import Link from "next/link";

export default function AccountSuspendedPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
  return (
    <main className="status-page suspended-page">
      <Link className="auth-wordmark" href="/">
        Portfolio<span>/</span>
      </Link>
      <section>
        <span className="status-icon">—</span>
        <p className="auth-kicker">Account suspended</p>
        <h1>Your profile is temporarily unavailable.</h1>
        <p>
          You can sign in, but you cannot access or change your profile while this account is
          suspended. Contact support if you believe this is a mistake.
        </p>
        <a className="auth-submit" href={`mailto:${supportEmail}`}>
          Contact support <span>↗</span>
        </a>
        <Link className="forgot-link" href="/login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
