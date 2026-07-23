"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth } from "@/lib/api";
import { PasswordField } from "@/components/password-field";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(true);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            fullName: form.get("fullName"),
            username: form.get("username"),
            whatsAppNumber: form.get("whatsAppNumber"),
            email: form.get("email"),
            password: form.get("password"),
            accountType: form.get("accountType"),
          }
        : {
            email: form.get("email"),
            password: form.get("password"),
            twoFactorCode: form.get("twoFactorCode") || undefined,
          };

    try {
      const { response, result } = await apiFetch<{
        accessToken?: string;
        refreshToken?: string;
        user?: {
          username: string;
          role: "USER" | "PROFESSIONAL" | "BUSINESS_OWNER" | "SUPER_ADMIN";
          status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
        };
        verificationEmailSent?: boolean;
      }>(
        mode === "register" ? "/api/v1/auth/public/register" : "/api/v1/auth/public/login",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        false,
      );
      if (!response.ok) {
        if (result.message.toLowerCase().includes("two-factor")) setNeedsTwoFactor(true);
        setError(result.message ?? "Something went wrong");
        return;
      }
      if (mode === "register") {
        const registration = result.data as {
          user?: { username?: string };
          verificationEmailSent?: boolean;
        };
        setVerificationSent(registration.verificationEmailSent !== false);
        setRegisteredUsername(registration.user?.username ?? String(payload.username ?? ""));
        setRegisteredEmail(String(payload.email ?? ""));
        setRegistered(true);
      } else {
        const auth = result.data;
        if (!auth.accessToken || !auth.refreshToken || !auth.user)
          throw new Error("Invalid login response");
        saveAuth(auth.accessToken, auth.refreshToken);
        const redirectTo =
          auth.user.status === "SUSPENDED"
            ? "/account-suspended"
            : auth.user.role === "SUPER_ADMIN"
              ? "/admin"
              : "/dashboard";
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError("The service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!registeredEmail || verificationBusy) return;
    setVerificationBusy(true);
    setVerificationNotice("");
    const { response, result } = await apiFetch<boolean>(
      `/api/v1/auth/public/resend-verification?email=${encodeURIComponent(registeredEmail)}`,
      { method: "POST" },
      false,
    );
    setVerificationNotice(
      response.ok
        ? `A fresh verification link was sent to ${registeredEmail}. Check your inbox and spam folder.`
        : result.message || "We could not send another verification email yet.",
    );
    setVerificationBusy(false);
  }

  if (registered) {
    return (
      <div className="auth-success" role="status">
        <span className="success-mark">✓</span>
        <p className="auth-kicker">Account created</p>
        <h1>Your workspace is ready.</h1>
        <p>
          {verificationSent
            ? "We sent a verification link to your email. You can sign in now, but uploads stay locked until you click it."
            : "You can sign in now. We could not send the verification email, but you can request another link from your dashboard."}
        </p>
        <section className="registration-verification-card">
          <div>
            <strong>Verify your email</strong>
            <span>{registeredEmail}</span>
          </div>
          <p>
            Open the message from Portfolio Hub and click <b>Verify my email</b>. If it has not
            arrived, send a fresh link here.
          </p>
          <button
            type="button"
            onClick={() => void resendVerification()}
            disabled={verificationBusy}
          >
            {verificationBusy ? "Sending…" : "Send verification email again"}
          </button>
          {verificationNotice && <small role="status">{verificationNotice}</small>}
        </section>
        <div className="auth-success-actions">
          {registeredUsername && (
            <Link className="auth-submit" href={`/${encodeURIComponent(registeredUsername)}`}>
              View my portfolio <span>↗</span>
            </Link>
          )}
          <Link className="auth-secondary" href="/login">
            Continue to sign in <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  const isRegister = mode === "register";
  return (
    <form className="auth-form" onSubmit={submit}>
      <p className="auth-kicker">{isRegister ? "Create your space" : "Welcome back"}</p>
      <h1>{isRegister ? "Start with your name." : "Continue your story."}</h1>
      <p className="auth-intro">
        {isRegister
          ? "Choose your workspace, then reserve a permanent public URL. It cannot be changed later."
          : "Sign in to manage your work, files and portfolio appearance."}
      </p>

      {isRegister && (
        <fieldset className="account-type-picker">
          <legend>What do you want to build?</legend>
          <label>
            <input type="radio" name="accountType" value="PROFESSIONAL" defaultChecked />
            <span>
              <strong>Professional portfolio</strong>
              <small>Show your experience, skills, projects and CV to recruiters.</small>
            </span>
          </label>
          <label>
            <input type="radio" name="accountType" value="BUSINESS_OWNER" />
            <span>
              <strong>Business website</strong>
              <small>Create one or more business websites, catalogs, orders and enquiries.</small>
            </span>
          </label>
        </fieldset>
      )}

      {isRegister && (
        <div className="auth-field-row">
          <label>
            <span>Full name</span>
            <input
              name="fullName"
              autoComplete="name"
              minLength={2}
              required
              placeholder="Samuel Shola"
            />
          </label>
          <label>
            <span>Username</span>
            <div className="username-input">
              <small>/</small>
              <input
                name="username"
                autoComplete="username"
                minLength={5}
                required
                placeholder="samuel"
                pattern="^[A-Za-z0-9][A-Za-z0-9_-]{3,}[A-Za-z0-9]$"
                title="Use at least 5 letters, numbers, hyphens or underscores"
              />
            </div>
          </label>
        </div>
      )}

      <label>
        <span>Email address</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>
      {isRegister && (
        <label>
          <span>WhatsApp number</span>
          <input
            name="whatsAppNumber"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="+2348012345678"
          />
          <small>
            Use the active WhatsApp number where we can reach you. Include your country code.
          </small>
        </label>
      )}
      <label>
        <span>Password</span>
        <PasswordField
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={5}
          required
          placeholder={isRegister ? "Minimum of 5 characters" : "Your password"}
        />
      </label>

      {!isRegister && needsTwoFactor && (
        <label>
          <span>Authenticator or recovery code</span>
          <input
            name="twoFactorCode"
            autoComplete="one-time-code"
            minLength={6}
            required
            placeholder="6-digit code or recovery code"
          />
        </label>
      )}

      {!isRegister && !needsTwoFactor && (
        <Link className="forgot-link" href="/forgot-password">
          Forgot password?
        </Link>
      )}

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Create my portfolio" : "Sign in"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="auth-switch">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create a portfolio"}
        </Link>
      </p>
    </form>
  );
}
