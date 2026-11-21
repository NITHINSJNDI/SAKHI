import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginScreen() {
  return (
    <AuthShell>
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
