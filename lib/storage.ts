import { Task, FocusSession, StreakData } from "./types";

const KEYS = {
  tasks: "crazy8s_tasks",
  focusSessions: "crazy8s_focus_sessions",
  streak: "crazy8s_streak",
  seeded: "crazy8s_seeded_v2",
  cleanZero: "crazy8s_clean_zero_v1",
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

// ── Streak (raw read/write) ────────────────────────────

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

// ── Date helpers (local timezone) ──────────────────────

export function getTodayString(): string {
  return dateToString(new Date());
}

function dateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Task helpers ───────────────────────────────────────

export function getTasksForToday(): Task[] {
  const today = getTodayString();
  return getTasks().filter((t) => t.date === today);
}

// ── Focus helpers ──────────────────────────────────────

export function getTodayFocusMinutes(): number {
  const today = getTodayString();
  return getFocusSessions()
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);
}

/** Focus score: min(100, round(todayMinutes / 120 * 100)) */
export function getFocusScore(): number {
  const minutes = getTodayFocusMinutes();
  return Math.min(100, Math.round((minutes / 120) * 100));
}

// ── Computed streak ────────────────────────────────────
// A day counts if at least 1 focus session was completed.
// Current streak = consecutive active days ending today (or yesterday).

export function computeStreak(): StreakData {
  const sessions = getFocusSessions();
  const stored = getStreak();

  if (sessions.length === 0) {
    return {
      currentStreak: 0,
      lastActiveDate: "",
      longestStreak: stored.longestStreak || 0,
    };
  }

  // Build set of dates with ≥1 completed session
  const activeDays = new Set(sessions.map((s) => s.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(today);

  // If today has no session yet, start checking from yesterday
  if (!activeDays.has(dateToString(d))) {
    d.setDate(d.getDate() - 1);
  }

  // Count consecutive active days walking backwards
  let currentStreak = 0;
  while (activeDays.has(dateToString(d))) {
    currentStreak++;
    d.setDate(d.getDate() - 1);
  }

  const longestStreak = Math.max(currentStreak, stored.longestStreak || 0);

  const result: StreakData = {
    currentStreak,
    lastActiveDate: getTodayString(),
    longestStreak,
  };

  saveStreak(result);
  return result;
}

// ── Reset all values to zero for clean real usage ───────

export function resetAllDataToZero(): void {
  if (typeof window === "undefined") return;
  saveTasks([]);
  saveFocusSessions([]);
  saveStreak({ currentStreak: 0, lastActiveDate: "", longestStreak: 0 });
  localStorage.removeItem("crazy8s_assistant_history");
  localStorage.setItem(KEYS.cleanZero, "true");
}

// ── Storage initialization (ensures clean zero state) ───

export function initializeStorage(): void {
  if (typeof window === "undefined") return;
  const isClean = localStorage.getItem(KEYS.cleanZero);
  if (!isClean) {
    resetAllDataToZero();
  }
}

// Backward-compatible alias
export function seedSampleData(): void {
  initializeStorage();
}
