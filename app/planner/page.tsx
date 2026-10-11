import { CalendarDays } from "lucide-react";

export default function PlannerPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <CalendarDays className="w-8 h-8 text-primary-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Planner</h2>
      <p className="text-sm text-muted mt-2 max-w-xs">
        Coming soon &mdash; add, edit, and manage your tasks and schedule.
      </p>
    </div>
  );
}
