"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";

interface Props {
  /** "protected": signed-in users only. "guest": signed-out users only (sign-in / sign-up pages). */
  mode: "protected" | "guest";
  children: React.ReactNode;
}

export function AuthGate({ mode, children }: Props) {
  const { status, error, retry, signOut } = useAuth();
  const router = useRouter();

  const redirectTo =
    mode === "protected" && status === "unauthenticated"
      ? "/login"
      : mode === "guest" && status === "authenticated"
        ? "/"
        : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (status === "error") {
    return (
      <FullPage>
        <div role="alert" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold">We couldn’t restore your session</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={signOut}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
            <button
              onClick={retry}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          </div>
        </div>
      </FullPage>
    );
  }

  if (status === "loading" || redirectTo) {
    return (
      <FullPage>
        <div className="flex flex-col items-center gap-4" role="status" aria-label="Loading">
          <Logo className="h-10 w-10 animate-pulse" />
          <span className="text-sm text-slate-500">Loading…</span>
        </div>
      </FullPage>
    );
  }

  return <>{children}</>;
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">{children}</div>
  );
}
