"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import { AdminNavigation } from "@/components/admin-navigation";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";

type Identity = { fullName: string; username: string; role: string };
type Preview = {
  valid: boolean;
  existingAccount: boolean;
  existingUserId?: string | null;
  fullName: string;
  email: string;
  whatsAppNumber: string;
  username: string;
  skills: number;
  backgroundEntries: number;
  projects: number;
  socialLinks: number;
  warnings: string[];
  errors: string[];
};
type SetupResult = {
  user: { id: string; fullName: string; email: string; username: string };
  accountCreated: boolean;
  skillsSaved: number;
  backgroundEntriesSaved: number;
  projectsSaved: number;
  socialLinksSaved: number;
};
type SetupRequestItem = {
  id: string;
  fullName: string;
  email: string;
  whatsAppNumber: string;
  message?: string | null;
  status: "NEW" | "CONTACTED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  adminNote?: string | null;
  createdAt: string;
};
type RequestPage = { items: SetupRequestItem[] };

export function AdminPortfolioSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("userId") ?? "";
  const [admin, setAdmin] = useState({ name: "Administrator", username: "" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState("FILL_EMPTY");
  const [requests, setRequests] = useState<SetupRequestItem[]>([]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void apiFetch<Identity>("/api/v1/auth/private/me").then((response) => {
      if (response.response.status === 401) {
        clearAuth();
        router.replace("/login?session=expired");
        return;
      }
      if (!response.response.ok || response.result.data.role !== "SUPER_ADMIN") {
        router.replace("/dashboard");
        return;
      }
      setAdmin({ name: response.result.data.fullName, username: response.result.data.username });
      setReady(true);
      void apiFetch<RequestPage>("/api/v1/setup-requests/admin/private?page=1&size=50").then(
        (requestsResponse) => {
          if (requestsResponse.response.ok) {
            setRequests(requestsResponse.result.data.items ?? []);
          }
        },
      );
    });
  }, [router]);

  async function updateRequest(item: SetupRequestItem, status: SetupRequestItem["status"]) {
    const response = await apiFetch<SetupRequestItem>(
      `/api/v1/setup-requests/admin/private/${item.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: item.adminNote ?? "" }),
      },
    );
    if (response.response.ok) {
      setRequests((current) =>
        current.map((value) => (value.id === item.id ? response.result.data : value)),
      );
      setNotice("Setup request updated.");
    } else setNotice(response.result.message);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await apiFetch<{ id: string; fullName: string }>(
      "/api/v1/admin/private/portfolio-setup/accounts",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          whatsAppNumber: form.get("whatsAppNumber"),
          username: form.get("username"),
          accountType: form.get("accountType"),
        }),
      },
    );
    if (response.response.ok) {
      formElement.reset();
      setNotice(
        `${response.result.data.fullName}'s account was created. Setup links were sent by email.`,
      );
      router.push(`/admin/users/${response.result.data.id}`);
    } else {
      setNotice(response.result.message);
    }
    setBusy(false);
  }

  async function previewWorkbook() {
    if (!file) {
      setNotice("Choose the completed Excel workbook first.");
      return;
    }
    setBusy(true);
    setPreview(null);
    const body = new FormData();
    body.append("file", file);
    const suffix = selectedUserId ? `?userId=${encodeURIComponent(selectedUserId)}` : "";
    const response = await apiFetch<Preview>(
      `/api/v1/admin/private/portfolio-setup/preview${suffix}`,
      {
        method: "POST",
        body,
      },
    );
    if (response.response.ok) {
      setPreview(response.result.data);
      setNotice(
        response.result.data.valid
          ? "Workbook preview is ready."
          : "Correct the listed workbook errors before importing.",
      );
    } else {
      setNotice(response.result.message);
    }
    setBusy(false);
  }

  async function importWorkbook() {
    if (!file || !preview?.valid) return;
    if (
      mode === "REPLACE_SECTIONS" &&
      !window.confirm(
        "Replace the user's imported skills, background, projects and social links? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const params = new URLSearchParams({ mode });
    if (selectedUserId) params.set("userId", selectedUserId);
    const response = await apiFetch<SetupResult>(
      `/api/v1/admin/private/portfolio-setup/import?${params}`,
      {
        method: "POST",
        body,
      },
    );
    if (response.response.ok) {
      const result = response.result.data;
      setNotice(
        `Setup completed: ${result.skillsSaved} skills, ${result.backgroundEntriesSaved} background entries, ${result.projectsSaved} projects and ${result.socialLinksSaved} social links saved.`,
      );
      router.push(`/admin/users/${result.user.id}`);
    } else {
      setNotice(response.result.message);
    }
    setBusy(false);
  }

  if (!ready) {
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Administration</p>
          <h1>Preparing assisted setup…</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation name={admin.name} username={admin.username} avatarUrl="" active="setup" />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Assisted onboarding</p>
            <h1>Set up a portfolio for a user</h1>
            <span>
              Create an account manually or import the free structured workbook. No AI or paid
              service is required.
            </span>
          </div>
          <div className="admin-header-actions">
            <WorkspaceThemeToggle />
            <a href="/portfolio-hub-assisted-setup-template.xlsx" download>
              Download Excel template
            </a>
          </div>
        </header>
        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}

        <div className="admin-setup-grid">
          <form className="editor-card compact-form" onSubmit={createAccount}>
            <div className="card-heading">
              <span>New account</span>
              <h2>Create an account from scratch</h2>
              <p>
                The user receives secure password setup and verification links. The administrator
                never needs to know the user&apos;s password.
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
              <span>WhatsApp number</span>
              <input
                name="whatsAppNumber"
                type="tel"
                inputMode="tel"
                placeholder="+2348012345678"
                required
              />
              <small>This must be the active WhatsApp number, including country code.</small>
            </label>
            <label>
              <span>Username</span>
              <input
                name="username"
                minLength={5}
                pattern="^[A-Za-z0-9][A-Za-z0-9_-]{3,}[A-Za-z0-9]$"
                required
              />
            </label>
            <label>
              <span>Account type</span>
              <select name="accountType" defaultValue="PROFESSIONAL">
                <option value="PROFESSIONAL">Professional portfolio</option>
                <option value="BUSINESS_OWNER">Business owner</option>
              </select>
            </label>
            <button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account and send setup links"}
            </button>
          </form>

          <section className="editor-card compact-form">
            <div className="card-heading">
              <span>Structured import</span>
              <h2>
                {selectedUserId
                  ? "Update the selected user's portfolio"
                  : "Create or update from Excel"}
              </h2>
              <p>
                Blank cells do not overwrite saved information unless you deliberately choose
                replacement mode.
              </p>
            </div>
            {selectedUserId && (
              <p className="setup-selected-user">
                A user is selected. The workbook email must match that account.{" "}
                <Link href="/admin/setup">Clear selection</Link>
              </p>
            )}
            <a
              className="dashboard-action setup-template-link"
              href="/portfolio-hub-assisted-setup-template.xlsx"
              download
            >
              Download the free Excel template <span>↓</span>
            </a>
            <label className="file-picker">
              <span>Choose completed .xlsx workbook</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                }}
              />
            </label>
            {file && (
              <small>
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            )}
            <button type="button" disabled={!file || busy} onClick={() => void previewWorkbook()}>
              {busy ? "Checking…" : "Preview workbook"}
            </button>
            {preview && <PreviewCard preview={preview} />}
            {preview?.valid && (
              <>
                <label>
                  <span>How should existing information be handled?</span>
                  <select value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option value="FILL_EMPTY">Fill empty fields only — safest</option>
                    <option value="MERGE">Merge and update matching entries</option>
                    <option value="REPLACE_SECTIONS">Replace imported sections completely</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={mode === "REPLACE_SECTIONS" ? "danger-action" : ""}
                  disabled={busy}
                  onClick={() => void importWorkbook()}
                >
                  {busy
                    ? "Importing…"
                    : preview.existingAccount
                      ? "Update this portfolio"
                      : "Create account and portfolio"}
                </button>
              </>
            )}
          </section>
        </div>
        <section className="editor-card setup-request-queue">
          <div className="card-heading">
            <span>Landing-page requests</span>
            <h2>People waiting for setup help</h2>
            <p>
              Contact them using their email or active WhatsApp number, then create or update the
              account above.
            </p>
          </div>
          {requests.length ? (
            requests.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.fullName}</strong>
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                  <a
                    href={`https://wa.me/${item.whatsAppNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp {item.whatsAppNumber} ↗
                  </a>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                  {item.message && <p>{item.message}</p>}
                </div>
                <label>
                  <span>Status</span>
                  <select
                    value={item.status}
                    onChange={(event) =>
                      void updateRequest(item, event.target.value as SetupRequestItem["status"])
                    }
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>
              </article>
            ))
          ) : (
            <p className="public-empty">No one is waiting for assisted setup.</p>
          )}
        </section>
      </section>
    </main>
  );
}

function PreviewCard({ preview }: { preview: Preview }) {
  return (
    <section className={`setup-preview ${preview.valid ? "is-valid" : "has-errors"}`}>
      <div>
        <strong>{preview.fullName || "Account information incomplete"}</strong>
        <small>
          {preview.email} · {preview.whatsAppNumber}
        </small>
        <small>
          {preview.existingAccount
            ? "Existing account will be updated"
            : "A new account will be created"}
        </small>
      </div>
      <dl>
        <div>
          <dt>Skills</dt>
          <dd>{preview.skills}</dd>
        </div>
        <div>
          <dt>Background</dt>
          <dd>{preview.backgroundEntries}</dd>
        </div>
        <div>
          <dt>Projects</dt>
          <dd>{preview.projects}</dd>
        </div>
        <div>
          <dt>Social links</dt>
          <dd>{preview.socialLinks}</dd>
        </div>
      </dl>
      {preview.warnings.length > 0 && (
        <div>
          <strong>Please note</strong>
          <ul>
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {preview.errors.length > 0 && (
        <div>
          <strong>Fix these workbook errors</strong>
          <ul>
            {preview.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
