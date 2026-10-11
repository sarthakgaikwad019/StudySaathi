export interface Task {
  id: string;
  title: string;
  time: string; // HH:mm format
  category: "Study" | "Assignment" | "Meeting" | "Other";
  completed: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export interface FocusSession {
  id: string;
  duration: number; // minutes
  completedAt: string; // ISO string
  date: string; // YYYY-MM-DD
}

export interface StreakData {
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  longestStreak: number;
}
