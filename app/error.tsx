"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({
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
    <ErrorScreen
      code="500"
      eyebrow="Something went wrong"
      title="We could not load this screen."
      message="This may be a temporary connection or server problem. Your saved information is safe—try loading the screen again."
      retry={reset}
      reference={error.digest}
    />
  );
}
