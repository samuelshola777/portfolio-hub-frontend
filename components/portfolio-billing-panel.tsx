/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, uploadFileWithProgress } from "@/lib/api";
import type {
  BillingPage,
  BillingPayment,
  PaymentMethod,
  SubscriptionPlan,
  WorkspaceSubscription,
} from "@/lib/subscription";

export function PortfolioBillingPanel({ portfolioId }: { portfolioId: string }) {
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<BillingPayment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("PAYSTACK");
  const [transfer, setTransfer] = useState<BillingPayment | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [subscriptionResult, plansResult, historyResult] = await Promise.all([
      apiFetch<WorkspaceSubscription>(
        `/api/v1/subscriptions/private/workspaces/PORTFOLIO/${portfolioId}`,
      ),
      apiFetch<SubscriptionPlan[]>("/api/v1/subscriptions/public/plans?workspaceType=PORTFOLIO"),
      apiFetch<BillingPage>("/api/v1/billing/private/payments?page=0&size=20"),
    ]);
    if (subscriptionResult.response.ok) setSubscription(subscriptionResult.result.data);
    if (plansResult.response.ok) setPlans(plansResult.result.data ?? []);
    if (historyResult.response.ok) {
      setHistory(
        (historyResult.result.data?.items ?? []).filter(
          (payment) => payment.workspaceId === portfolioId,
        ),
      );
    }
  }, [portfolioId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;
    setBusy(true);
    const result = await apiFetch<BillingPayment>("/api/v1/billing/private/checkout", {
      method: "POST",
      body: JSON.stringify({
        workspaceType: "PORTFOLIO",
        workspaceId: portfolioId,
        planId: selectedPlan,
        method,
      }),
    });
    setBusy(false);
    if (!result.response.ok) {
      setNotice(result.result.message);
      return;
    }
    if (method === "PAYSTACK" && result.result.data.authorizationUrl) {
      window.location.assign(result.result.data.authorizationUrl);
      return;
    }
    setTransfer(result.result.data);
    setNotice("Use the payment reference below when making your transfer.");
    await load();
  }

  async function uploadProof(file?: File) {
    if (!file) return;
    setProgress(1);
    try {
      const upload = uploadFileWithProgress<{ fileUrl: string }>(
        file,
        file.type === "application/pdf" ? "DOCUMENT" : "IMAGE",
        "BILLING_TRANSFER_PROOF",
        setProgress,
      );
      const result = await upload.promise;
      setProofUrl(result.data.fileUrl);
    } catch {
      setNotice("We could not upload that receipt. Please try again.");
    }
  }

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transfer || !proofUrl) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    const result = await apiFetch<BillingPayment>(
      `/api/v1/billing/private/payments/${transfer.reference}/transfer-proof`,
      {
        method: "PUT",
        body: JSON.stringify({
          proofUrl,
          senderName: data.get("senderName"),
          note: data.get("note"),
        }),
      },
    );
    setBusy(false);
    setNotice(result.result.message);
    if (result.response.ok) {
      setTransfer(result.result.data);
      await load();
    }
  }

  async function changeRenewal(action: "cancel" | "resume") {
    const result = await apiFetch<WorkspaceSubscription>(
      `/api/v1/subscriptions/private/workspaces/PORTFOLIO/${portfolioId}/${action}`,
      { method: "PUT" },
    );
    setNotice(result.result.message);
    if (result.response.ok) setSubscription(result.result.data);
  }

  const paidPlans = plans.filter((plan) => !plan.free && plan.active);

  return (
    <div className="portfolio-billing-layout">
      {notice && <p className="dashboard-notice">{notice}</p>}
      <section className="panel billing-current">
        <p className="eyebrow">Current subscription</p>
        <h2>{subscription?.plan.name ?? "Loading plan…"}</h2>
        <div className="billing-status-row">
          <span className={`billing-status ${subscription?.status.toLowerCase()}`}>
            {subscription?.status.replaceAll("_", " ")}
          </span>
          {subscription?.nextBillingAt && (
            <span>
              Paid access until {new Date(subscription.nextBillingAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {subscription?.status === "ACTIVE" && !subscription.plan.free && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void changeRenewal(subscription.cancelAtPeriodEnd ? "resume" : "cancel")}
          >
            {subscription.cancelAtPeriodEnd ? "Keep my subscription" : "Cancel at period end"}
          </button>
        )}
      </section>

      <form className="panel billing-checkout" onSubmit={checkout}>
        <p className="eyebrow">Upgrade or renew</p>
        <h2>Choose how you want to pay</h2>
        <label>
          Subscription plan
          <select
            value={selectedPlan}
            onChange={(event) => setSelectedPlan(event.target.value)}
            required
          >
            <option value="">Choose a paid plan</option>
            {paidPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {plan.currency} {Number(plan.monthlyPrice).toLocaleString()}/month
              </option>
            ))}
          </select>
        </label>
        <div className="billing-methods">
          <label className={method === "PAYSTACK" ? "selected" : ""}>
            <input
              type="radio"
              checked={method === "PAYSTACK"}
              onChange={() => setMethod("PAYSTACK")}
            />
            <strong>Paystack</strong>
            <span>Pay securely using an available Paystack payment channel.</span>
          </label>
          <label className={method === "BANK_TRANSFER" ? "selected" : ""}>
            <input
              type="radio"
              checked={method === "BANK_TRANSFER"}
              onChange={() => setMethod("BANK_TRANSFER")}
            />
            <strong>Bank transfer</strong>
            <span>Transfer manually, then upload your receipt for approval.</span>
          </label>
        </div>
        <button disabled={busy || !selectedPlan}>
          {busy ? "Preparing payment…" : "Continue to payment →"}
        </button>
      </form>

      {transfer?.method === "BANK_TRANSFER" && (
        <section className="panel bank-transfer-card">
          <p className="eyebrow">Bank transfer instructions</p>
          <h2>
            {transfer.currency} {Number(transfer.amount).toLocaleString()}
          </h2>
          <dl>
            <div>
              <dt>Bank</dt>
              <dd>{transfer.bankAccount?.bankName || "Contact support"}</dd>
            </div>
            <div>
              <dt>Account name</dt>
              <dd>{transfer.bankAccount?.accountName || "Not configured"}</dd>
            </div>
            <div>
              <dt>Account number</dt>
              <dd>{transfer.bankAccount?.accountNumber || "Not configured"}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{transfer.reference}</dd>
            </div>
          </dl>
          <p>{transfer.bankAccount?.instructions}</p>
          {transfer.status !== "PENDING_REVIEW" && transfer.status !== "PAID" && (
            <form onSubmit={submitProof}>
              <label>
                Sender or account name
                <input name="senderName" required />
              </label>
              <label>
                Transfer receipt
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => void uploadProof(event.target.files?.[0])}
                  required={!proofUrl}
                />
              </label>
              {progress > 0 && progress < 100 && <span>Uploading receipt… {progress}%</span>}
              <label>
                Optional note
                <textarea name="note" />
              </label>
              <button disabled={busy || !proofUrl}>Submit transfer for review</button>
            </form>
          )}
        </section>
      )}

      <section className="panel billing-history">
        <p className="eyebrow">Payment history</p>
        <h2>Receipts and pending payments</h2>
        {history.map((payment) => (
          <article key={payment.id}>
            <div>
              <strong>{payment.plan.name}</strong>
              <span>{payment.reference}</span>
            </div>
            <div>
              <strong>
                {payment.currency} {Number(payment.amount).toLocaleString()}
              </strong>
              <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
            </div>
            <span className={`billing-status ${payment.status.toLowerCase()}`}>
              {payment.status.replaceAll("_", " ")}
            </span>
          </article>
        ))}
        {!history.length && <span>No payments have been created for this portfolio.</span>}
      </section>
    </div>
  );
}
