import { BarChart3 } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-sky-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Insights</h2>
      <p className="text-sm text-muted mt-2 max-w-xs">
        Coming soon &mdash; weekly study-hour charts and analytics.
      </p>
    </div>
  );
}
