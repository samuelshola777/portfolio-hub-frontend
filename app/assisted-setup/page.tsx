import type { Metadata } from "next";
import { AssistedSetupRequest } from "@/components/assisted-setup-request";

export const metadata: Metadata = { title: "Request assisted portfolio setup" };

export default function AssistedSetupPage() {
  return <AssistedSetupRequest />;
}
