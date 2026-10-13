"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Clock, CheckCircle2, Flame, Target } from "lucide-react";
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
import TiltCard from "@/components/TiltCard";
import ScheduleList from "@/components/ScheduleList";
import QuoteBar from "@/components/QuoteBar";

// ── 3D Dynamic Components (SSR: false) ────────────────────────

const Hero3D = dynamic(() => import("@/components/3d/Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[230px] sm:h-[260px] rounded-2xl bg-gradient-to-r from-primary-50 via-accent-50 to-primary-50 animate-pulse border border-border" />
  ),
});

const Streak3D = dynamic(() => import("@/components/3d/Streak3D"), {
  ssr: false,
  loading: () => <Flame className="w-6 h-6 text-amber-500 animate-pulse" />,
});

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
        {/* 3D Dashboard Hero */}
        <Hero3D
          greeting={getGreeting()}
          dateStr={formatDate()}
          onReset={handleResetAll}
        />

        {/* Stats Grid with 3D TiltCards & 3D Streak Flame */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <TiltCard>
            <StatCard
              icon={Clock}
              label="Study Time Today"
              value={`${focusMinutes} min`}
              accent="blue"
            />
          </TiltCard>
          <TiltCard>
            <StatCard
              icon={CheckCircle2}
              label="Tasks Completed"
              value={`${completedCount}/${totalCount}`}
              accent="green"
            />
          </TiltCard>
          <TiltCard>
            <StatCard
              icon={Flame}
              label="Current Streak"
              value={`${streak.currentStreak} days`}
              subtext={`Best: ${streak.longestStreak} days`}
              accent="orange"
              customIcon={<Streak3D streak={streak.currentStreak} />}
            />
          </TiltCard>
          <TiltCard>
            <StatCard
              icon={Target}
              label="Focus Score"
              value={`${focusScore}%`}
              accent="purple"
            />
          </TiltCard>
        </div>

        {/* Today's Schedule */}
        <ScheduleList tasks={tasks} onToggle={handleToggleTask} />

        {/* Motivational Quote */}
        <QuoteBar />
      </div>
    </div>
  );
}
