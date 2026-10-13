"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";
import {
  getTasks,
  saveTasks,
  getFocusSessions,
  saveFocusSessions,
  getTodayString,
  computeStreak,
} from "@/lib/storage";

const DURATIONS = [
  { mins: 1, label: "1 min (Test)" },
  { mins: 25, label: "25 min" },
  { mins: 30, label: "30 min" },
  { mins: 45, label: "45 min" },
];

export default function FocusPage() {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Date.now()-based end time for background-tab accuracy
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const today = getTodayString();
    setTasks(getTasks().filter((t) => t.date === today && !t.completed));
    setMounted(true);
  }, []);

  const totalSeconds = selectedMinutes * 60;

  const completeSession = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(0);
    endTimeRef.current = null;

    // Save session to localStorage
    const sessions = getFocusSessions();
    sessions.push({
      id: crypto.randomUUID(),
      duration: selectedMinutes,
      completedAt: new Date().toISOString(),
      date: getTodayString(),
      taskId: linkedTaskId || undefined,
    });
    saveFocusSessions(sessions);
    computeStreak();

    // If task was linked, mark it completed
    if (linkedTaskId) {
      const allTasks = getTasks();
      const updated = allTasks.map((t) =>
        t.id === linkedTaskId ? { ...t, completed: true } : t
      );
      saveTasks(updated);
      const today = getTodayString();
      setTasks(getTasks().filter((t) => t.date === today && !t.completed));
      setLinkedTaskId("");
    }

    setShowComplete(true);
    setTimeout(() => setShowComplete(false), 4000);
  }, [selectedMinutes, linkedTaskId]);

  // Tick loop — uses setInterval + Date.now() so it stays accurate in background tabs
  useEffect(() => {
    if (!isRunning || !endTimeRef.current) return;

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        completeSession();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, completeSession]);

  function handleStart() {
    if (secondsLeft <= 0) return;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
    endTimeRef.current = null;
  }

  function handleReset() {
    setIsRunning(false);
    endTimeRef.current = null;
    setSecondsLeft(selectedMinutes * 60);
    setShowComplete(false);
  }

  function selectDuration(mins: number) {
    if (isRunning) return;
    setSelectedMinutes(mins);
    setSecondsLeft(mins * 60);
    setShowComplete(false);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1;

  // SVG circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-100 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Focus Timer
          </h2>
          <p className="text-muted text-sm mt-1">
            Stay focused. One session at a time.
          </p>
        </div>

        {/* Duration buttons */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.mins}
              onClick={() => selectDuration(d.mins)}
              disabled={isRunning}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedMinutes === d.mins
                  ? "bg-accent-500 text-white shadow-md shadow-accent-500/25"
                  : "bg-card border border-border text-muted hover:text-foreground hover:border-accent-300 disabled:opacity-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Circular Timer */}
        <div className="flex justify-center">
          <div className="relative w-72 h-72">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
              {/* Background track */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="8"
              />
              {/* Progress arc */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
              <defs>
                <linearGradient
                  id="timerGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-foreground tabular-nums tracking-tight">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
              <span className="text-sm text-muted mt-1">
                {isRunning
                  ? "Focusing..."
                  : secondsLeft === 0
                    ? "Done!"
                    : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={secondsLeft <= 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-500 text-white font-semibold hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-accent-500/25"
            >
              <Play className="w-5 h-5" />
              {secondsLeft < totalSeconds && secondsLeft > 0
                ? "Resume"
                : "Start"}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/25"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
          )}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-muted font-semibold hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>

        {/* Link to task (optional) */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <label
            htmlFor="link-task"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Link to a task{" "}
            <span className="text-muted font-normal">(optional)</span>
          </label>
          <select
            id="link-task"
            value={linkedTaskId}
            onChange={(e) => setLinkedTaskId(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition disabled:opacity-50"
          >
            <option value="">No task linked</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Session complete toast */}
        {showComplete && (
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl px-6 py-4 border border-primary-100 flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
            <CheckCircle2 className="w-6 h-6 text-primary-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Session complete! 🎉
              </p>
              <p className="text-xs text-muted mt-0.5">
                {selectedMinutes} minutes of focused work logged.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
