"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import { AdminNavigation } from "@/components/admin-navigation";
import { Pagination } from "@/components/pagination";
import type { AdminIdentity } from "@/lib/admin";
import { emptyPage, type PageData } from "@/lib/business";

type Feedback = {
  id: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminResponse?: string | null;
  createdAt: string;
  respondedAt?: string | null;
};
export function AdminFeedback() {
  const router = useRouter();
  const [admin, setAdmin] = useState({ name: "Administrator", username: "" });
  const [tickets, setTickets] = useState<PageData<Feedback>>(emptyPage());
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<AdminIdentity>("/api/v1/auth/private/me"),
      apiFetch<PageData<Feedback>>(
        `/api/v1/feedback/admin/private?page=${page}&size=20${status === "ALL" ? "" : `&status=${status}`}`,
      ),
    ]).then(([me, feedback]) => {
      if (me.response.status === 401) {
        clearAuth();
        router.replace("/login?session=expired");
        return;
      }
      if (!me.response.ok || me.result.data.role !== "SUPER_ADMIN") {
        router.replace("/dashboard");
        return;
      }
      setAdmin({ name: me.result.data.fullName, username: me.result.data.username });
      if (feedback.response.ok) setTickets(feedback.result.data);
      else setNotice(feedback.result.message);
      setReady(true);
    });
  }, [router, page, status]);
  async function respond(event: FormEvent<HTMLFormElement>, ticket: Feedback) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await apiFetch<Feedback>(`/api/v1/feedback/admin/private/${ticket.id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ response: form.get("response") }),
    });
    if (result.response.ok) {
      setTickets((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === ticket.id ? result.result.data : item)),
      }));
      formElement.reset();
      setNotice("Response sent by email and added to the user's announcements.");
    } else setNotice(result.result.message || "Unable to send response");
  }
  if (!ready)
    return (
      <main className="status-page">
        <section>
          <h1>Loading feedback…</h1>
        </section>
      </main>
    );
  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation name={admin.name} username={admin.username} avatarUrl="" active="feedback" />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Support centre</p>
            <h1>User feedback</h1>
            <span>Read complaints, suggestions and technical issues, then respond directly.</span>
          </div>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All messages</option>
              <option value="OPEN">Open</option>
              <option value="RESPONDED">Responded</option>
            </select>
          </label>
        </header>
        {notice && <p className="dash-notice">{notice}</p>}
        <div className="admin-feedback-list">
          {tickets.items.map((ticket) => (
            <article className="editor-card" key={ticket.id}>
              <header>
                <div>
                  <span>{ticket.category.replaceAll("_", " ")}</span>
                  <h2>{ticket.subject}</h2>
                  <small>
                    {ticket.userName} · {ticket.userEmail}
                  </small>
                </div>
                <b className={`feedback-status status-${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </b>
              </header>
              <p>{ticket.message}</p>
              {ticket.adminResponse ? (
                <blockquote>
                  <strong>Your response</strong>
                  <p>{ticket.adminResponse}</p>
                </blockquote>
              ) : (
                <form onSubmit={(event) => void respond(event, ticket)}>
                  <label>
                    <span>Response to the user</span>
                    <textarea name="response" required minLength={2} />
                  </label>
                  <button type="submit">Send email and announcement</button>
                </form>
              )}
            </article>
          ))}
          {tickets.items.length === 0 && (
            <section className="editor-card">
              <p>No feedback matches this filter.</p>
            </section>
          )}
        </div>
        <Pagination page={tickets} onPage={setPage} />
      </section>
    </main>
  );
}
