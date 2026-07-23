"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PasswordField } from "@/components/password-field";

export function PasswordResetForm({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const endpoint = token
      ? "/api/v1/auth/public/reset-password"
      : "/api/v1/auth/public/forgot-password";
    const payload = token
      ? { token, password: form.get("password") }
      : { email: form.get("email") };
    const { response, result } = await apiFetch<null>(
      endpoint,
      { method: "POST", body: JSON.stringify(payload) },
      false,
    );
    setMessage(
      result.message ?? (response.ok ? "Password changed. Sign in again." : "Unable to continue."),
    );
    setSuccess(response.ok);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <p className="auth-kicker">Account recovery</p>
      <h1>{token ? "Choose a new password." : "Find your way back."}</h1>
      <p className="auth-intro">
        {token
          ? "Use at least 5 characters. Your other sessions will be signed out."
          : "Enter your email and we will send a single-use reset link if the account exists."}
      </p>
      {!success &&
        (token ? (
          <label>
            <span>New password</span>
            <PasswordField name="password" minLength={5} autoComplete="new-password" required />
            <small>Use at least 5 characters.</small>
          </label>
        ) : (
          <label>
            <span>Email address</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
        ))}
      {message && <p className={success ? "dashboard-notice" : "auth-error"}>{message}</p>}
      {!success && (
        <button className="auth-submit" type="submit">
          {token ? "Reset password" : "Send reset link"}
          <span>→</span>
        </button>
      )}
      {success && (
        <Link className="auth-submit" href="/login">
          Return to sign in <span>→</span>
        </Link>
      )}
    </form>
  );
}
