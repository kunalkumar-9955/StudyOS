"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Flame,
  AlertTriangle,
  Play,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { BacklogEngine } from "@/lib/backlogEngine";
import { DailySessionEngine } from "@/lib/dailySessionEngine";

interface SubjectsModuleProps {
  subjects: any[];
  onAddSubject: (subject: any) => void;
  onUpdateSubject: (subject: any) => void;
  onDeleteSubject: (id: number) => void;
  onStartSessionForSubject: (subjectId: number, mins: number) => void;
}

export default function SubjectsModule({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onStartSessionForSubject,
}: SubjectsModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#10b981");
  const [dailyTarget, setDailyTarget] = useState(60);
  const [priority, setPriority] = useState(1);
  const [backlogMinutes, setBacklogMinutes] = useState(0);

  const colors = [
    "#6366f1", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#0ea5e9", // Sky
    "#ec4899", // Pink
    "#8b5cf6", // Purple
    "#14b8a6", // Teal
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      const existing = subjects.find((s) => s.id === editingId);
      if (existing) {
        onUpdateSubject({
          ...existing,
          name: name.trim(),
          code: code.trim(),
          color,
          daily_target_minutes: dailyTarget,
          priority,
          previous_backlog_minutes: backlogMinutes,
        });
      }
      setEditingId(null);
    } else {
      onAddSubject({
        id: Date.now(),
        name: name.trim(),
        code: code.trim(),
        color,
        daily_target_minutes: dailyTarget,
        priority,
        completed_today_minutes: 0,
        previous_backlog_minutes: backlogMinutes,
        total_focused_study_seconds: 0,
      });
    }

    setName("");
    setCode("");
    setBacklogMinutes(0);
    setIsAdding(false);
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name);
    setCode(s.code || "");
    setColor(s.color || "#10b981");
    setDailyTarget(s.daily_target_minutes || 60);
    setPriority(s.priority || 1);
    setBacklogMinutes(s.previous_backlog_minutes || 0);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Module Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>CORE CURRICULUM & DAILY TARGETS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Subjects & Daily Targets
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Configure daily targets, priorities, and carried-over backlogs. Target minutes are kept separate from backlog obligations.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setName("");
            setCode("");
            setDailyTarget(60);
            setBacklogMinutes(0);
            setIsAdding(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="glass-panel-elevated rounded-2xl p-4 sm:p-6 theme-border space-y-4 max-w-xl"
        >
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="font-bold text-sm theme-text-primary">
              {editingId ? "Edit Subject Targets" : "Create New Subject"}
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="theme-text-muted hover:theme-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Subject Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Python Systems or DSA"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Code / Tag (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS-301"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Daily Target (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="360"
                step="15"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Outstanding Backlog (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="600"
                step="15"
                value={backlogMinutes}
                onChange={(e) => setBacklogMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              >
                <option value={1}>High Priority (P1)</option>
                <option value={2}>Medium Priority (P2)</option>
                <option value={3}>Low Priority (P3)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-2">
                Color Tag
              </label>
              <div className="flex items-center flex-wrap gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      color === c ? "scale-125 ring-2 ring-emerald-500" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              {editingId ? "Update Subject" : "Save Subject"}
            </button>
          </div>
        </form>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => {
          const focusedSecs = s.total_focused_study_seconds || 0;
          const completedMins = Math.round(focusedSecs / 60);
          const workload = BacklogEngine.computeSubjectWorkload({
            id: s.id,
            name: s.name,
            code: s.code,
            color: s.color || "#10b981",
            priority: s.priority || 2,
            daily_target_minutes: s.daily_target_minutes || 60,
            completed_today_minutes: completedMins,
            previous_backlog_minutes: s.previous_backlog_minutes || 0,
          });

          return (
            <div
              key={s.id}
              className="glass-panel rounded-2xl p-5 theme-border space-y-4 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || "#10b981" }}
                    />
                    <div>
                      <h3 className="font-bold text-base theme-text-primary">{s.name}</h3>
                      {s.code && (
                        <span className="text-xs theme-text-muted font-mono">{s.code}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-1.5 rounded theme-text-muted hover:theme-text-primary hover:bg-slate-500/10 transition-colors cursor-pointer"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(s.id)}
                      className="p-1.5 rounded theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
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
                </div>
              </div>

              {/* Progress Bar & Numerical Breakdown */}
              <div className="space-y-2.5 pt-2 border-t theme-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="theme-text-muted">Target Progress Today</span>
                  <span className="font-bold theme-text-primary">
                    {workload.completed_today_minutes}m / {workload.daily_target_minutes}m ({workload.target_progress_percent}%)
                  </span>
                </div>

                <div className="w-full h-2 rounded-full theme-card-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${workload.target_progress_percent}%`,
                      backgroundColor: s.color || "#10b981",
                    }}
                  />
                </div>

                {/* Granular Separation */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg theme-card-subtle border theme-border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Unfinished Today
                    </span>
                    <strong className="text-sky-600 dark:text-sky-400 font-bold">
                      {workload.unfinished_target_today}m
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg theme-card-subtle border theme-border">
                    <span className="theme-text-dim block text-[10px] uppercase font-semibold">
                      Carried Backlog
                    </span>
                    <strong
                      className={
                        workload.previous_backlog_minutes > 0
                          ? "text-amber-600 dark:text-amber-400 font-bold"
                          : "theme-text-muted font-bold"
                      }
                    >
                      {workload.previous_backlog_minutes}m
                    </strong>
                  </div>
                </div>

                {(() => {
                  const pending = DailySessionEngine.getPendingSessionForSubject(s.id);
                  const isTargetMet = workload.target_progress_percent >= 100;
                  if (pending) {
                    return (
                      <button
                        onClick={() => onStartSessionForSubject(s.id, s.daily_target_minutes || 60)}
                        className="w-full mt-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resume Session ({Math.round(pending.accumulatedStudySeconds / 60)}m done)
                      </button>
                    );
                  }
                  if (isTargetMet) {
                    return (
                      <button
                        onClick={() => onStartSessionForSubject(s.id, s.daily_target_minutes || 60)}
                        className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border border-emerald-500/30 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Daily Target Completed
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => onStartSessionForSubject(s.id, s.daily_target_minutes || 60)}
                      className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Focus Block
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
