export type ToastKind = "success" | "error" | "info";

export const TOAST_EVENT = "portfolio:toast";

export function showToast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message: message.trim(), kind } }));
}
