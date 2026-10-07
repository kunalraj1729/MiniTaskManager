"use client";

import { PRIORITIES, STATUSES, type TaskFilters } from "@/lib/api";

interface Props {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
}

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800";

export function Filters({ filters, onChange }: Props) {
  const active = filters.search || filters.status !== "All" || filters.priority !== "All";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by title…"
          aria-label="Search tasks by title"
          maxLength={100}
          className={`${selectCls} w-full pl-9`}
        />
      </div>
      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as TaskFilters["status"] })}
        className={selectCls}
      >
        <option value="All">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value as TaskFilters["priority"] })}
        className={selectCls}
      >
        <option value="All">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      {active && (
        <button
          onClick={() => onChange({ search: "", status: "All", priority: "All" })}
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Clear
        </button>
      )}
    </div>
  );
}
