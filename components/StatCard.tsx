import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: "green" | "purple" | "orange" | "blue";
  subtext?: string;
  customIcon?: React.ReactNode;
}

const accentStyles = {
  green: {
    bg: "bg-primary-50",
    icon: "text-primary-500",
    ring: "ring-primary-100",
  },
  purple: {
    bg: "bg-accent-50",
    icon: "text-accent-500",
    ring: "ring-accent-100",
  },
  orange: {
    bg: "bg-amber-50",
    icon: "text-amber-500",
    ring: "ring-amber-100",
  },
  blue: {
    bg: "bg-sky-50",
    icon: "text-sky-500",
    ring: "ring-sky-100",
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  subtext,
  customIcon,
}: StatCardProps) {
  const style = accentStyles[accent];

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl ${style.bg} ring-1 ${style.ring} flex items-center justify-center shrink-0 overflow-hidden`}
        >
          {customIcon ? customIcon : <Icon className={`w-6 h-6 ${style.icon}`} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-muted font-normal">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}
