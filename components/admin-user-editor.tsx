/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import type { PageData } from "@/lib/business";
import { emptyPage } from "@/lib/business";
import { Pagination } from "@/components/pagination";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";
import { AdminLayoutSwitcher } from "@/components/admin-layout-switcher";
import { AdminNavigation } from "@/components/admin-navigation";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  whatsAppNumber?: string | null;
  role: "USER" | "PROFESSIONAL" | "BUSINESS_OWNER" | "SUPER_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};
type Portfolio = {
  id: string;
  username: string;
  headline?: string | null;
  introduction?: string | null;
  note?: string | null;
  availability?: string | null;
  avatarUrl?: string | null;
  cvUrl?: string | null;
  introVideoUrl?: string | null;
  websiteUrl?: string | null;
  githubUsername?: string | null;
  theme: string;
  accent?: string | null;
  background?: string | null;
  font: string;
  motion: string;
  status: string;
  publishedAt?: string | null;
};
type Detail = {
  account: AdminUser;
  updatedAt: string;
  portfolioLink?: string | null;
  portfolio?: Portfolio | null;
  counts: {
    projects: number;
    backgroundEntries: number;
    skills: number;
    socialLinks: number;
    enquiries: number;
    analyticsEvents: number;
    files: number;
    businesses: number;
    businessContent: number;
    businessOrders: number;
    businessEnquiries: number;
  };
};
type AdminIdentity = { fullName: string; role: string; username: string };
type AdminPortfolio = { avatarUrl?: string };
type RecordItem = Record<string, unknown> & { id?: string };
type Tab =
  | "Overview"
  | "Projects"
  | "Background"
  | "Skills"
  | "Social links"
  | "Enquiries"
  | "Analytics events"
  | "Files"
  | "Businesses"
  | "Business content"
  | "Business orders"
  | "Business enquiries"
  | "Activity";

const tabs: Tab[] = [
  "Overview",
  "Projects",
  "Background",
  "Skills",
  "Social links",
  "Enquiries",
  "Analytics events",
  "Files",
  "Businesses",
  "Business content",
  "Business orders",
  "Business enquiries",
  "Activity",
];
const endpoint: Record<Exclude<Tab, "Overview">, string> = {
  Projects: "projects",
  Background: "background",
  Skills: "skills",
  "Social links": "social-links",
  Enquiries: "enquiries",
  "Analytics events": "analytics-events",
  Files: "files",
  Businesses: "businesses",
  "Business content": "business-content",
  "Business orders": "business-orders",
  "Business enquiries": "business-enquiries",
  Activity: "activity",
};

function label(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (v) => v.toUpperCase());
}
function date(value?: string | null) {
  if (!value) return "Not provided";
  return new Date(value.includes("T") ? value : value.replace(" ", "T")).toLocaleString();
}
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <em>Not provided</em>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (Array.isArray(value)) return <span>{value.length ? value.join(", ") : "Not provided"}</span>;
  if (typeof value === "object") return <code>{JSON.stringify(value)}</code>;
  const text = String(value);
  if (/^https?:\/\//i.test(text))
    return (
      <a href={text} target="_blank" rel="noreferrer">
        {text} ↗
      </a>
    );
  return <span>{text}</span>;
}
function Facts({ values }: { values: Record<string, unknown> }) {
  return (
    <dl className="admin-facts-grid">
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>
            <Value value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminUserEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [admin, setAdmin] = useState({
    name: "Administrator",
    username: "",
    avatar: "",
  });
  const [tab, setTab] = useState<Tab>("Overview");
  const [pageNumber, setPageNumber] = useState(1);
  const [records, setRecords] = useState<PageData<RecordItem>>(emptyPage());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadDetail() {
    const result = await apiFetch<Detail>(
      `/api/v1/admin/private/users/${encodeURIComponent(userId)}`,
    );
    if (result.response.ok) setDetail(result.result.data);
    else setMessage(result.result.message || "Unable to load this user");
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    Promise.all([
      apiFetch<AdminIdentity>("/api/v1/auth/private/me"),
      apiFetch<AdminPortfolio>("/api/v1/portfolios/private/mine"),
      apiFetch<Detail>(`/api/v1/admin/private/users/${encodeURIComponent(userId)}`),
    ]).then(([me, portfolio, user]) => {
      if (!active) return;
      if (me.response.status === 401) {
        clearAuth();
        router.replace("/login?session=expired");
        return;
      }
      if (!me.response.ok) {
        setMessage(
          me.result.message || "Unable to verify your administrator session. Please try again.",
        );
        setLoading(false);
        return;
      }
      if (me.result.data.role !== "SUPER_ADMIN") {
        router.replace("/dashboard");
        return;
      }
      setAdmin({
        name: me.result.data.fullName,
        username: me.result.data.username,
        avatar: portfolio.response.ok ? (portfolio.result.data?.avatarUrl ?? "") : "",
      });
      if (user.response.ok) setDetail(user.result.data);
      else setMessage(user.result.message || "Unable to load this user");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router, userId]);

  useEffect(() => {
    setPageNumber(1);
    setRecords(emptyPage());
  }, [tab]);
  useEffect(() => {
    if (tab === "Overview" || !detail) return;
    let active = true;
    setRecordsLoading(true);
    const path = endpoint[tab];
    void apiFetch<PageData<RecordItem>>(
      `/api/v1/admin/private/users/${encodeURIComponent(userId)}/${path}?page=${pageNumber}&size=10`,
    ).then((result) => {
      if (!active) return;
      if (result.response.ok) setRecords(result.result.data);
      else setMessage(result.result.message || `Unable to load ${tab.toLowerCase()}`);
      setRecordsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [detail, pageNumber, tab, userId]);

  async function updateInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const result = await apiFetch<AdminUser>(
      `/api/v1/admin/private/users/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          whatsAppNumber: form.get("whatsAppNumber"),
          username: detail.account.username,
          emailVerified: form.get("emailVerified") === "on",
        }),
      },
    );
    if (result.response.ok) {
      await loadDetail();
      setMessage("User information updated successfully.");
    } else setMessage(result.result.message || "Unable to update user");
    setSaving(false);
  }
  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await apiFetch<AdminUser>(
      `/api/v1/admin/private/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: form.get("status"),
          reason: form.get("reason"),
        }),
      },
    );
    if (result.response.ok) {
      await loadDetail();
      formElement.reset();
      setMessage("Account status updated and recorded in the audit trail.");
    } else setMessage(result.result.message || "Unable to update account status");
    setSaving(false);
  }
  async function permanentlyDeleteUser() {
    if (!detail || saving) return;
    const confirmed = window.confirm(
      `Permanently delete ${detail.account.fullName}? This removes the account, portfolio, files, projects, analytics, enquiries and business data. This cannot be undone.`,
    );
    if (!confirmed) return;
    setSaving(true);
    const result = await apiFetch<void>(
      `/api/v1/admin/private/users/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    if (result.response.ok) {
      router.replace("/admin#users");
      router.refresh();
      return;
    }
    setMessage(result.result.message || "Unable to permanently delete this user");
    setSaving(false);
  }

  const portfolioFacts = useMemo(
    () =>
      detail?.portfolio
        ? {
            portfolioId: detail.portfolio.id,
            publicPortfolioLink: detail.portfolioLink,
            username: detail.portfolio.username,
            headline: detail.portfolio.headline,
            introduction: detail.portfolio.introduction,
            note: detail.portfolio.note,
            availability: detail.portfolio.availability,
            avatarUrl: detail.portfolio.avatarUrl,
            cvUrl: detail.portfolio.cvUrl,
            introVideoUrl: detail.portfolio.introVideoUrl,
            websiteUrl: detail.portfolio.websiteUrl,
            githubUsername: detail.portfolio.githubUsername,
            theme: detail.portfolio.theme,
            accent: detail.portfolio.accent,
            background: detail.portfolio.background,
            font: detail.portfolio.font,
            motion: detail.portfolio.motion,
            status: detail.portfolio.status,
            publishedAt: detail.portfolio.publishedAt,
          }
        : { publicPortfolioLink: null, portfolioStatus: "No portfolio record" },
    [detail],
  );

  if (loading)
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Administration</p>
          <h1>Loading every user detail…</h1>
        </section>
      </main>
    );
  if (!detail)
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Administration</p>
          <h1>User information is unavailable.</h1>
          <p>{message}</p>
          <Link href="/admin#users">Back to all users</Link>
        </section>
      </main>
    );
  const user = detail.account;
  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation
        name={admin.name}
        username={admin.username}
        avatarUrl={admin.avatar}
        active="users"
      />
      <section>
        <header>
          <div>
            <p>Complete user record</p>
            <h1>{user?.fullName ?? "User unavailable"}</h1>
          </div>
          <div className="admin-header-actions">
            <AdminLayoutSwitcher />
            <WorkspaceThemeToggle />
            {detail?.portfolioLink && (
              <a href={detail.portfolioLink} target="_blank" rel="noreferrer">
                Open portfolio ↗
              </a>
            )}
            {user.role !== "SUPER_ADMIN" && (
              <Link href={`/admin/setup?userId=${encodeURIComponent(user.id)}`}>
                Complete portfolio setup
              </Link>
            )}
            <Link href="/admin#users">← Back to users</Link>
          </div>
        </header>
        {message && (
          <p className="dash-notice" role="status">
            {message}
          </p>
        )}
        {detail && (
          <>
            <nav className="admin-detail-tabs" aria-label="User information sections">
              {tabs.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={tab === value ? "is-active" : ""}
                  onClick={() => setTab(value)}
                >
                  {value}
                  {value !== "Overview" && (
                    <small>
                      {value === "Projects"
                        ? detail.counts.projects
                        : value === "Background"
                          ? detail.counts.backgroundEntries
                          : value === "Skills"
                            ? detail.counts.skills
                            : value === "Social links"
                              ? detail.counts.socialLinks
                              : value === "Enquiries"
                                ? detail.counts.enquiries
                                : value === "Analytics events"
                                  ? detail.counts.analyticsEvents
                                  : value === "Files"
                                    ? detail.counts.files
                                    : value === "Businesses"
                                      ? detail.counts.businesses
                                      : value === "Business content"
                                        ? detail.counts.businessContent
                                        : value === "Business orders"
                                          ? detail.counts.businessOrders
                                          : value === "Business enquiries"
                                            ? detail.counts.businessEnquiries
                                            : ""}
                    </small>
                  )}
                </button>
              ))}
            </nav>
            {tab === "Overview" ? (
              <div className="admin-detail-stack">
                <section className="editor-card">
                  <div className="card-heading">
                    <span>Account information</span>
                    <h2>Every non-sensitive account field</h2>
                    <p>
                      Passwords, token hashes, authenticator secrets and recovery codes are
                      intentionally never exposed.
                    </p>
                  </div>
                  <Facts
                    values={{
                      userId: user.id,
                      fullName: user.fullName,
                      email: user.email,
                      whatsAppNumber: user.whatsAppNumber,
                      username: user.username,
                      role: user.role,
                      status: user.status,
                      emailVerified: user.emailVerified,
                      twoFactorEnabled: user.twoFactorEnabled,
                      createdAt: date(user.createdAt),
                      updatedAt: date(detail.updatedAt),
                      lastLoginAt: date(user.lastLoginAt),
                    }}
                  />
                </section>
                <section className="editor-card">
                  <div className="card-heading">
                    <span>Portfolio information</span>
                    <h2>Filled and empty portfolio fields</h2>
                    <p>Empty values remain visible to the administrator as “Not provided.”</p>
                  </div>
                  <Facts values={portfolioFacts} />
                </section>
                {user.role !== "SUPER_ADMIN" && (
                  <>
                    <div className="two-column admin-user-editor-grid">
                      <form className="editor-card compact-form" onSubmit={updateInformation}>
                        <div className="card-heading">
                          <span>Personal information</span>
                          <h2>Edit user account</h2>
                          <p>The username and permanent public link are read-only.</p>
                        </div>
                        <label>
                          <span>Full name</span>
                          <input
                            name="fullName"
                            defaultValue={user.fullName}
                            minLength={2}
                            required
                          />
                        </label>
                        <label>
                          <span>Email address</span>
                          <input name="email" type="email" defaultValue={user.email} required />
                        </label>
                        <label>
                          <span>WhatsApp number</span>
                          <input
                            name="whatsAppNumber"
                            type="tel"
                            inputMode="tel"
                            defaultValue={user.whatsAppNumber ?? ""}
                            required
                            placeholder="+2348012345678"
                          />
                          <small>
                            Use the user&apos;s active WhatsApp number with the country code.
                          </small>
                        </label>
                        <label>
                          <span>Permanent username</span>
                          <input value={user.username} readOnly />
                        </label>
                        <label className="checkbox-label">
                          <input
                            name="emailVerified"
                            type="checkbox"
                            defaultChecked={user.emailVerified}
                          />
                          <span>Email address is verified</span>
                        </label>
                        <button className="dashboard-action" type="submit" disabled={saving}>
                          {saving ? "Saving…" : "Save user information"}
                          <span>→</span>
                        </button>
                      </form>
                      <form className="editor-card compact-form" onSubmit={updateStatus}>
                        <div className="card-heading">
                          <span>Account access</span>
                          <h2>Change account status</h2>
                          <p>
                            Current status: <strong>{user.status}</strong>
                          </p>
                        </div>
                        <label>
                          <span>New status</span>
                          <select name="status" defaultValue={user.status}>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </label>
                        <label>
                          <span>Reason</span>
                          <textarea
                            name="reason"
                            minLength={3}
                            required
                            placeholder="Explain why this status is being changed"
                          />
                        </label>
                        <button className="dashboard-action" type="submit" disabled={saving}>
                          {saving ? "Saving…" : "Update account status"}
                          <span>→</span>
                        </button>
                      </form>
                    </div>
                    <section className="editor-card admin-danger-zone">
                      <div className="card-heading">
                        <span>Danger zone</span>
                        <h2>Permanently delete this user</h2>
                        <p>
                          This removes the account and all associated portfolio, upload, project,
                          analytics, enquiry and business records. It cannot be undone.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void permanentlyDeleteUser()}
                      >
                        {saving ? "Working…" : "Delete user completely"}
                      </button>
                    </section>
                  </>
                )}
              </div>
            ) : (
              <section className="editor-card admin-records">
                <div className="card-heading">
                  <span>Server-side page {records.currentPage}</span>
                  <h2>{tab}</h2>
                  <p>
                    Showing {records.items.length} of {records.totalItems}. Only this page is
                    loaded.
                  </p>
                </div>
                {recordsLoading ? (
                  <p className="public-empty">Loading this page…</p>
                ) : records.items.length ? (
                  records.items.map((record, index) => (
                    <article key={record.id ?? `${tab}-${index}`}>
                      <Facts values={record} />
                    </article>
                  ))
                ) : (
                  <p className="public-empty">No records. This section has not been filled.</p>
                )}
                <Pagination page={records} onPage={setPageNumber} />
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
