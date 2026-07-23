/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken, uploadFileWithProgress } from "@/lib/api";
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
import { AdminNavigation } from "@/components/admin-navigation";
import { Pagination } from "@/components/pagination";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";

type PreviewFile = { file: File; url: string };
type UploadedAttachment = { url: string; name: string; contentType: string; size: number };

function readableSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminAnnouncements() {
  const router = useRouter();
  const [admin, setAdmin] = useState({ name: "Administrator", username: "", avatarUrl: "" });
  const [users, setUsers] = useState<PageData<AdminUser>>(emptyPage());
  const [draftFilters, setDraftFilters] = useState<AdminFilters>(emptyAdminFilters);
  const [filters, setFilters] = useState<AdminFilters>(emptyAdminFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters(draftFilters);
      setPage(1);
      setSelected(new Set());
      setExcluded(new Set());
      setAllMatching(false);
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
    const portfolio = await apiFetch<AdminPortfolio>("/api/v1/portfolios/private/mine");
    setAdmin({
      name: me.result.data.fullName,
      username: me.result.data.username,
      avatarUrl: portfolio.response.ok ? (portfolio.result.data?.avatarUrl ?? "") : "",
    });
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
  }, [loadIdentity, router]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const params = adminUserParams(filters, page, pageSize, false);
    void apiFetch<PageData<AdminUser>>(`/api/v1/admin/private/users?${params}`).then((result) => {
      if (!active) return;
      if (result.response.ok) setUsers(result.result.data);
      else setNotice(result.result.message || "Unable to load recipients");
    });
    return () => {
      active = false;
    };
  }, [filters, page, pageSize, ready]);

  const selectedCount = allMatching ? Math.max(0, users.totalItems - excluded.size) : selected.size;
  const pageIds = users.items.map((user) => user.id);
  const pageSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => (allMatching ? !excluded.has(id) : selected.has(id)));
  const audienceLabel = useMemo(() => {
    const parts = [];
    if (filters.status) parts.push(filters.status.toLowerCase());
    if (filters.verified) parts.push(filters.verified === "true" ? "verified" : "unverified");
    if (filters.role) parts.push(filters.role.toLowerCase().replaceAll("_", " "));
    return parts.length ? parts.join(" · ") : "all eligible users";
  }, [filters]);

  function isSelected(id: string) {
    return allMatching ? !excluded.has(id) : selected.has(id);
  }
  function toggle(id: string) {
    if (allMatching)
      setExcluded((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    else
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
  }
  function togglePage() {
    if (allMatching) {
      setExcluded((current) => {
        const next = new Set(current);
        pageIds.forEach((id) => (pageSelected ? next.add(id) : next.delete(id)));
        return next;
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => (pageSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }
  function selectAll() {
    setAllMatching(true);
    setSelected(new Set());
    setExcluded(new Set());
  }
  function clearSelection() {
    setAllMatching(false);
    setSelected(new Set());
    setExcluded(new Set());
  }
  function clearFilters() {
    setDraftFilters(emptyAdminFilters);
    setFilters(emptyAdminFilters);
    setPage(1);
    clearSelection();
  }

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    if (chosen.length > 5) {
      setNotice("Choose no more than 5 attachments.");
      event.target.value = "";
      return;
    }
    const tooLarge = chosen.find((file) => file.size > 25 * 1024 * 1024);
    if (tooLarge) {
      setNotice(`${tooLarge.name} is larger than the 25 MB limit.`);
      event.target.value = "";
      return;
    }
    files.forEach((item) => URL.revokeObjectURL(item.url));
    setFiles(chosen.map((file) => ({ file, url: URL.createObjectURL(file) })));
  }
  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((item, itemIndex) => {
        if (itemIndex === index) URL.revokeObjectURL(item.url);
        return itemIndex !== index;
      }),
    );
  }

  async function sendAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedCount === 0) {
      setNotice("Select at least one recipient.");
      return;
    }
    const formElement = event.currentTarget;
    setSending(true);
    setNotice("");
    const form = new FormData(formElement);
    const attachments: UploadedAttachment[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index].file;
        const category = file.type.startsWith("image/")
          ? "IMAGE"
          : file.type.startsWith("video/")
            ? "VIDEO"
            : "DOCUMENT";
        const uploaded = await uploadFileWithProgress<{ fileUrl: string }>(
          file,
          category,
          "GENERAL",
          (percent) => setUploadStatus(`Uploading ${index + 1} of ${files.length} · ${percent}%`),
        ).promise;
        attachments.push({
          url: uploaded.data.fileUrl,
          name: file.name,
          contentType: file.type,
          size: file.size,
        });
      }
      setUploadStatus("Delivering your announcement…");
      const payload = {
        userIds: allMatching ? [] : Array.from(selected),
        allMatching,
        excludedUserIds: allMatching ? Array.from(excluded) : [],
        recipientSearch: filters.search || null,
        recipientStatus: filters.status || null,
        recipientVerified: filters.verified === "" ? null : filters.verified === "true",
        recipientRole: filters.role || null,
        subject: form.get("subject"),
        message: form.get("message"),
        attachments,
      };
      const result = await apiFetch<{ announcementId: string; recipientCount: number }>(
        "/api/v1/announcements/admin/private",
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (!result.response.ok) {
        setNotice(result.result.message || "Unable to send announcement");
        return;
      }
      formElement.reset();
      files.forEach((item) => URL.revokeObjectURL(item.url));
      setFiles([]);
      clearSelection();
      setNotice(
        `Announcement delivered to ${result.result.data.recipientCount} user${result.result.data.recipientCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send this announcement");
    } finally {
      setSending(false);
      setUploadStatus("");
    }
  }

  if (!ready)
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Super administration</p>
          <h1>
            {notice
              ? "Announcement studio is temporarily unavailable."
              : "Preparing announcement studio…"}
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

  return (
    <main className="admin-v2 admin-production announcement-admin-page">
      <AdminNavigation {...admin} active="announcements" />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Communication centre</p>
            <h1>Announcements</h1>
            <span>
              Build a precise audience, preview the message and deliver a polished in-app and email
              campaign.
            </span>
          </div>
          <div className="admin-header-actions">
            <WorkspaceThemeToggle />
            <button type="button" onClick={() => window.location.reload()}>
              Refresh recipients
            </button>
          </div>
        </header>
        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}
        <section className="announcement-summary-grid">
          <article>
            <span>Matching audience</span>
            <strong>{users.totalItems}</strong>
            <small>{audienceLabel}</small>
          </article>
          <article>
            <span>Selected recipients</span>
            <strong>{selectedCount}</strong>
            <small>{allMatching ? "All matching users selected" : "Manual selection"}</small>
          </article>
          <article>
            <span>Attachments</span>
            <strong>{files.length}/5</strong>
            <small>Images, videos or documents</small>
          </article>
        </section>

        <div className="announcement-studio">
          <section className="announcement-audience-panel">
            <div className="admin-section-heading">
              <div>
                <p>Step 1</p>
                <h2>Choose your audience</h2>
                <small>Super administrators are always excluded.</small>
              </div>
              {selectedCount > 0 && (
                <button type="button" className="text-button" onClick={clearSelection}>
                  Clear selection
                </button>
              )}
            </div>
            <div className="admin-filter-bar announcement-filter-bar">
              <label className="admin-search-field">
                <span>Search users</span>
                <input
                  value={draftFilters.search}
                  onChange={(event) =>
                    setDraftFilters((value) => ({ ...value, search: event.target.value }))
                  }
                  placeholder="Name, email or username"
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
            <div className="audience-selection-bar">
              <label>
                <input type="checkbox" checked={pageSelected} onChange={togglePage} />
                <span>Select this page</span>
              </label>
              <button
                type="button"
                onClick={selectAll}
                disabled={users.totalItems === 0 || allMatching}
              >
                Select all {users.totalItems} matching users
              </button>
            </div>
            {allMatching && (
              <div className="all-selected-banner">
                <strong>All {selectedCount} matching users are selected.</strong>
                <span>
                  Changing a filter clears this selection so you always know who will receive the
                  message.
                </span>
              </div>
            )}
            <div className="recipient-list">
              {users.items.map((user) => (
                <label
                  className={`recipient-card ${isSelected(user.id) ? "is-selected" : ""}`}
                  key={user.id}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(user.id)}
                    onChange={() => toggle(user.id)}
                  />
                  <i>{user.fullName.slice(0, 1)}</i>
                  <span>
                    <strong>{user.fullName}</strong>
                    <small>
                      {user.email} · @{user.username}
                    </small>
                  </span>
                  <span className="recipient-meta">
                    <b className={`user-status status-${user.status.toLowerCase()}`}>
                      {user.status}
                    </b>
                    <small>{user.emailVerified ? "Verified" : "Unverified"}</small>
                  </span>
                </label>
              ))}
              {users.items.length === 0 && (
                <div className="admin-empty-state">
                  <strong>No recipients found</strong>
                  <p>Try changing or clearing your filters.</p>
                </div>
              )}
            </div>
            <footer className="admin-table-footer">
              <label>
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </label>
              <Pagination page={users} onPage={setPage} />
            </footer>
          </section>

          <form className="announcement-composer" onSubmit={sendAnnouncement}>
            <div className="admin-section-heading">
              <div>
                <p>Step 2</p>
                <h2>Compose message</h2>
                <small>
                  Recipients receive both an in-app announcement and a branded HTML email.
                </small>
              </div>
            </div>
            <label>
              <span>Subject</span>
              <input name="subject" required placeholder="A clear, specific subject line" />
            </label>
            <label>
              <span>Message</span>
              <textarea
                name="message"
                required
                minLength={2}
                placeholder="Write the message exactly as users should receive it…"
              />
            </label>
            <label className="announcement-file-picker">
              <span>Add media or files</span>
              <input
                type="file"
                multiple
                onChange={chooseFiles}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
              <small>
                Up to 5 files · 25 MB each. Images appear inside the email; every file is also
                attached when supported.
              </small>
            </label>
            {files.length > 0 && (
              <div className="announcement-media-preview">
                {files.map((item, index) => (
                  <article key={`${item.file.name}-${index}`}>
                    {item.file.type.startsWith("image/") ? (
                      <img src={item.url} alt="" />
                    ) : item.file.type.startsWith("video/") ? (
                      <video src={item.url} controls preload="metadata" />
                    ) : (
                      <div className="document-preview">
                        <span>DOC</span>
                      </div>
                    )}
                    <div>
                      <strong>{item.file.name}</strong>
                      <small>{readableSize(item.file.size)}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      ×
                    </button>
                  </article>
                ))}
              </div>
            )}
            <section className="email-preview-note">
              <span>EMAIL DELIVERY</span>
              <strong>Production template enabled</strong>
              <p>
                Responsive branded layout, inline image presentation, video/file cards, direct MIME
                attachments and a dashboard call-to-action.
              </p>
            </section>
            {uploadStatus && (
              <p className="announcement-upload-status" role="status">
                {uploadStatus}
              </p>
            )}
            <button
              className="announcement-send-button"
              type="submit"
              disabled={sending || selectedCount === 0}
            >
              <span>
                {sending
                  ? "Sending announcement…"
                  : `Send to ${selectedCount} user${selectedCount === 1 ? "" : "s"}`}
              </span>
              <b>→</b>
            </button>
            <p className="announcement-send-warning">
              Confirm your audience and message before sending. Announcements cannot be recalled
              after delivery.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
