"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { BillingPayment } from "@/lib/subscription";

function CallbackContent() {
  const search = useSearchParams();
  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");
  const [message, setMessage] = useState("Confirming your payment securely…");

  useEffect(() => {
    const reference = search.get("reference") || search.get("trxref");
    if (!reference) return;
    void apiFetch<BillingPayment>(`/api/v1/billing/private/payments/${reference}/verify`, {
      method: "POST",
    }).then((result) => {
      setMessage(result.result.message);
      setState(result.response.ok && result.result.data.status === "PAID" ? "paid" : "failed");
    });
  }, [search]);

  const hasReference = Boolean(search.get("reference") || search.get("trxref"));
  const displayState = hasReference ? state : "failed";
  const displayMessage = hasReference
    ? message
    : "This payment link does not contain a reference. Please return to billing.";

  return (
    <main className="billing-callback-page">
      <section className="panel">
        <span className={`billing-callback-icon ${displayState}`}>
          {displayState === "paid" ? "✓" : displayState === "failed" ? "!" : "…"}
        </span>
        <p className="eyebrow">Subscription payment</p>
        <h1>
          {displayState === "checking"
            ? "Checking payment"
            : displayState === "paid"
              ? "Payment confirmed"
              : "Payment needs attention"}
        </h1>
        <p>{displayMessage}</p>
        <Link href="/dashboard?tab=Billing">Return to billing →</Link>
      </section>
    </main>
  );
}

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<main className="billing-callback-page">Confirming payment…</main>}>
      <CallbackContent />
    </Suspense>
  );
}
