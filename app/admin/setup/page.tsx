import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPortfolioSetup } from "@/components/admin-portfolio-setup";

export const metadata: Metadata = { title: "Assisted portfolio setup" };

export default function AdminSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="status-page">
          <section>
            <h1>Preparing assisted setup…</h1>
          </section>
        </main>
      }
    >
      <AdminPortfolioSetup />
    </Suspense>
  );
}
