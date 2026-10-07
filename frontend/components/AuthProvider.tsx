"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ApiError, api, isAbortError, tokenStore, type AuthResponse, type User } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  signIn: (session: AuthResponse) => void;
  signOut: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The token lives in localStorage, so it is unknown (undefined) while rendering on the server.
const getServerToken = () => undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useSyncExternalStore<string | null | undefined>(tokenStore.subscribe, tokenStore.get, getServerToken);
  const [session, setSession] = useState<{ token: string; user: User } | null>(null);
  const [failure, setFailure] = useState<{ token: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionToken = session?.token;

  // A stored token (e.g. after a page refresh) is verified with the API before the app trusts it.
  useEffect(() => {
    if (!token || token === sessionToken) return;
    const controller = new AbortController();
    api.auth
      .me(controller.signal)
      .then((user) => setSession({ token, user }))
      .catch((err) => {
        // A 401 has already cleared the token in the API client, which signs the user out.
        if (isAbortError(err) || (err instanceof ApiError && err.status === 401)) return;
        setFailure({ token, message: err instanceof ApiError ? err.message : "Could not verify your session." });
      });
    return () => controller.abort();
  }, [token, sessionToken, attempt]);

  const signIn = useCallback((res: AuthResponse) => {
    setSession({ token: res.access_token, user: res.user });
    setFailure(null);
    tokenStore.set(res.access_token);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    tokenStore.set(null);
  }, []);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((n) => n + 1);
  }, []);

  let status: AuthStatus;
  if (token === undefined) status = "loading";
  else if (token === null) status = "unauthenticated";
  else if (session?.token === token) status = "authenticated";
  else if (failure?.token === token) status = "error";
  else status = "loading";

  const user = status === "authenticated" ? session!.user : null;
  const error = status === "error" ? failure!.message : null;

  const value = useMemo(
    () => ({ status, user, error, signIn, signOut, retry }),
    [status, user, error, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
