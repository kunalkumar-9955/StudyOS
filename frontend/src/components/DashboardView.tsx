"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  BookOpen,
  AlertTriangle,
  Play,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Flame,
  Sliders,
  Calendar,
  CheckSquare,
  RotateCcw,
} from "lucide-react";
import { ActiveSessionData } from "@/lib/timerEngine";
import { AvailableTimeSettings, AvailableTimeEngine } from "@/lib/availableTimeEngine";
import { BacklogEngine, SubjectWorkload, CalculatedSubjectWorkload } from "@/lib/backlogEngine";
import { DailySessionEngine } from "@/lib/dailySessionEngine";

interface DashboardViewProps {
  activeSession: ActiveSessionData | null;
  onOpenTimerModal: (preselectedSubjectId?: number) => void;
  subjects: any[];
  availableSettings: AvailableTimeSettings;
  onOpenAvailableTimeModal: () => void;
  onNavigateTab: (tab: any) => void;
  analyticsData: any;
  onTriggerReallocation: () => void;
  confirmedPlan: any;
}

export default function DashboardView({
  activeSession,
  onOpenTimerModal,
  subjects,
  availableSettings,
  onOpenAvailableTimeModal,
  onNavigateTab,
  analyticsData,
  onTriggerReallocation,
  confirmedPlan,
}: DashboardViewProps) {
  const [mounted, setMounted] = useState(false);
  const [dateFormatted, setDateFormatted] = useState("Today");

  useEffect(() => {
    const today = new Date();
    setDateFormatted(
      today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
    setMounted(true);
  }, []);

  // 1. Calculate Available Study Time
  const capacity = AvailableTimeEngine.calculateTodayCapacity(availableSettings);

  // 2. Total Study Completed Today
  const todayFocusedMinutes = analyticsData?.today_focused_minutes || 0;
  const todayBreakMinutes = analyticsData?.today_break_minutes || 0;

  // 3. Compute Subject Workloads, separating Original Target, Completed, Unfinished, and Previous Backlog
  const computedSubjects: CalculatedSubjectWorkload[] = subjects.map((s) => {
    const focusedSecs = s.total_focused_study_seconds || 0;
    const completedMins = Math.round(focusedSecs / 60);
    return BacklogEngine.computeSubjectWorkload({
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color || "#10b981",
      priority: s.priority || 2,
      daily_target_minutes: s.daily_target_minutes || 60,
      completed_today_minutes: completedMins,
      previous_backlog_minutes: s.previous_backlog_minutes || 0,
      deadline: s.deadline,
    });
  });

  // Ranked by priority (P1 High -> P2 Medium -> P3 Low)
  const rankedSubjects = [...computedSubjects].sort((a, b) => a.priority - b.priority);

  // Aggregate metrics
  const totalDailyTargetMinutes = computedSubjects.reduce((acc, s) => acc + s.daily_target_minutes, 0);
  const totalUnfinishedToday = computedSubjects.reduce((acc, s) => acc + s.unfinished_target_today, 0);
  const totalPreviousBacklog = computedSubjects.reduce((acc, s) => acc + s.previous_backlog_minutes, 0);
  const totalRemainingWorkload = totalUnfinishedToday + totalPreviousBacklog;

  const targetProgressPercent =
    totalDailyTargetMinutes > 0
      ? Math.min(100, Math.round((todayFocusedMinutes / totalDailyTargetMinutes) * 100))
      : 0;

  // Real remaining capacity after completed study today
  const remainingStudyCapacity = Math.max(0, capacity.netAvailableMinutes - todayFocusedMinutes);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Primary Header: Daily Self-Study Cockpit */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <Flame className="w-4 h-4" />
            <span>DAILY PREPARATION & BACKLOG COCKPIT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            {dateFormatted}
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Focus on completing today's high-priority subject targets and clearing outstanding backlog.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onOpenTimerModal()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {activeSession ? "Resume Focus Session" : "Start Focus Block"}
          </button>
        </div>
      </div>

      {/* 2. Persistent Recoverable Active Session Banner */}
      {activeSession && (
        <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 backdrop-blur-md flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {activeSession.state === "BREAK"
                    ? "On Rest Break"
                    : activeSession.state === "PAUSED"
                    ? "Session Paused — Return to Resume"
                    : "Active Focused Study"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-semibold theme-card theme-border theme-text-primary">
                  {activeSession.subjectName}
                </span>
              </div>
              <p className="text-xs theme-text-secondary mt-0.5">
                Segment {activeSession.currentSegmentIndex + 1} of {activeSession.segments.length} • {activeSession.totalBlockMinutes}m Total Block
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenTimerModal()}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Open Active Timer
          </button>
        </div>
      )}

      {/* 3. Priority Metric Cards: Available Time, Completed Study, Target Progress, Backlog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Available Study Capacity */}
        <div className="glass-panel rounded-xl p-5 theme-border space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              Available Study Time
            </span>
            <button
              onClick={onOpenAvailableTimeModal}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              title="Configure wake/sleep and commitments"
            >
              <Sliders className="w-3.5 h-3.5" /> Adjust
            </button>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black theme-text-primary">
              {Math.floor(capacity.netAvailableMinutes / 60)}h {capacity.netAvailableMinutes % 60}m
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {capacity.isOverridden ? "Manual Override" : "Net Capacity"}
            </span>
          </div>
          <p className="text-[11px] theme-text-muted">
            Remaining study capacity today: <strong className="theme-text-primary">{Math.floor(remainingStudyCapacity / 60)}h {remainingStudyCapacity % 60}m</strong>
          </p>
        </div>

        {/* Metric 2: Completed Focused Study Today */}
        <div className="glass-panel rounded-xl p-5 theme-border space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Study Completed Today
            </span>
            <span>{targetProgressPercent}%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {todayFocusedMinutes}m
            </span>
            <span className="text-xs theme-text-muted">
              Target: {totalDailyTargetMinutes}m
            </span>
          </div>
          <div className="w-full h-2 rounded-full theme-card-subtle overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${targetProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Pending Targets Today */}
        <div className="glass-panel rounded-xl p-5 theme-border space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-500" />
              Unfinished Targets
            </span>
            <span className="text-[11px] theme-text-dim">Today's Remaining</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {totalUnfinishedToday}m
            </span>
            <span className="text-xs theme-text-muted">
              {totalUnfinishedToday === 0 ? "All Met" : "Pending"}
            </span>
          </div>
          <p className="text-[11px] theme-text-muted">
            Regular daily target minutes not yet completed today.
          </p>
        </div>

        {/* Metric 4: Outstanding Backlog Reserve & One-Click Reallocation */}
        <div className="glass-panel rounded-xl p-5 theme-border space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Outstanding Backlog
            </span>
            <button
              onClick={onTriggerReallocation}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              Allocate <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                totalPreviousBacklog > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-500"
              }`}
            >
              {totalPreviousBacklog}m
            </span>
            <span className="text-xs theme-text-muted">
              Total Workload: {totalRemainingWorkload}m
            </span>
          </div>
          <p className="text-[11px] theme-text-muted">
            {totalPreviousBacklog > 0
              ? "Carried-over unfinished study. Click Allocate to schedule."
              : "Zero carried-over backlog!"}
          </p>
        </div>
      </div>

      {/* 4. Main Section: Subjects Ranked by Priority & Today's Study Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Subjects Ranked by Priority and Daily Targets */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-6 theme-border space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base theme-text-primary">
                Daily Subject Targets & Preparation Status
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("subjects")}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              Edit Targets
            </button>
          </div>

          <div className="space-y-3.5">
            {rankedSubjects.map((s) => {
              const pending = DailySessionEngine.getPendingSessionForSubject(s.id);
              const isTargetMet = s.target_progress_percent >= 100;
              return (
              <div
                key={s.id}
                className="p-4 rounded-xl theme-card border theme-border space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-bold text-sm theme-text-primary">{s.name}</span>
                    {s.code && (
                      <span className="text-[11px] theme-text-muted font-mono">{s.code}</span>
                    )}
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        s.priority === 1
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : s.priority === 2
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "theme-card-subtle theme-text-muted theme-border"
                      }`}
                    >
                      Priority {s.priority}
                    </span>
                    {pending && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
                        <RotateCcw className="w-2.5 h-2.5" />
                        Paused ({Math.round(pending.accumulatedStudySeconds / 60)}m done)
                      </span>
                    )}
                    {isTargetMet && !pending && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Target Met
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {pending ? (
                      <button
                        onClick={() => onOpenTimerModal(s.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Resume Session
                      </button>
                    ) : isTargetMet ? (
                      <button
                        onClick={() => onOpenTimerModal(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm border border-emerald-500/30 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Target Completed
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenTimerModal(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Study Block
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full theme-card-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${s.target_progress_percent}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>

                {/* Granular Breakdown separating Target, Completed, Unfinished & Backlog */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg theme-card-subtle theme-border border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Daily Target
                    </span>
                    <strong className="theme-text-primary font-bold">
                      {s.daily_target_minutes}m
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg theme-card-subtle theme-border border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Completed Today
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {s.completed_today_minutes}m
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg theme-card-subtle theme-border border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Unfinished
                    </span>
                    <strong
                      className={
                        s.unfinished_target_today > 0
                          ? "text-sky-600 dark:text-sky-400 font-bold"
                          : "theme-text-muted"
                      }
                    >
                      {s.unfinished_target_today}m
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg theme-card-subtle theme-border border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Prior Backlog
                    </span>
                    <strong
                      className={
                        s.previous_backlog_minutes > 0
                          ? "text-amber-600 dark:text-amber-400 font-bold"
                          : "theme-text-muted"
                      }
                    >
                      {s.previous_backlog_minutes}m
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Right Column (1 Col): Today's Active Study Plan & Backlog Reallocation */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base theme-text-primary">Today's Study Plan</h3>
              </div>
              <button
                onClick={onTriggerReallocation}
                className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Reallocate
              </button>
            </div>

            <p className="text-xs theme-text-muted leading-relaxed">
              Dynamically calculated to fit your <strong>{capacity.netAvailableMinutes}m</strong> capacity by subject priority without exceeding study limits.
            </p>

            {confirmedPlan ? (
              <div className="space-y-2.5">
                {confirmedPlan.allocations?.map((item: any) => (
                  <div
                    key={item.subject_id}
                    className="p-3 rounded-xl theme-card border theme-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold theme-text-primary flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </p>
                      <p className="text-[10px] theme-text-muted mt-0.5">
                        {item.allocation_reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                        {item.total_allocated}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl theme-card-subtle border theme-border text-center space-y-2">
                <Sparkles className="w-6 h-6 text-indigo-500 mx-auto" />
                <p className="font-semibold text-xs theme-text-secondary">
                  Ready to calculate your optimal study allocation?
                </p>
                <button
                  onClick={onTriggerReallocation}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  Generate Plan with Backlog
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t theme-border text-xs theme-text-muted flex items-center justify-between">
            <span>Capacity Limit Protected</span>
            <button
              onClick={() => onNavigateTab("planner")}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Open Full Planner &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
