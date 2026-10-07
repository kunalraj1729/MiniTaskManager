"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, isAbortError, type Task, type TaskFilters, type TaskInput } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Filters } from "@/components/Filters";
import { Logo } from "@/components/Logo";
import { Modal } from "@/components/Modal";
import { TaskCard } from "@/components/TaskCard";
import { TaskForm } from "@/components/TaskForm";

type Toast = { kind: "success" | "error"; text: string } | null;

const DEFAULT_FILTERS: TaskFilters = { search: "", status: "All", priority: "All" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    api.tasks
      .list({ search: debouncedSearch, status: filters.status, priority: filters.priority }, controller.signal)
      .then((data) => {
        setTasks(data);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setLoadError(err instanceof ApiError ? err.message : "Failed to load tasks.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedSearch, filters.status, filters.priority, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const changeFilters = (next: TaskFilters) => {
    if (next.status !== filters.status || next.priority !== filters.priority) setLoading(true);
    setFilters(next);
  };

  const showError = (err: unknown) =>
    setToast({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong." });

  async function handleSave(input: TaskInput) {
    const wasEditing = editing;
    if (wasEditing) await api.tasks.update(wasEditing.id, input);
    else await api.tasks.create(input);
    setFormOpen(false);
    setEditing(null);
    setToast({ kind: "success", text: wasEditing ? "Task updated." : "Task created." });
    reload();
  }

  async function handleComplete(task: Task) {
    setBusyId(task.id);
    try {
      await api.tasks.complete(task.id);
      setToast({ kind: "success", text: "Task marked as completed." });
      reload();
    } catch (err) {
      showError(err);
      if (err instanceof ApiError && (err.status === 404 || err.status === 409)) reload();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.tasks.remove(deleting.id);
      setToast({ kind: "success", text: "Task deleted." });
      reload();
    } catch (err) {
      showError(err);
      if (err instanceof ApiError && err.status === 404) reload();
    } finally {
      setDeletingBusy(false);
      setDeleting(null);
    }
  }

  const filtered = filters.search || filters.status !== "All" || filters.priority !== "All";
  const name = user?.name ?? "";
  const firstName = name.split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <nav className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="hidden font-semibold text-slate-900 sm:inline dark:text-white">Mini Task Manager</span>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium leading-tight text-slate-900 dark:text-white">{name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              {initials(name)}
            </span>
            <button
              onClick={signOut}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My tasks</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hi {firstName}, plan your day one task at a time.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95"
          >
            <span aria-hidden className="text-lg leading-none">+</span> New task
          </button>
        </header>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white/70 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <Filters filters={filters} onChange={changeFilters} />
        </section>

        <p className="mb-3 text-sm text-slate-500" aria-live="polite">
          {!loading && !loadError && `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}${filtered ? " found" : ""}`}
        </p>

        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <span>{loadError}</span>
            <button onClick={reload} className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading tasks">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            ))}
          </ul>
        ) : (
          !loadError &&
          (tasks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
              <p className="text-lg font-semibold">{filtered ? "No matching tasks" : "No tasks yet"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {filtered ? "Try changing your search or filters." : "Create your first task to get started."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  busy={busyId === t.id}
                  onComplete={handleComplete}
                  onEdit={(task) => {
                    setEditing(task);
                    setFormOpen(true);
                  }}
                  onDelete={setDeleting}
                />
              ))}
            </ul>
          ))
        )}
      </main>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit task" : "New task"}>
        <TaskForm key={editing?.id ?? "new"} task={editing} onSubmit={handleSave} onCancel={() => setFormOpen(false)} />
      </Modal>

      <Modal open={!!deleting} onClose={() => !deletingBusy && setDeleting(null)} title="Confirm deletion">
        <h2 className="text-lg font-semibold">Delete this task?</h2>
        <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-400">
          “{deleting?.title}” will be permanently deleted. This can’t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setDeleting(null)}
            disabled={deletingBusy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deletingBusy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deletingBusy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.kind === "success" ? "bg-slate-900 dark:bg-slate-700" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
