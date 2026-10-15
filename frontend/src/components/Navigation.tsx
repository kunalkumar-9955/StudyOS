"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Compass,
  FileText,
  BarChart3,
  Calendar,
  Moon,
  Sun,
  Timer,
  Wifi,
  WifiOff,
  User,
  LogOut,
  Flame,
  Menu,
  X,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "planner"
  | "subjects"
  | "resources"
  | "materials"
  | "analytics"
  | "timetable";

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenTimerModal: () => void;
  hasActiveSession: boolean;
  user: any;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navigation({
  currentTab,
  onTabChange,
  onOpenTimerModal,
  hasActiveSession,
  user,
  onOpenAuth,
  onLogout,
}: NavigationProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    // Read saved theme on mount
    const saved = localStorage.getItem("studyos_theme") as "dark" | "light" | null;
    const initialTheme = saved || (document.documentElement.classList.contains("light") ? "light" : "dark");
    setTheme(initialTheme);

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("studyos_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  // Prioritize self-study and backlog management as the primary product
  const primaryNavItems = [
    { id: "dashboard" as NavTab, label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
    { id: "planner" as NavTab, label: "Planner & Backlog", shortLabel: "Planner", icon: CheckSquare },
    { id: "subjects" as NavTab, label: "Subjects & Targets", shortLabel: "Subjects", icon: BookOpen },
    { id: "resources" as NavTab, label: "Approved Resources", shortLabel: "Resources", icon: Compass },
    { id: "materials" as NavTab, label: "Notes & Materials", shortLabel: "Notes", icon: FileText },
    { id: "analytics" as NavTab, label: "Analytics & Trends", shortLabel: "Analytics", icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r theme-border theme-nav backdrop-blur-xl shrink-0 h-screen sticky top-0 z-40 select-none transition-colors duration-200">
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg theme-text-primary tracking-tight flex items-center gap-1.5">
                StudyOS
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  V1
                </span>
              </h1>
              <p className="text-xs theme-text-muted font-medium">Self-Study System</p>
            </div>
          </div>
        </div>

        {/* Start Focus Session Action */}
        <div className="p-4">
          <button
            onClick={onOpenTimerModal}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              hasActiveSession
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-[0.98]"
            }`}
          >
            <Timer className="w-4 h-4" />
            {hasActiveSession ? "Resume Focus Session" : "Start Focus Block"}
          </button>
        </div>

        {/* Primary Self-Study Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "theme-text-muted hover:theme-text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-emerald-500" : "theme-text-muted"}`} />
                {item.label}
              </button>
            );
          })}

          {/* Secondary Timetable Link */}
          <div className="pt-4 mt-4 border-t theme-border">
            <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider theme-text-dim block mb-1">
              Optional Utilities
            </span>
            <button
              onClick={() => onTabChange("timetable")}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === "timetable"
                  ? "bg-sky-500/15 text-sky-500 border border-sky-500/30"
                  : "theme-text-muted hover:theme-text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Class Timetable (Optional)
            </button>
          </div>
        </nav>

        {/* Footer info: Theme toggle & connection */}
        <div className="p-4 border-t theme-border space-y-3 theme-card-subtle">
          {/* Online / Offline status & Theme switcher */}
          <div className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg theme-card border theme-border">
            <span className="flex items-center gap-1.5 theme-text-muted">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              )}
              {isOnline ? "Online" : "Offline (Local DB)"}
            </span>
            <button
              onClick={toggleTheme}
              className="theme-text-muted hover:theme-text-primary p-1.5 rounded-lg border theme-border theme-card transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
              title="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full theme-card border theme-border flex items-center justify-center font-bold text-xs shrink-0 theme-text-primary">
                {user ? user.username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold theme-text-primary truncate">
                  {user ? user.username : "Personal Workspace"}
                </p>
                <p className="text-[11px] theme-text-muted">
                  {user ? "Signed in" : "Local Storage"}
                </p>
              </div>
            </div>
            {user ? (
              <button
                onClick={onLogout}
                className="theme-text-muted hover:text-rose-500 p-1.5 rounded transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-bold px-2 py-1 rounded theme-card border theme-border cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 w-full theme-nav backdrop-blur-md border-b theme-border px-3.5 py-2.5 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg theme-card border theme-border theme-text-muted hover:theme-text-primary cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
            <Timer className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight theme-text-primary">StudyOS</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg theme-card border theme-border theme-text-muted hover:theme-text-primary cursor-pointer"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>
          <button
            onClick={onOpenTimerModal}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer ${
              hasActiveSession
                ? "bg-amber-500 text-slate-950 animate-pulse"
                : "bg-emerald-600 text-white"
            }`}
          >
            <Timer className="w-3 h-3" />
            <span>{hasActiveSession ? "Active" : "Timer"}</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal / Sheet */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[82vw] h-full theme-nav border-r theme-border flex flex-col p-4 shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b theme-border mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm theme-text-primary flex items-center gap-1.5">
                    StudyOS
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      V1
                    </span>
                  </h2>
                  <p className="text-[10px] theme-text-muted">Self-Study System</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg theme-card border theme-border theme-text-muted hover:theme-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onOpenTimerModal();
              }}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mb-4 shadow-sm cursor-pointer ${
                hasActiveSession
                  ? "bg-amber-500 text-slate-950 animate-pulse"
                  : "bg-emerald-600 text-white"
              }`}
            >
              <Timer className="w-4 h-4" />
              {hasActiveSession ? "Resume Focus Session" : "Start Focus Block"}
            </button>

            {/* Nav Links */}
            <div className="space-y-1 flex-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "theme-text-muted hover:theme-text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-emerald-500" : "theme-text-muted"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-3 mt-3 border-t theme-border">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider theme-text-dim block mb-1">
                  Utilities
                </span>
                <button
                  onClick={() => {
                    onTabChange("timetable");
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentTab === "timetable"
                      ? "bg-sky-500/15 text-sky-500 border border-sky-500/30"
                      : "theme-text-muted hover:theme-text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Class Timetable (Optional)</span>
                </button>
              </div>
            </div>

            {/* Bottom info */}
            <div className="pt-3 border-t theme-border space-y-2 mt-auto">
              <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg theme-card border theme-border">
                <span className="flex items-center gap-1.5 theme-text-muted text-[11px]">
                  {isOnline ? (
                    <Wifi className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-amber-500" />
                  )}
                  {isOnline ? "Online" : "Offline DB"}
                </span>
                <button
                  onClick={toggleTheme}
                  className="theme-text-muted hover:theme-text-primary px-2 py-0.5 rounded border theme-border font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {theme === "dark" ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-500" />}
                  <span>{theme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-7 h-7 rounded-full theme-card border theme-border flex items-center justify-center font-bold text-xs shrink-0 theme-text-primary">
                    {user ? user.username.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-xs font-bold theme-text-primary truncate">
                    {user ? user.username : "Personal User"}
                  </p>
                </div>
                {user ? (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="theme-text-muted hover:text-rose-500 p-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="text-xs text-indigo-500 dark:text-indigo-400 font-bold px-2 py-0.5 rounded theme-card border theme-border cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 theme-nav backdrop-blur-md border-t theme-border flex items-center justify-between py-1.5 px-0.5 safe-bottom transition-colors duration-200">
        {primaryNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                active ? "text-emerald-500 font-bold" : "theme-text-muted hover:theme-text-primary"
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${active ? "text-emerald-500" : "theme-text-muted"}`} />
              <span className="leading-tight text-center whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
