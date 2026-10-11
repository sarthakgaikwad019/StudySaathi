"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Clock,
  Trophy,
  Flame,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import type { FocusSession, Task } from "@/lib/types";
import { getFocusSessions, getTasks, getTodayString } from "@/lib/storage";

interface DayData {
  day: string; // Mon, Tue, etc.
  fullDay: string; // Monday
  date: string; // YYYY-MM-DD
  minutes: number;
  hours: number;
  isToday: boolean;
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getStartOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // day: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function InsightsPage() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSessions(getFocusSessions());
    setTasks(getTasks());
    setMounted(true);
  }, []);

  // Compute 7 days of current week (Mon-Sun)
  const { weekData, totalMinutes, totalHours, bestDay, weakestDay, dailyAvgHours, hasAnyData } =
    useMemo(() => {
      if (!mounted) {
        return {
          weekData: [],
          totalMinutes: 0,
          totalHours: 0,
          bestDay: null,
          weakestDay: null,
          dailyAvgHours: 0,
          hasAnyData: false,
        };
      }

      const now = new Date();
      const monday = getStartOfWeekMonday(now);
      const todayStr = getTodayString();

      const days: DayData[] = [];
      let totalMins = 0;

      for (let i = 0; i < 7; i++) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        const dateStr = formatDateString(current);

        const daySessions = sessions.filter((s) => s.date === dateStr);
        const mins = daySessions.reduce((sum, s) => sum + s.duration, 0);
        totalMins += mins;

        days.push({
          day: DAYS_SHORT[i],
          fullDay: DAYS_FULL[i],
          date: dateStr,
          minutes: mins,
          hours: Number((mins / 60).toFixed(1)),
          isToday: dateStr === todayStr,
        });
      }

      const totalH = Number((totalMins / 60).toFixed(1));
      const avgH = Number((totalH / 7).toFixed(1));

      // Find best day
      const sortedByHours = [...days].sort((a, b) => b.minutes - a.minutes);
      const best = sortedByHours[0]?.minutes > 0 ? sortedByHours[0] : null;

      // Find weakest day among elapsed days (up to today)
      const elapsedDays = days.filter((d) => d.date <= todayStr);
      const weakest =
        elapsedDays.length > 0
          ? [...elapsedDays].sort((a, b) => a.minutes - b.minutes)[0]
          : null;

      return {
        weekData: days,
        totalMinutes: totalMins,
        totalHours: totalH,
        bestDay: best,
        weakestDay: weakest,
        dailyAvgHours: avgH,
        hasAnyData: sessions.length > 0 && totalMins > 0,
      };
    }, [sessions, mounted]);

  // Compute category breakdown from linked sessions
  const categoryBreakdown = useMemo(() => {
    if (!mounted) return [];
    const map: Record<string, number> = {};
    const taskMap = new Map(tasks.map((t) => [t.id, t.category]));

    for (const s of sessions) {
      const cat = (s.taskId ? taskMap.get(s.taskId) : null) || "Study";
      map[cat] = (map[cat] || 0) + s.duration;
    }

    return Object.entries(map).map(([category, minutes]) => ({
      category,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
    }));
  }, [sessions, tasks]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Friendly Empty State if no sessions exist
  if (!hasAnyData) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Study Insights
            </h2>
            <p className="text-muted text-sm mt-1">
              Analyze your weekly study trends, streaks, and peak focus hours.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-50 text-accent-500 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                No study sessions recorded yet
              </h3>
              <p className="text-sm text-muted">
                Complete a session in the Focus Timer to unlock your weekly
                study hours bar chart, productivity breakdown, and personalized insights.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/focus"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition shadow-sm"
              >
                Start a Focus Session <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Study Insights
          </h2>
          <p className="text-muted text-sm mt-1">
            Weekly analytics, peak focus days, and smart study recommendations.
          </p>
        </div>

        {/* 3 Small Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Hours This Week */}
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Total Study Time
              </span>
              <span className="p-2 rounded-xl bg-primary-50 text-primary-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              {totalHours} hrs
            </p>
            <p className="text-xs text-muted mt-1">
              {totalMinutes} minutes this week
            </p>
          </div>

          {/* Card 2: Best Day */}
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Best Focus Day
              </span>
              <span className="p-2 rounded-xl bg-accent-50 text-accent-600">
                <Trophy className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              {bestDay ? bestDay.fullDay : "—"}
            </p>
            <p className="text-xs text-muted mt-1">
              {bestDay ? `${bestDay.hours} hrs completed` : "No sessions yet"}
            </p>
          </div>

          {/* Card 3: Average Per Day */}
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Daily Average
              </span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Flame className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              {dailyAvgHours} hrs
            </p>
            <p className="text-xs text-muted mt-1">Across Mon–Sun</p>
          </div>
        </div>

        {/* Dynamic Computed Text Insight Card */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-accent-50 via-primary-50 to-white border border-accent-100 flex items-start gap-3.5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-accent-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Smart Study Insight
            </h4>
            <p className="text-sm text-muted leading-relaxed">
              {weakestDay && bestDay && weakestDay.day !== bestDay.day ? (
                <>
                  Your peak study day this week is{" "}
                  <strong className="text-foreground">
                    {bestDay.fullDay} ({bestDay.hours} hrs)
                  </strong>
                  , while your weakest day is{" "}
                  <strong className="text-accent-700">
                    {weakestDay.fullDay} ({weakestDay.hours} hrs)
                  </strong>
                  . Try scheduling one 25-minute Pomodoro session on{" "}
                  {weakestDay.fullDay} to keep your daily streak alive!
                </>
              ) : (
                <>
                  Solid work! You are keeping a steady study habit this week. Keep
                  hitting your daily focus goals!
                </>
              )}
            </p>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Study Hours (Mon – Sun)
              </h3>
              <p className="text-xs text-muted">
                Daily focus hours logged from completed focus sessions
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-accent-500" /> Study Hours
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  unit="h"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(139, 92, 246, 0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DayData;
                      return (
                        <div className="bg-card border border-border shadow-lg rounded-xl p-3 text-xs">
                          <p className="font-bold text-foreground">
                            {data.fullDay} {data.isToday && "(Today)"}
                          </p>
                          <p className="text-accent-600 font-semibold mt-1">
                            {data.hours} hours ({data.minutes} mins)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown list */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Focus by Subject & Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="p-3 rounded-xl bg-gray-50 border border-border text-center"
                >
                  <span className="text-xs font-medium text-muted">
                    {item.category}
                  </span>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {item.hours}h
                  </p>
                  <span className="text-[10px] text-muted">
                    {item.minutes} mins
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
