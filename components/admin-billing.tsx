"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNavigation } from "@/components/admin-navigation";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import type { BillingPage, BillingPayment, PaymentStatus } from "@/lib/subscription";

type Admin = { fullName: string; username: string; role: string };
const filters: Array<PaymentStatus | "ALL"> = [
  "PENDING_REVIEW",
  "ALL",
  "PAID",
  "REJECTED",
  "FAILED",
  "EXPIRED",
];

export function AdminBilling() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [payments, setPayments] = useState<BillingPage | null>(null);
  const [status, setStatus] = useState<PaymentStatus | "ALL">("PENDING_REVIEW");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status !== "ALL") query.set("status", status);
    const result = await apiFetch<BillingPage>(`/api/v1/admin/billing/payments?${query}`);
    if (result.response.ok) setPayments(result.result.data);
    else setNotice(result.result.message);
  }, [page, status]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void apiFetch<Admin>("/api/v1/auth/private/me").then((result) => {
      if (!result.response.ok || result.result.data.role !== "SUPER_ADMIN") {
        clearAuth();
        router.replace("/login");
        return;
      }
      setAdmin(result.result.data);
      void load();
    });
  }, [load, router]);

  async function review(payment: BillingPayment, approve: boolean) {
    const note = window.prompt(
      approve ? "Optional approval note" : "Why is this transfer being rejected?",
      "",
    );
    if (note === null) return;
    const result = await apiFetch<BillingPayment>(
      `/api/v1/admin/billing/payments/${payment.reference}/review`,
      { method: "PUT", body: JSON.stringify({ approve, note }) },
    );
    setNotice(result.result.message);
    if (result.response.ok) await load();
  }

  if (!admin)
    return (
      <main className="status-page">
        <h1>Preparing payment management…</h1>
      </main>
    );

  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation
        name={admin.fullName}
        username={admin.username}
        avatarUrl=""
        active="billing"
      />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Revenue and access</p>
            <h1>Payments and transfers</h1>
            <span>Review bank receipts and monitor subscription payments.</span>
          </div>
          <WorkspaceThemeToggle />
        </header>
        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}
        <nav className="billing-filter" aria-label="Payment status">
          {filters.map((value) => (
            <button
              type="button"
              key={value}
              className={status === value ? "selected" : ""}
              onClick={() => {
                setStatus(value);
                setPage(0);
              }}
            >
              {value.replaceAll("_", " ")}
            </button>
          ))}
        </nav>
        <section className="admin-payment-list">
          {payments?.items.map((payment) => (
            <article className="editor-card" key={payment.id}>
              <div>
                <span>{payment.method.replaceAll("_", " ")}</span>
                <h2>{payment.plan.name}</h2>
                <p>
                  {payment.reference} · {payment.workspaceType}
                </p>
              </div>
              <div>
                <strong>
                  {payment.currency} {Number(payment.amount).toLocaleString()}
                </strong>
                <span>{payment.transferSenderName || "Paystack checkout"}</span>
              </div>
              <span className={`billing-status ${payment.status.toLowerCase()}`}>
                {payment.status.replaceAll("_", " ")}
              </span>
              <div className="payment-review-actions">
                {payment.transferProofUrl && (
                  <a href={payment.transferProofUrl} target="_blank" rel="noreferrer">
                    View receipt ↗
                  </a>
                )}
                {payment.status === "PENDING_REVIEW" && (
                  <>
                    <button onClick={() => void review(payment, true)}>Approve</button>
                    <button className="danger" onClick={() => void review(payment, false)}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {!payments?.items.length && <p className="editor-card">No payments match this filter.</p>}
        </section>
        {payments && payments.totalPages > 1 && (
          <footer className="billing-pagination">
            <button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              ← Previous
            </button>
            <span>
              Page {page + 1} of {payments.totalPages}
            </span>
            <button
              disabled={page + 1 >= payments.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next →
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}
