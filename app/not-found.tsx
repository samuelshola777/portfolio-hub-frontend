import { ErrorScreen } from "@/components/error-screen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      eyebrow="Page not found"
      title="This page is not available."
      message="The address may be incorrect, or the portfolio may still be private or unpublished. Check the link and try again."
    />
  );
}
