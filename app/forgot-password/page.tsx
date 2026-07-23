import { AuthShell } from "@/components/auth-shell";
import { PasswordResetForm } from "@/components/password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <PasswordResetForm />
    </AuthShell>
  );
}
