"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, Flame, Target, RotateCcw } from "lucide-react";
import type { Task, StreakData } from "@/lib/types";
import {
  initializeStorage,
  resetAllDataToZero,
  getTasks,
  saveTasks,
  getTasksForToday,
  getTodayFocusMinutes,
  computeStreak,
  getFocusScore,
} from "@/lib/storage";
import StatCard from "@/components/StatCard";
import ScheduleList from "@/components/ScheduleList";
import QuoteBar from "@/components/QuoteBar";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [streak, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastActiveDate: "",
    longestStreak: 0,
  });
  const [focusScore, setFocusScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeStorage();
    setTasks(getTasksForToday());
    setFocusMinutes(getTodayFocusMinutes());
    setStreakData(computeStreak());
    setFocusScore(getFocusScore());
    setMounted(true);
  }, []);

  const handleToggleTask = (id: string) => {
    const all = getTasks();
    const updated = all.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
    setTasks(getTasksForToday());
    setFocusScore(getFocusScore());
  };

  const handleResetAll = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Reset all tasks, study focus sessions, and streak counts to 0?"
      )
    ) {
      resetAllDataToZero();
      setTasks([]);
      setFocusMinutes(0);
      setStreakData({ currentStreak: 0, lastActiveDate: "", longestStreak: 0 });
      setFocusScore(0);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Greeting & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {getGreeting()}! 👋
            </h2>
            <p className="text-muted text-sm mt-1">{formatDate()}</p>
          </div>
          <button
            onClick={handleResetAll}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors"
            title="Reset all stats and tasks to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data to 0
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <StatCard
            icon={Clock}
            label="Study Time Today"
            value={`${focusMinutes} min`}
            accent="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Tasks Completed"
            value={`${completedCount}/${totalCount}`}
            accent="green"
          />
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={`${streak.currentStreak} days`}
            subtext={`Best: ${streak.longestStreak} days`}
            accent="orange"
          />
          <StatCard
            icon={Target}
            label="Focus Score"
            value={`${focusScore}%`}
            accent="purple"
          />
        </div>

        {/* Today's Schedule */}
        <ScheduleList tasks={tasks} onToggle={handleToggleTask} />

        {/* Motivational Quote */}
        <QuoteBar />
      </div>
    </div>
  );
}
