"use client";

import type { Priority, Task } from "@/lib/api";

const priorityStyles: Record<Priority, string> = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300",
  High: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300",
};
const priorityBar: Record<Priority, string> = {
  Low: "bg-emerald-400",
  Medium: "bg-amber-400",
  High: "bg-rose-500",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === "Completed") return false;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return task.due_date < todayIso;
}

interface Props {
  task: Task;
  busy: boolean;
  onComplete: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
}

const iconBtn =
  "rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export function TaskCard({ task, busy, onComplete, onEdit, onDelete }: Props) {
  const done = task.status === "Completed";
  const overdue = isOverdue(task);

  return (
    <li
      className={`relative flex gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        busy ? "opacity-60" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${priorityBar[task.priority]}`} aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`break-words font-semibold ${done ? "text-slate-400 line-through" : ""}`}>{task.title}</h3>
        </div>
        {task.description && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-400">
            {task.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${priorityStyles[task.priority]}`}>
            {task.priority} priority
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              done
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {task.status}
          </span>
          {task.due_date && (
            <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-500"}>
              {overdue ? "Overdue · " : "Due "}
              {formatDate(task.due_date)}
            </span>
          )}
          <span className="text-slate-400">Created {new Date(task.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-0.5">
        {!done && (
          <button
            onClick={() => onComplete(task)}
            disabled={busy}
            title="Mark as completed"
            aria-label={`Mark "${task.title}" as completed`}
            className={`${iconBtn} hover:!bg-emerald-50 hover:!text-emerald-600`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </button>
        )}
        <button onClick={() => onEdit(task)} disabled={busy} title="Edit" aria-label={`Edit "${task.title}"`} className={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
        <button
          onClick={() => onDelete(task)}
          disabled={busy}
          title="Delete"
          aria-label={`Delete "${task.title}"`}
          className={`${iconBtn} hover:!bg-red-50 hover:!text-red-600`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
        </button>
      </div>
    </li>
  );
}
