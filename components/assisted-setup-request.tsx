"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export function AssistedSetupRequest() {
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await apiFetch(
      "/api/v1/setup-requests/public",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          whatsAppNumber: form.get("whatsAppNumber"),
          message: form.get("message"),
        }),
      },
      false,
    );
    setNotice(response.result.message);
    if (response.response.ok) {
      formElement.reset();
      setComplete(true);
    }
    setBusy(false);
  }

  return (
    <main className="assisted-setup-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Link className="wordmark" href="/">
          Portfolio<span>/</span>
        </Link>
        <div className="landing-nav-links">
          <Link href="/guide">User guide</Link>
          <Link href="/login">Sign in</Link>
        </div>
        <Link className="nav-cta" href="/register">
          Create an account
        </Link>
      </nav>
      <section className="assisted-setup-hero">
        <div>
          <p className="eyebrow">Free assisted onboarding</p>
          <h1>Let us help organise your portfolio.</h1>
          <p>
            There is no AI fee. Download the structured Excel workbook, enter your information and a
            super administrator can create or update your portfolio accurately.
          </p>
          <ol>
            <li>Send the request form.</li>
            <li>Download and complete the workbook.</li>
            <li>An administrator contacts you through email or your active WhatsApp number.</li>
            <li>You receive secure account and verification links.</li>
          </ol>
          <a
            className="button button-primary"
            href="/portfolio-hub-assisted-setup-template.xlsx"
            download
          >
            Download the Excel template ↓
          </a>
        </div>
        <form className="editor-card compact-form assisted-request-form" onSubmit={submit}>
          <div className="card-heading">
            <span>Request help</span>
            <h2>Tell the administrator how to reach you</h2>
            <p>
              Already have an account? Use the same email address so your existing portfolio can be
              updated.
            </p>
          </div>
          <label>
            <span>Full name</span>
            <input name="fullName" minLength={2} required />
          </label>
          <label>
            <span>Email address</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Active WhatsApp number</span>
            <input
              name="whatsAppNumber"
              type="tel"
              inputMode="tel"
              placeholder="+2348012345678"
              required
            />
            <small>
              This must be the WhatsApp number you actively use. Include your country code.
            </small>
          </label>
          <label>
            <span>What help do you need? (optional)</span>
            <textarea
              name="message"
              placeholder="For example: I already have an account and want help adding my experience and projects."
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Request portfolio setup help"}
          </button>
          {notice && (
            <p className={complete ? "setup-success" : "auth-error"} role="status">
              {notice}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
