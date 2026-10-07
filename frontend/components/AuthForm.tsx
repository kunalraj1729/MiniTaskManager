"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";

type Mode = "login" | "signup";
type Field = "name" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to continue to your tasks.",
    submit: "Sign in",
    busy: "Signing in…",
    switchText: "Don’t have an account?",
    switchLink: "Create one",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start organizing your day in seconds.",
    submit: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
  },
} as const;

const FEATURES = [
  "Prioritize tasks as Low, Medium or High",
  "Due dates with overdue highlights",
  "Instant search and filters",
];

function validate(mode: Mode, v: Record<Field, string>): Errors {
  const e: Errors = {};
  if (mode === "signup") {
    const name = v.name.trim();
    if (!name) e.name = "Name is required.";
    else if (name.length < 2) e.name = "Name must be at least 2 characters.";
    else if (name.length > 100) e.name = "Name must be at most 100 characters.";
  }
  const email = v.email.trim();
  if (!email) e.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) e.email = "Enter a valid email address.";
  if (!v.password) e.password = "Password is required.";
  else if (mode === "signup" && v.password.length < 8) e.password = "Password must be at least 8 characters.";
  else if (v.password.length > 128) e.password = "Password must be at most 128 characters.";
  if (mode === "signup" && v.confirm !== v.password) e.confirm = "Passwords do not match.";
  return e;
}

const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-900";
const inputOk = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-700";
const inputBad = "border-red-500 focus:border-red-500 focus:ring-red-500/30";

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const { signIn } = useAuth();
  // Next.js keeps recently visited pages mounted (hidden), so element ids must be unique per instance.
  const uid = useId();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const email = values.email.trim();
      const res =
        mode === "login"
          ? await api.auth.login({ email, password: values.password })
          : await api.auth.signup({ name: values.name.trim(), email, password: values.password });
      signIn(res); // the AuthGate on this page then redirects to the dashboard
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "An account with this email already exists." });
      } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors as Errors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const field = (id: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label htmlFor={`${uid}-${id}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={`${uid}-${id}`}
          name={id}
          value={values[id]}
          onChange={update(id)}
          aria-invalid={!!errors[id]}
          aria-describedby={`${uid}-${id}-msg`}
          className={`${inputBase} ${errors[id] ? inputBad : inputOk} ${id === "password" ? "pr-16" : ""}`}
          {...props}
        />
        {id === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      <p id={`${uid}-${id}-msg`} className={`mt-1 text-xs ${errors[id] ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
        {errors[id] ?? hint}
      </p>
    </div>
  );

  const passwordType = showPassword ? "text" : "password";

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2 dark:bg-slate-950">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo className="h-9 w-9 !bg-none !bg-white/15 !shadow-none" />
          <span className="text-lg font-semibold">Mini Task Manager</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Organize your day.
            <br />
            Get more done.
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            Capture tasks, set priorities and due dates, and track everything from a single dashboard.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200">Your tasks are private to your account.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="font-semibold">Mini Task Manager</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>

          {formError && (
            <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-3">
            {mode === "signup" &&
              field("name", "Full name", { autoComplete: "name", placeholder: "Jane Doe", maxLength: 100, autoFocus: true })}
            {field("email", "Email", {
              type: "email",
              autoComplete: "email",
              placeholder: "you@example.com",
              maxLength: 254,
              autoFocus: mode === "login",
            })}
            {field(
              "password",
              "Password",
              {
                type: passwordType,
                autoComplete: mode === "login" ? "current-password" : "new-password",
                placeholder: mode === "login" ? "Your password" : "At least 8 characters",
                maxLength: 128,
              },
              mode === "signup" ? "Use at least 8 characters." : undefined,
            )}
            {mode === "signup" &&
              field("confirm", "Confirm password", {
                type: passwordType,
                autoComplete: "new-password",
                placeholder: "Repeat your password",
                maxLength: 128,
              })}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && (
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {submitting ? copy.busy : copy.submit}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {copy.switchText}{" "}
            <Link href={copy.switchHref} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              {copy.switchLink}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
