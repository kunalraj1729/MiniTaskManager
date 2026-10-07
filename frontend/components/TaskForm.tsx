"use client";

import { useState } from "react";
import { ApiError, PRIORITIES, type Priority, type Task, type TaskInput } from "@/lib/api";

interface Props {
  task: Task | null;
  onSubmit: (input: TaskInput) => Promise<void>;
  onCancel: () => void;
}

const inputCls =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800";
const ok = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-slate-600";
const bad = "border-red-500 focus:border-red-500 focus:ring-red-500/30";

function validate(title: string, dueDate: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const t = title.trim();
  if (!t) errors.title = "Title is required.";
  else if (t.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (t.length > 100) errors.title = "Title must be at most 100 characters.";
  if (dueDate && Number.isNaN(Date.parse(dueDate))) errors.due_date = "Enter a valid date.";
  return errors;
}

export function TaskForm({ task, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "Medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(title, dueDate);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(Object.keys(err.fieldErrors).length ? null : err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{task ? "Edit task" : "New task"}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {task ? "Update the details below." : "Add something to your list."}
        </p>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Prepare weekly report"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-err" : undefined}
          className={`${inputCls} ${errors.title ? bad : ok}`}
        />
        <div className="mt-1 flex justify-between text-xs">
          <span id="title-err" className="text-red-600 dark:text-red-400">
            {errors.title}
          </span>
          <span className="text-slate-400">{title.trim().length}/100</span>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="Add more detail…"
          className={`${inputCls} ${errors.description ? bad : ok} resize-y`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">
            Priority <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {PRIORITIES.map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-md py-1.5 text-center text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 ${
                  priority === p
                    ? "bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-indigo-300"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="sr-only"
                />
                {p}
              </label>
            ))}
          </div>
          {errors.priority && <p className="mt-1 text-xs text-red-600">{errors.priority}</p>}
        </fieldset>

        <div>
          <label htmlFor="due" className="mb-1 block text-sm font-medium">
            Due date <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${inputCls} ${errors.due_date ? bad : ok}`}
          />
          {errors.due_date && <p className="mt-1 text-xs text-red-600">{errors.due_date}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : task ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}
