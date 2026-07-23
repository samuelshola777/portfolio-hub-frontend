import type { Metadata } from "next";
import "./globals.css";
import "./portfolio-themes.css";
import "./public-accessibility.css";
import "./error-pages.css";
import "./workspace-themes.css";
import "./dashboard-enhancements.css";
import "./form-refresh.css";
import "./toasts.css";
import "./responsive.css";
import "./business.css";
import "./dashboard-responsive-update.css";
import "./admin-production.css";
import { ToastProvider } from "@/components/toast-provider";

export const metadata: Metadata = {
  title: {
    default: "Portfolio — Make your work memorable",
    template: "%s · Portfolio",
  },
  description: "Create an interactive personal portfolio for your work, CV and professional story.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
