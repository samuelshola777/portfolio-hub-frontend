import { showToast } from "@/lib/toast";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9999").replace(
  /\/$/,
  "",
);

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("portfolio_access_token");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("portfolio_refresh_token");
}

export function saveAuth(accessToken: string, refreshToken: string) {
  window.localStorage.setItem("portfolio_access_token", accessToken);
  window.localStorage.setItem("portfolio_refresh_token", refreshToken);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("portfolio_access_token");
  window.localStorage.removeItem("portfolio_refresh_token");
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/v1/auth/public/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const result = (await response.json()) as ApiResponse<{
          accessToken: string;
          refreshToken: string;
        }>;
        if (!result.data?.accessToken || !result.data?.refreshToken) return false;
        saveAuth(result.data.accessToken, result.data.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const result = (await response.json()) as ApiResponse<T>;
    return {
      ...result,
      message: friendlyApiMessage(result.message, response.status),
    };
  } catch {
    return {
      success: false,
      message: friendlyApiMessage("", response.status),
      data: null as T,
    };
  }
}

export function friendlyApiMessage(message: string | null | undefined, status = 0) {
  const value = String(message ?? "").trim();
  const technical =
    /(?:exception|stack trace|java\.|org\.|hibernate|sqlstate|constraint|cannot deserialize|failed to convert|internal server error|null pointer)/i;
  if (value && !technical.test(value) && value.length < 280) return value;
  if (status === 400 || status === 422)
    return "Please check the information you entered and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "We could not find the information you requested.";
  if (status === 409) return "Those changes conflict with information that is already saved.";
  if (status === 413) return "This file is too large. Please choose a smaller file.";
  if (status === 429) return "Too many attempts were made. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong while completing your request. Please try again.";
  return "We could not complete your request. Please try again.";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
  retry = true,
) {
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: authenticated && (method === "GET" || method === "HEAD") ? "no-store" : init.cache,
    });
    if (response.status === 401 && authenticated && retry && (await refreshSession()))
      return apiFetch<T>(path, init, authenticated, false);
    const result = await parseResponse<T>(response);
    // Do not erase a valid browser session because one feature endpoint returned
    // 401. The page's identity request is the single source of truth for signing
    // the user out; authorization and server errors must remain recoverable.
    if (isMutation)
      showToast(
        result.message || (response.ok ? "Changes saved successfully" : "Unable to save changes"),
        response.ok ? "success" : "error",
      );
    return { response, result };
  } catch {
    if (isMutation)
      showToast("Unable to reach the server. Check your connection and try again.", "error");
    return {
      response: new Response(null, {
        status: 503,
        statusText: "Service Unavailable",
      }),
      result: {
        success: false,
        message: "Unable to reach the server. Check your connection and try again.",
        data: null as T,
      },
    };
  }
}

export function uploadFileWithProgress<T>(
  file: File,
  category: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER",
  usageType: string,
  onProgress: (percent: number) => void,
) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<ApiResponse<T>>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    xhr.open(
      "POST",
      `${API_BASE_URL}/api/v1/utilities/private/file/upload?category=${category}&usageType=${encodeURIComponent(usageType)}`,
    );
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      showToast("Upload failed. Check your connection and try again.", "error");
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText) as ApiResponse<T>;
        const result = {
          ...parsed,
          message: friendlyApiMessage(parsed.message, xhr.status),
        };
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast(result.message || "File uploaded successfully", "success");
          resolve(result);
        } else {
          showToast(result.message || "Upload failed", "error");
          reject(new Error(result.message || "Upload failed"));
        }
      } catch {
        const message = friendlyApiMessage("", xhr.status);
        showToast(message, "error");
        reject(new Error(message));
      }
    };
    xhr.send(body);
  });
  return { promise, cancel: () => xhr.abort() };
}
