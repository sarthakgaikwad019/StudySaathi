"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  BarChart3,
  Bot,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/focus", label: "Focus Timer", icon: Timer },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              StudySathi
            </h1>
            <p className="text-xs text-muted leading-none">
              Plan. Focus. Grow.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-primary-50 text-primary-700 shadow-sm"
                      : "text-muted hover:bg-gray-50 hover:text-foreground"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-primary-500"
                      : "text-muted group-hover:text-foreground"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom card */}
        <div className="px-4 py-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-100">
          <p className="text-xs font-semibold text-primary-700">
            🎯 Stay focused!
          </p>
          <p className="text-xs text-muted mt-1">
            You&apos;re building great habits. Keep it up!
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              StudySathi
            </h1>
            <p className="text-[10px] text-muted leading-none">
              Plan. Focus. Grow.
            </p>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border flex items-center justify-around py-1.5 px-2 shadow-lg">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary-700 font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary-600" : "text-muted"
                }`}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
