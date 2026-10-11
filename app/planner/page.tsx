"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { Task } from "@/lib/types";
import { getTasks, saveTasks, getTodayString } from "@/lib/storage";

const CATEGORIES: Task["category"][] = [
  "Study",
  "Class",
  "Practical",
  "Assignment",
  "Project",
  "Other",
];

const categoryColors: Record<Task["category"], { bg: string; text: string }> = {
  Study: { bg: "bg-primary-50", text: "text-primary-700" },
  Class: { bg: "bg-sky-50", text: "text-sky-700" },
  Practical: { bg: "bg-teal-50", text: "text-teal-700" },
  Assignment: { bg: "bg-amber-50", text: "text-amber-700" },
  Project: { bg: "bg-rose-50", text: "text-rose-700" },
  Other: { bg: "bg-gray-100", text: "text-gray-700" },
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<Task["category"]>("Study");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCategory, setEditCategory] = useState<Task["category"]>("Study");

  const [today, setToday] = useState("");

  useEffect(() => {
    const todayStr = getTodayString();
    setToday(todayStr);
    const allTasks = getTasks();
    setTasks(allTasks.filter((t) => t.date === todayStr));
    setMounted(true);
  }, []);

  function refreshTasks() {
    const todayStr = getTodayString();
    const allTasks = getTasks();
    setTasks(allTasks.filter((t) => t.date === todayStr));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !time) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      time,
      category,
      completed: false,
      date: today,
      createdAt: new Date().toISOString(),
    };

    const allTasks = getTasks();
    saveTasks([...allTasks, newTask]);
    setTitle("");
    setTime("");
    setCategory("Study");
    refreshTasks();
  }

  function handleToggle(id: string) {
    const allTasks = getTasks();
    const updated = allTasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    saveTasks(updated);
    refreshTasks();
  }

  function handleDelete(id: string) {
    const allTasks = getTasks();
    saveTasks(allTasks.filter((t) => t.id !== id));
    refreshTasks();
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditTime(task.time);
    setEditCategory(task.category);
  }

  function handleSaveEdit() {
    if (!editTitle.trim() || !editTime || !editingId) return;
    const allTasks = getTasks();
    const updated = allTasks.map((t) =>
      t.id === editingId
        ? { ...t, title: editTitle.trim(), time: editTime, category: editCategory }
        : t,
    );
    saveTasks(updated);
    setEditingId(null);
    refreshTasks();
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time));

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Planner
          </h2>
          <p className="text-muted text-sm mt-1">
            Manage today&apos;s tasks and stay on track.
          </p>
        </div>

        {/* Add Task Form */}
        <form
          onSubmit={handleAdd}
          className="bg-card rounded-2xl shadow-sm border border-border p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Add New Task
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div>
              <label
                htmlFor="task-title"
                className="block text-xs font-medium text-muted mb-1"
              >
                Title
              </label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Structures revision"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition"
              />
            </div>
            <div>
              <label
                htmlFor="task-time"
                className="block text-xs font-medium text-muted mb-1"
              >
                Time
              </label>
              <input
                id="task-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition"
              />
            </div>
            <div>
              <label
                htmlFor="task-category"
                className="block text-xs font-medium text-muted mb-1"
              >
                Category
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Task["category"])
                }
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!title.trim() || !time}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        {/* Task List */}
        {sorted.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary-400" />
            </div>
            <p className="text-foreground font-semibold">No tasks yet</p>
            <p className="text-muted text-sm mt-1">
              Add your first task above to get started.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Today&apos;s Tasks
              </h3>
              <span className="text-xs text-muted">
                {tasks.filter((t) => t.completed).length}/{tasks.length} done
              </span>
            </div>
            <ul className="divide-y divide-border">
              {sorted.map((task) => {
                const colors = categoryColors[task.category] || categoryColors.Other;
                const isEditing = editingId === task.id;

                if (isEditing) {
                  return (
                    <li key={task.id} className="px-6 py-4 bg-primary-50/30">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                        />
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(
                              e.target.value as Task["category"],
                            )
                          }
                          className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSaveEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={task.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/50 ${
                      task.completed ? "opacity-60" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.completed
                          ? "bg-primary-500 border-primary-500"
                          : "border-border hover:border-primary-400"
                      }`}
                    >
                      {task.completed && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>

                    {/* Time */}
                    <span className="text-sm text-muted font-mono w-20 shrink-0">
                      {formatTime(task.time)}
                    </span>

                    {/* Title */}
                    <span
                      className={`flex-1 text-sm font-medium ${
                        task.completed
                          ? "line-through text-muted"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}
                    >
                      {task.category}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
