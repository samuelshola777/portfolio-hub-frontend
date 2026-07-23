"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorScreen
          code="500"
          eyebrow="Application error"
          title="The application needs a fresh start."
          message="A critical screen failed to load. Try again, or return to the homepage and continue from there."
          retry={reset}
          reference={error.digest}
        />
      </body>
    </html>
  );
}
