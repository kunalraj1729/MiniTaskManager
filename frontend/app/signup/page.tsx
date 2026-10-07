import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthGate mode="guest">
      <AuthForm mode="signup" />
    </AuthGate>
  );
}
