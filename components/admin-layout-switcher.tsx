"use client";

import { useEffect, useState } from "react";

type AdminLayout = "left" | "top" | "right";

const STORAGE_KEY = "portfolio-admin-layout";
const layouts: Array<{ value: AdminLayout; label: string }> = [
  { value: "left", label: "Left" },
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
];

function initialLayout(): AdminLayout {
  if (typeof window === "undefined") return "left";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "top" || saved === "right" ? saved : "left";
}

export function AdminLayoutSwitcher() {
  const [layout, setLayout] = useState<AdminLayout>(initialLayout);

  useEffect(() => {
    document.documentElement.dataset.adminLayout = layout;
    window.localStorage.setItem(STORAGE_KEY, layout);
  }, [layout]);

  return (
    <div
      className="admin-layout-switcher"
      role="group"
      aria-label="Administration layout"
      suppressHydrationWarning
    >
      <span className="admin-layout-label">Layout</span>
      {layouts.map((option) => (
        <button
          key={option.value}
          type="button"
          className={layout === option.value ? "is-active" : ""}
          onClick={() => setLayout(option.value)}
          aria-pressed={layout === option.value}
          suppressHydrationWarning
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
