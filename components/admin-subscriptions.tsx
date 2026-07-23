/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNavigation } from "@/components/admin-navigation";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";
import { apiFetch, clearAuth, getAccessToken } from "@/lib/api";
import type { EntitlementCode, SubscriptionPlan, WorkspaceType } from "@/lib/subscription";

type Admin = { fullName: string; username: string; role: string };

const entitlementFields: Array<{
  code: EntitlementCode;
  label: string;
  type: "number" | "boolean";
  initial: string;
}> = [
  { code: "PAGES", label: "Pages", type: "number", initial: "1" },
  { code: "SECTIONS", label: "Sections", type: "number", initial: "8" },
  { code: "PRODUCTS", label: "Products", type: "number", initial: "5" },
  { code: "MUSIC_TRACKS", label: "Music tracks", type: "number", initial: "3" },
  { code: "TEAM_MEMBERS", label: "Team members", type: "number", initial: "1" },
  { code: "STORAGE_MB", label: "Storage in MB", type: "number", initial: "200" },
  { code: "EMAIL_TEMPLATES", label: "Email templates", type: "number", initial: "1" },
  { code: "MONTHLY_EMAILS", label: "Monthly emails", type: "number", initial: "100" },
  { code: "VIDEO_BACKGROUNDS", label: "Video backgrounds", type: "boolean", initial: "false" },
  { code: "CUSTOM_DOMAIN", label: "Custom domain", type: "boolean", initial: "false" },
  { code: "ADVANCED_ANIMATIONS", label: "Advanced animations", type: "boolean", initial: "false" },
  { code: "REMOVE_BRANDING", label: "Remove platform branding", type: "boolean", initial: "false" },
  { code: "CART_ORDERS", label: "Cart orders", type: "boolean", initial: "true" },
  { code: "WHATSAPP_ORDERS", label: "WhatsApp orders", type: "boolean", initial: "true" },
];

export function AdminSubscriptions() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<SubscriptionPlan[]>("/api/v1/admin/subscriptions/plans");
    if (result.response.ok) setPlans(result.result.data ?? []);
    else setNotice(result.result.message);
  }, []);

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

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const free = form.get("free") === "on";
    const entitlements = entitlementFields.map((field) => ({
      code: field.code,
      value:
        field.type === "boolean"
          ? form.get(field.code) === "on"
            ? "true"
            : "false"
          : String(form.get(field.code) ?? field.initial),
    }));
    const result = await apiFetch<SubscriptionPlan>("/api/v1/admin/subscriptions/plans", {
      method: "POST",
      body: JSON.stringify({
        code: form.get("code"),
        name: form.get("name"),
        description: form.get("description"),
        workspaceType: form.get("workspaceType") as WorkspaceType,
        monthlyPrice: free ? 0 : Number(form.get("monthlyPrice")),
        currency: form.get("currency"),
        free,
        active: true,
        publicVisible: form.get("publicVisible") === "on",
        sortOrder: Number(form.get("sortOrder")),
        entitlements,
      }),
    });
    setNotice(result.result.message);
    if (result.response.ok) {
      formElement.reset();
      await load();
    }
    setBusy(false);
  }

  async function remove(plan: SubscriptionPlan) {
    if (!window.confirm(`Delete or archive ${plan.name}?`)) return;
    const result = await apiFetch<void>(`/api/v1/admin/subscriptions/plans/${plan.id}`, {
      method: "DELETE",
    });
    setNotice(result.result.message);
    if (result.response.ok) await load();
  }

  if (!admin)
    return (
      <main className="status-page">
        <h1>Preparing subscription management…</h1>
      </main>
    );

  return (
    <main className="admin-v2 admin-production">
      <AdminNavigation
        name={admin.fullName}
        username={admin.username}
        avatarUrl=""
        active="subscriptions"
      />
      <section>
        <header className="admin-page-header">
          <div>
            <p>Revenue and access</p>
            <h1>Subscription plans</h1>
            <span>Create as many portfolio or business plans as the platform needs.</span>
          </div>
          <WorkspaceThemeToggle />
        </header>
        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}
        <section className="subscription-admin-grid">
          <form className="editor-card subscription-plan-form" onSubmit={create}>
            <div className="card-heading">
              <span>New plan</span>
              <h2>Plan identity</h2>
            </div>
            <div className="field-grid">
              <label>
                Plan name
                <input name="name" required />
              </label>
              <label>
                Permanent code
                <input name="code" required placeholder="BUSINESS_PRO" />
              </label>
              <label>
                Workspace
                <select name="workspaceType" defaultValue="BUSINESS">
                  <option value="BUSINESS">Business</option>
                  <option value="PORTFOLIO">Portfolio</option>
                </select>
              </label>
              <label>
                Currency
                <input name="currency" defaultValue="NGN" required />
              </label>
              <label>
                Monthly price
                <input name="monthlyPrice" type="number" min="0" step="0.01" defaultValue="0" />
              </label>
              <label>
                Display order
                <input name="sortOrder" type="number" min="0" defaultValue="0" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" />
            </label>
            <div className="subscription-switches">
              <label>
                <input type="checkbox" name="free" /> Permanent free plan
              </label>
              <label>
                <input type="checkbox" name="publicVisible" defaultChecked /> Show publicly
              </label>
            </div>
            <div className="card-heading">
              <span>Entitlements</span>
              <h2>Features and limits</h2>
            </div>
            <p>Use -1 for an unlimited numeric allowance.</p>
            <div className="entitlement-grid">
              {entitlementFields.map((field) => (
                <label key={field.code}>
                  {field.type === "boolean" ? (
                    <>
                      <input
                        type="checkbox"
                        name={field.code}
                        defaultChecked={field.initial === "true"}
                      />{" "}
                      {field.label}
                    </>
                  ) : (
                    <>
                      {field.label}
                      <input
                        type="number"
                        name={field.code}
                        min="-1"
                        defaultValue={field.initial}
                        required
                      />
                    </>
                  )}
                </label>
              ))}
            </div>
            <button disabled={busy}>{busy ? "Creating…" : "Create subscription plan"}</button>
          </form>
          <section className="subscription-plan-list">
            {plans.map((plan) => (
              <article className="editor-card" key={plan.id}>
                <div>
                  <span>{plan.workspaceType}</span>
                  <strong>{plan.name}</strong>
                </div>
                <p>{plan.description}</p>
                <h3>
                  {plan.free
                    ? "Free"
                    : `${plan.currency} ${Number(plan.monthlyPrice).toLocaleString()} / month`}
                </h3>
                <small>
                  {plan.entitlements.length} configured entitlements ·{" "}
                  {plan.active ? "Active" : "Archived"}
                </small>
                <button type="button" onClick={() => void remove(plan)}>
                  {plan.active ? "Delete or archive" : "Remove"}
                </button>
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}
