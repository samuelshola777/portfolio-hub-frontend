import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default async function VerificationComplete({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let success = false;
  if (token) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/public/verify-email?token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      success = response.ok;
    } catch {
      success = false;
    }
  }
  return (
    <main className="status-page">
      <Link className="auth-wordmark" href="/">
        Portfolio<span>/</span>
      </Link>
      <section>
        <span className={success ? "status-icon success" : "status-icon"}>
          {success ? "✓" : "!"}
        </span>
        <p className="auth-kicker">Email verification</p>
        <h1>{success ? "Uploads unlocked." : "That link is no longer valid."}</h1>
        <p>
          {success
            ? "Your email is verified. You can now add CVs, images, videos and project files."
            : "Sign in to request a fresh verification link from your dashboard."}
        </p>
        <Link className="auth-submit" href={success ? "/dashboard" : "/login"}>
          {success ? "Open dashboard" : "Sign in"} <span>→</span>
        </Link>
      </section>
    </main>
  );
}
