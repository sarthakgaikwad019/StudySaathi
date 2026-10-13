import Link from "next/link";
import type { Task } from "@/lib/types";
import {
  Check,
  Circle,
  BookOpen,
  FileText,
  GraduationCap,
  FlaskConical,
  FolderKanban,
  HelpCircle,
  CalendarDays,
  Plus,
} from "lucide-react";

interface ScheduleListProps {
  tasks: Task[];
  onToggle?: (id: string) => void;
}

const categoryConfig: Record<
  Task["category"],
  { color: string; bg: string; icon: typeof BookOpen }
> = {
  Study: { color: "text-primary-700", bg: "bg-primary-50", icon: BookOpen },
  Class: { color: "text-sky-700", bg: "bg-sky-50", icon: GraduationCap },
  Practical: { color: "text-teal-700", bg: "bg-teal-50", icon: FlaskConical },
  Assignment: { color: "text-amber-700", bg: "bg-amber-50", icon: FileText },
  Project: { color: "text-rose-700", bg: "bg-rose-50", icon: FolderKanban },
  Other: { color: "text-gray-700", bg: "bg-gray-100", icon: HelpCircle },
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function ScheduleList({ tasks, onToggle }: ScheduleListProps) {
  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time));

  if (sorted.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <p className="text-foreground font-semibold text-sm">
            No tasks scheduled for today
          </p>
          <p className="text-muted text-xs mt-0.5">
            Plan your lectures, revision topics, or assignments to stay organized.
          </p>
        </div>
        <div className="pt-1">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Task
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Today&apos;s Schedule
        </h3>
        <Link
          href="/planner"
          className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
        >
          Manage in Planner &rarr;
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {sorted.map((task) => {
          const config = categoryConfig[task.category] || categoryConfig.Other;
          const CategoryIcon = config.icon;
          return (
            <li
              key={task.id}
              className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/50 ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              {/* Status indicator */}
              <button
                onClick={() => onToggle?.(task.id)}
                disabled={!onToggle}
                className="shrink-0 group focus:outline-none"
                title={task.completed ? "Mark incomplete" : "Mark complete"}
              >
                {task.completed ? (
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center transition-transform group-hover:scale-105">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <Circle className="w-6 h-6 text-border group-hover:text-primary-500 transition-colors" />
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
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${config.bg} ${config.color}`}
              >
                <CategoryIcon className="w-3 h-3" />
                {task.category}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
