import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthGate mode="guest">
      <AuthForm mode="login" />
    </AuthGate>
  );
}
