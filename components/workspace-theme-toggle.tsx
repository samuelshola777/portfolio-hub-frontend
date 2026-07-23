"use client";

import { useEffect, useState } from "react";

type WorkspaceTheme = "light" | "dark";

const STORAGE_KEY = "portfolio-workspace-theme";

function initialTheme(): WorkspaceTheme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function WorkspaceThemeToggle() {
  const [theme, setTheme] = useState<WorkspaceTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.workspaceTheme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="workspace-theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch workspace to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      suppressHydrationWarning
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      <strong suppressHydrationWarning>{theme === "dark" ? "Light mode" : "Dark mode"}</strong>
    </button>
  );
}
