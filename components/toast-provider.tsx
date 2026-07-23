"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastKind } from "@/lib/toast";

type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function receive(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; kind?: ToastKind }>).detail;
      const message = detail?.message?.trim();
      if (!message) return;

      const toast: Toast = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message,
        kind: detail.kind ?? "info",
      };

      setToasts((current) => [...current.slice(-3), toast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 4500);
    }

    window.addEventListener(TOAST_EVENT, receive);
    return () => window.removeEventListener(TOAST_EVENT, receive);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      {children}
      <section className="toast-region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <article className={`app-toast toast-${toast.kind}`} key={toast.id} role="status">
            <span aria-hidden="true">
              {toast.kind === "success" ? "✓" : toast.kind === "error" ? "!" : "i"}
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
