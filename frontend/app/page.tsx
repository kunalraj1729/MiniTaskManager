import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "My tasks" };

export default function Home() {
  return (
    <AuthGate mode="protected">
      <Dashboard />
    </AuthGate>
  );
}
