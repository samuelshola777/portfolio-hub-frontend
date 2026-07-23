/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import type { PageData } from "@/lib/business";
import { emptyPage } from "@/lib/business";
import {
  adminUserParams,
  emptyAdminFilters,
  type AdminFilters,
  type AdminIdentity,
  type AdminPortfolio,
  type AdminUser,
} from "@/lib/admin";
import { Pagination } from "@/components/pagination";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";
import { AdminLayoutSwitcher } from "@/components/admin-layout-switcher";
import { AdminNavigation } from "@/components/admin-navigation";

type Activity = {
  id: string;
  actorId: string;
  targetUserId?: string;
  action: string;
  description: string;
  createdAt: string;
};
type Metrics = {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  publishedPortfolios: number;
  totalStorageBytes: number;
  portfolioViews: number;
  projectClicks: number;
  totalEnquiries: number;
  newEnquiries: number;
  userGrowth: Array<{ date: string; users: number }>;
  activityAvailable: boolean;
};
const emptyMetrics: Metrics = {
  totalUsers: 0,
  activeUsers: 0,
  verifiedUsers: 0,
  publishedPortfolios: 0,
  totalStorageBytes: 0,
  portfolioViews: 0,
  projectClicks: 0,
  totalEnquiries: 0,
  newEnquiries: 0,
  userGrowth: [],
  activityAvailable: false,
};

function date(value?: string | null) {
  if (!value) return "Never";
  return new Date(value.includes("T") ? value : value.replace(" ", "T")).toLocaleString();
}

export function AdminShell() {
  const router = useRouter();
  const [admin, setAdmin] = useState({ name: "Administrator", username: "", avatarUrl: "" });
  const [users, setUsers] = useState<PageData<AdminUser>>(emptyPage());
  const [activity, setActivity] = useState<PageData<Activity>>(emptyPage());
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [draftFilters, setDraftFilters] = useState<AdminFilters>(emptyAdminFilters);
  const [filters, setFilters] = useState<AdminFilters>(emptyAdminFilters);
  const [userPage, setUserPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [activityEditor, setActivityEditor] = useState<Activity | null>(null);
  const [showActivityEditor, setShowActivityEditor] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters(draftFilters);
      setUserPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const loadIdentity = useCallback(async () => {
    const me = await apiFetch<AdminIdentity>("/api/v1/auth/private/me");
    if (me.response.status === 401) {
      clearAuth();
      router.replace("/login?session=expired");
      return false;
    }
    if (!me.response.ok) {
      setNotice(
        me.result.message || "Unable to verify your administrator session. Please try again.",
      );
      return false;
    }
    if (me.result.data.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
      return false;
    }
    const [analytics, portfolio] = await Promise.all([
      apiFetch<Metrics>("/api/v1/admin/private/analytics"),
      apiFetch<AdminPortfolio>("/api/v1/portfolios/private/mine"),
    ]);
    setAdmin({
      name: me.result.data.fullName,
      username: me.result.data.username,
      avatarUrl: portfolio.response.ok ? (portfolio.result.data?.avatarUrl ?? "") : "",
    });
    if (analytics.response.ok) setMetrics({ ...emptyMetrics, ...analytics.result.data });
    else setNotice(analytics.result.message || "Unable to load platform totals");
    return true;
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    void loadIdentity().then((ok) => {
      if (active && ok) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [loadIdentity, refreshKey, router]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const params = adminUserParams(filters, userPage, pageSize, true);
    void apiFetch<PageData<AdminUser>>(`/api/v1/admin/private/users?${params}`).then((result) => {
      if (!active) return;
      if (result.response.ok) setUsers(result.result.data);
      else setNotice(result.result.message || "Unable to load users");
    });
    return () => {
      active = false;
    };
  }, [filters, pageSize, ready, refreshKey, userPage]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void apiFetch<PageData<Activity>>(
      `/api/v1/admin/private/activity?page=${activityPage}&size=10`,
    ).then((result) => {
      if (!active) return;
      if (result.response.ok) setActivity(result.result.data);
      else setNotice(result.result.message || "Unable to load account activity");
    });
    return () => {
      active = false;
    };
  }, [activityPage, ready, refreshKey]);

  async function deleteUser(user: AdminUser) {
    if (
      !window.confirm(
        `Permanently delete ${user.fullName} and all associated data? This cannot be undone.`,
      )
    )
      return;
    const result = await apiFetch<void>(
      `/api/v1/admin/private/users/${encodeURIComponent(user.id)}`,
      { method: "DELETE" },
    );
    if (!result.response.ok) {
      setNotice(result.result.message || "Unable to delete this user");
      return;
    }
    setNotice(`${user.fullName} and all associated data were permanently deleted.`);
    setRefreshKey((key) => key + 1);
  }

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      action: form.get("action"),
      description: form.get("description"),
      targetUserId: form.get("targetUserId") || null,
    };
    const endpoint = activityEditor
      ? `/api/v1/admin/private/activity/${encodeURIComponent(activityEditor.id)}`
      : "/api/v1/admin/private/activity";
    const result = await apiFetch<Activity>(endpoint, {
      method: activityEditor ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    if (!result.response.ok) {
      setNotice(result.result.message || "Unable to save activity");
      return;
    }
    setNotice(activityEditor ? "Activity updated." : "Activity created.");
    setShowActivityEditor(false);
    setActivityEditor(null);
    setRefreshKey((key) => key + 1);
  }

  async function deleteActivities(ids: string[]) {
    const unique = Array.from(new Set(ids));
    if (!unique.length) return;
    if (
      !window.confirm(
        `Permanently delete ${unique.length} activity ${unique.length === 1 ? "record" : "records"}? This cannot be undone.`,
      )
    )
      return;
    const result =
      unique.length === 1
        ? await apiFetch<void>(`/api/v1/admin/private/activity/${encodeURIComponent(unique[0])}`, {
            method: "DELETE",
          })
        : await apiFetch<number>("/api/v1/admin/private/activity/hard-delete", {
            method: "POST",
            body: JSON.stringify({ ids: unique }),
          });
    if (!result.response.ok) {
      setNotice(result.result.message || "Unable to delete activity");
      return;
    }
    setSelectedActivities(new Set());
    setNotice(
      `${unique.length} activity ${unique.length === 1 ? "record" : "records"} permanently deleted.`,
    );
    setRefreshKey((key) => key + 1);
  }

  function toggleActivity(id: string) {
    setSelectedActivities((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setDraftFilters(emptyAdminFilters);
    setFilters(emptyAdminFilters);
    setUserPage(1);
  }

  if (!ready)
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Administration</p>
          <h1>
            {notice
              ? "Administration is temporarily unavailable."
              : "Preparing your control centre…"}
          </h1>
          {notice && (
            <>
              <p>{notice}</p>
              <button
                type="button"
                onClick={() =>
                  void loadIdentity().then((ok) => {
                    if (ok) setReady(true);
                  })
                }
              >
                Try again
              </button>
            </>
          )}
        </section>
      </main>
    );
  const cards: Array<[string, string | number, string]> = [
    ["Registered users", metrics.totalUsers, "All accounts"],
    ["Active users", metrics.activeUsers, "Can sign in"],
    ["Verified users", metrics.verifiedUsers, "Email confirmed"],
    ["Published portfolios", metrics.publishedPortfolios, "Live profiles"],
    ["Portfolio views", metrics.portfolioViews, "All time"],
    ["Project clicks", metrics.projectClicks, "Engagement"],
    ["New enquiries", metrics.newEnquiries, "Awaiting users"],
    [
      "Storage used",
      `${(metrics.totalStorageBytes / 1024 / 1024).toFixed(1)} MB`,
      "Managed uploads",
    ],
  ];
  const largest = Math.max(1, ...metrics.userGrowth.map((day) => day.users));

  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation {...admin} active="overview" />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Platform control centre</p>
            <h1>Administration</h1>
            <span>Monitor growth, manage accounts and keep the platform healthy.</span>
          </div>
          <div className="admin-header-actions">
            <AdminLayoutSwitcher />
            <WorkspaceThemeToggle />
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
              Refresh data
            </button>
            <Link href="/admin/setup">Set up a portfolio</Link>
            <Link href="/admin/announcements">Create announcement</Link>
          </div>
        </header>
        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}
        <div className="admin-metrics" id="overview">
          {cards.map(([label, value, hint]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </article>
          ))}
        </div>
        <section className="admin-growth editor-card">
          <div className="card-heading">
            <span>Last 30 days</span>
            <h2>User growth</h2>
            <p>Daily account creation across the platform.</p>
          </div>
          <div>
            {metrics.userGrowth.map((day) => (
              <span
                key={day.date}
                title={`${day.date}: ${day.users}`}
                style={{
                  height: `${day.users === 0 ? 3 : Math.max(10, Math.round((day.users / largest) * 100))}%`,
                }}
              />
            ))}
          </div>
        </section>

        <section className="admin-directory admin-directory-v2" id="users">
          <div className="admin-section-heading">
            <div>
              <p>User management</p>
              <h2>Account directory</h2>
              <small>
                {users.totalItems} matching account{users.totalItems === 1 ? "" : "s"}
              </small>
            </div>
            <Link className="admin-primary-link" href="/admin/announcements">
              Select recipients & send →
            </Link>
          </div>
          <div className="admin-filter-bar">
            <label className="admin-search-field">
              <span>Search</span>
              <input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((value) => ({ ...value, search: event.target.value }))
                }
                placeholder="Name, email, username or WhatsApp"
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    status: event.target.value as AdminFilters["status"],
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </label>
            <label>
              <span>Verification</span>
              <select
                value={draftFilters.verified}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    verified: event.target.value as AdminFilters["verified"],
                  }))
                }
              >
                <option value="">All users</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </label>
            <label>
              <span>Role</span>
              <select
                value={draftFilters.role}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    role: event.target.value as AdminFilters["role"],
                  }))
                }
              >
                <option value="">All roles</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="BUSINESS_OWNER">Business owner</option>
                <option value="USER">Legacy user</option>
              </select>
            </label>
            <button type="button" className="admin-clear-filter" onClick={clearFilters}>
              Clear
            </button>
          </div>
          <div className="admin-table">
            <div className="admin-user-grid admin-user-grid-head">
              <span>User</span>
              <span>Role</span>
              <span>Verification</span>
              <span>Status</span>
              <span>Last login</span>
              <span>Actions</span>
            </div>
            {users.items.map((user) => (
              <article className="admin-user-grid" key={user.id}>
                <div className="admin-user-identity">
                  <i>{user.fullName.slice(0, 1)}</i>
                  <span>
                    <strong>{user.fullName}</strong>
                    <small>
                      {user.email}
                      <br />/{user.username}
                      {user.whatsAppNumber && (
                        <>
                          <br />
                          WhatsApp: {user.whatsAppNumber}
                        </>
                      )}
                    </small>
                  </span>
                </div>
                <span>{user.role.replaceAll("_", " ")}</span>
                <span className={user.emailVerified ? "verified" : "unverified"}>
                  {user.emailVerified ? "Verified" : "Unverified"}
                </span>
                <span className={`user-status status-${user.status.toLowerCase()}`}>
                  {user.status}
                </span>
                <span>{date(user.lastLoginAt)}</span>
                {user.role === "SUPER_ADMIN" ? (
                  <span>Protected</span>
                ) : (
                  <div className="admin-row-actions">
                    <Link href={`/admin/users/${user.id}`}>Details</Link>
                    <button type="button" onClick={() => void deleteUser(user)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
            {users.items.length === 0 && (
              <div className="admin-empty-state">
                <strong>No matching users</strong>
                <p>Try changing or clearing your filters.</p>
              </div>
            )}
          </div>
          <footer className="admin-table-footer">
            <label>
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setUserPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
            <Pagination page={users} onPage={setUserPage} />
          </footer>
        </section>

        <section className="admin-activity editor-card" id="activity">
          <div className="admin-activity-heading">
            <div className="card-heading">
              <span>Audit trail</span>
              <h2>Recent account activity</h2>
              <p>Create, correct or permanently remove activity records.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivityEditor(null);
                setShowActivityEditor(true);
              }}
            >
              Add activity
            </button>
          </div>
          {showActivityEditor && (
            <form className="activity-editor" onSubmit={saveActivity}>
              <div>
                <label>
                  <span>Action</span>
                  <input
                    name="action"
                    required
                    defaultValue={activityEditor?.action ?? ""}
                    placeholder="ACCOUNT_REVIEWED"
                  />
                </label>
                <label>
                  <span>Target user ID (optional)</span>
                  <input name="targetUserId" defaultValue={activityEditor?.targetUserId ?? ""} />
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  required
                  defaultValue={activityEditor?.description ?? ""}
                />
              </label>
              <div>
                <button type="submit">
                  {activityEditor ? "Save activity changes" : "Create activity"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowActivityEditor(false);
                    setActivityEditor(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {activity.items.length > 0 && (
            <div className="activity-bulk-toolbar">
              <button
                type="button"
                onClick={() =>
                  setSelectedActivities(new Set(activity.items.map((item) => item.id)))
                }
              >
                Select page
              </button>
              <button type="button" onClick={() => setSelectedActivities(new Set())}>
                Clear
              </button>
              <button
                type="button"
                className="danger-action"
                disabled={!selectedActivities.size}
                onClick={() => void deleteActivities(Array.from(selectedActivities))}
              >
                Hard delete selected ({selectedActivities.size})
              </button>
            </div>
          )}
          <div className="activity-list">
            {activity.items.map((item) => (
              <article
                key={item.id}
                className={selectedActivities.has(item.id) ? "is-selected" : ""}
              >
                <label className="activity-select">
                  <input
                    type="checkbox"
                    checked={selectedActivities.has(item.id)}
                    onChange={() => toggleActivity(item.id)}
                  />
                  <span>Select</span>
                </label>
                <div>
                  <strong>{item.action.replaceAll("_", " ")}</strong>
                  <p>{item.description}</p>
                  {item.targetUserId && <small>Target: {item.targetUserId}</small>}
                </div>
                <time>{date(item.createdAt)}</time>
                <div className="activity-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setActivityEditor(item);
                      setShowActivityEditor(true);
                      document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => void deleteActivities([item.id])}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          {activity.items.length === 0 && (
            <div className="admin-empty-state">
              <strong>No activity yet</strong>
            </div>
          )}
          <Pagination page={activity} onPage={setActivityPage} />
        </section>
      </section>
    </main>
  );
}
