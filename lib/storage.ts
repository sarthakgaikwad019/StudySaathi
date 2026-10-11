import { Task, FocusSession, StreakData } from "./types";

const KEYS = {
  tasks: "crazy8s_tasks",
  focusSessions: "crazy8s_focus_sessions",
  streak: "crazy8s_streak",
  seeded: "crazy8s_seeded",
} as const;

// ── Tasks ──────────────────────────────────────────────

export function getTasks(): Task[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.tasks);
  return raw ? JSON.parse(raw) : [];
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
}

// ── Focus Sessions ─────────────────────────────────────

export function getFocusSessions(): FocusSession[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.focusSessions);
  return raw ? JSON.parse(raw) : [];
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  localStorage.setItem(KEYS.focusSessions, JSON.stringify(sessions));
}

// ── Streak ─────────────────────────────────────────────

export function getStreak(): StreakData {
  if (typeof window === "undefined")
    return { currentStreak: 0, lastActiveDate: "", longestStreak: 0 };
  const raw = localStorage.getItem(KEYS.streak);
  return raw
    ? JSON.parse(raw)
    : { currentStreak: 0, lastActiveDate: "", longestStreak: 0 };
}

export function saveStreak(streak: StreakData): void {
  localStorage.setItem(KEYS.streak, JSON.stringify(streak));
}

// ── Helpers ────────────────────────────────────────────

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getTasksForToday(): Task[] {
  const today = getTodayString();
  return getTasks().filter((t) => t.date === today);
}

export function getTodayFocusMinutes(): number {
  const today = getTodayString();
  return getFocusSessions()
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);
}

// ── Seed sample data (runs once) ──────────────────────

export function seedSampleData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.seeded)) return;

  const today = getTodayString();
  const now = new Date().toISOString();

  const sampleTasks: Task[] = [
    {
      id: "seed-1",
      title: "Review Data Structures notes",
      time: "09:00",
      category: "Study",
      completed: true,
      date: today,
      createdAt: now,
    },
    {
      id: "seed-2",
      title: "Submit Math Assignment",
      time: "11:30",
      category: "Assignment",
      completed: false,
      date: today,
      createdAt: now,
    },
    {
      id: "seed-3",
      title: "Organic Chemistry revision",
      time: "14:00",
      category: "Study",
      completed: false,
      date: today,
      createdAt: now,
    },
    {
      id: "seed-4",
      title: "Group project meeting",
      time: "16:30",
      category: "Meeting",
      completed: false,
      date: today,
      createdAt: now,
    },
  ];

  const sampleSessions: FocusSession[] = [
    { id: "fs-1", duration: 25, completedAt: now, date: today },
    { id: "fs-2", duration: 30, completedAt: now, date: today },
  ];

  const sampleStreak: StreakData = {
    currentStreak: 5,
    lastActiveDate: today,
    longestStreak: 12,
  };

  saveTasks(sampleTasks);
  saveFocusSessions(sampleSessions);
  saveStreak(sampleStreak);
  localStorage.setItem(KEYS.seeded, "true");
}
