export type Priority = "Low" | "Medium" | "High";
export type Status = "Pending" | "Completed";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
}

export interface TaskFilters {
  search: string;
  status: Status | "All";
  priority: Priority | "All";
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const PRIORITIES: Priority[] = ["Low", "Medium", "High"];
export const STATUSES: Status[] = ["Pending", "Completed"];

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

const TOKEN_KEY = "task-manager.token";
const TOKEN_EVENT = "task-manager:token-change";
let memoryToken: string | null = null;

// The token is kept in localStorage so a page refresh keeps the user signed in.
export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },
  set(token: string | null) {
    memoryToken = token;
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (e.g. strict privacy mode): the in-memory token is used instead */
    }
    window.dispatchEvent(new Event(TOKEN_EVENT));
  },
  subscribe(onChange: () => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === null) onChange();
    };
    window.addEventListener("storage", onStorage); // sign-in/out in another tab
    window.addEventListener(TOKEN_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TOKEN_EVENT, onChange);
    };
  },
};

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError("Unable to reach the server. Please check your connection and try again.", 0);
  }

  if (res.ok) {
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  // The server rejected our token (expired or invalid): sign out so the app returns to the sign-in page.
  if (res.status === 401 && token && tokenStore.get() === token) tokenStore.set(null);

  let message = `Request failed (${res.status})`;
  const fieldErrors: Record<string, string> = {};
  try {
    const body = await res.json();
    if (typeof body.detail === "string") message = body.detail;
    for (const e of body.errors ?? []) fieldErrors[e.field] ??= e.message;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(message, res.status, fieldErrors);
}

export const api = {
  auth: {
    signup(input: SignupInput) {
      return request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(input) });
    },
    login(input: LoginInput) {
      return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
    },
    me(signal?: AbortSignal) {
      return request<User>("/api/auth/me", undefined, signal);
    },
  },
  tasks: {
    list(filters: TaskFilters, signal?: AbortSignal) {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.status !== "All") params.set("status", filters.status);
      if (filters.priority !== "All") params.set("priority", filters.priority);
      const qs = params.toString();
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`, undefined, signal);
    },
    create(input: TaskInput) {
      return request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
    },
    update(id: number, input: TaskInput) {
      return request<Task>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(input) });
    },
    complete(id: number) {
      return request<Task>(`/api/tasks/${id}/complete`, { method: "PATCH" });
    },
    remove(id: number) {
      return request<void>(`/api/tasks/${id}`, { method: "DELETE" });
    },
  },
};
