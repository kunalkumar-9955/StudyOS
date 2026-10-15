"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Clock, Sparkles, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { TimerEngine, TimerSegment, ActiveSessionData } from "@/lib/timerEngine";
import { DailySessionEngine, DailySubjectRecord } from "@/lib/dailySessionEngine";

interface TimerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: any[];
  tasks: any[];
  preselectedSubjectId?: number;
  onStartSession: (subjectId: number, blockMinutes: number, taskId?: number) => void;
  onResumeSession?: (session: ActiveSessionData) => void;
}

export default function TimerSetupModal({
  isOpen,
  onClose,
  subjects,
  tasks,
  preselectedSubjectId,
  onStartSession,
  onResumeSession,
}: TimerSetupModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(
    preselectedSubjectId || subjects[0]?.id || 1
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>(undefined);
  const [blockMinutes, setBlockMinutes] = useState<number>(60);
  const [previewSegments, setPreviewSegments] = useState<TimerSegment[]>(() =>
    TimerEngine.generateSchedule(60)
  );
  const [pendingSession, setPendingSession] = useState<ActiveSessionData | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailySubjectRecord | null>(null);

  // Sync when preselected subject or isOpen changes
  useEffect(() => {
    if (preselectedSubjectId) {
      setSelectedSubjectId(preselectedSubjectId);
    }
  }, [preselectedSubjectId, isOpen]);

  // Inspect pending session and daily record for the selected subject
  useEffect(() => {
    if (!selectedSubjectId) return;
    const pending = DailySessionEngine.getPendingSessionForSubject(selectedSubjectId);
    setPendingSession(pending);

    const subj = subjects.find((s) => s.id === selectedSubjectId);
    if (subj) {
      const rec = DailySessionEngine.getOrCreateDailyRecord(subj);
      setDailyRecord(rec);
      // If there's unfinished target time, adapt default block duration if appropriate
      if (rec.remainingTargetMinutes > 0 && rec.remainingTargetMinutes <= 240 && !pending) {
        if ([30, 45, 60, 90, 120, 150, 180, 240].includes(rec.remainingTargetMinutes)) {
          setBlockMinutes(rec.remainingTargetMinutes);
          try {
            setPreviewSegments(TimerEngine.generateSchedule(rec.remainingTargetMinutes));
          } catch {}
        }
      }
    }
  }, [selectedSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleDurationChange = (mins: number) => {
    setBlockMinutes(mins);
    try {
      const schedule = TimerEngine.generateSchedule(mins);
      setPreviewSegments(schedule);
    } catch {
      // ignore
    }
  };

  const handleStart = () => {
    onStartSession(selectedSubjectId, blockMinutes, selectedTaskId);
  };

  const handleResume = () => {
    if (pendingSession && onResumeSession) {
      onResumeSession(pendingSession);
    } else {
      handleStart();
    }
  };

  const presetDurations = [30, 45, 60, 90, 120, 150, 180, 240];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-lg theme-border border p-4 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                Configure Study Block
              </h3>
              <p className="text-xs theme-text-muted">
                Strict study & scheduled rest break allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PENDING RESUMABLE SESSION NOTICE */}
        {pendingSession && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-300 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                Resumable Session Found for {pendingSession.subjectName}
              </span>
              <span className="uppercase text-[10px] px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 font-bold">
                Status: {pendingSession.state}
              </span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              You paused this session previously. It is preserved with approximately{" "}
              <strong>
                {Math.round(pendingSession.accumulatedStudySeconds / 60)}m completed
              </strong>{" "}
              out of {pendingSession.totalBlockMinutes}m planned. Resuming will continue without resetting your timer.
            </p>
            <button
              onClick={handleResume}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/25 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Saved Session ({Math.round(pendingSession.accumulatedStudySeconds / 60)}m done)</span>
            </button>
          </div>
        )}

        {/* DAILY TARGET STATUS CARD */}
        {dailyRecord && (
          <div className="p-3 rounded-xl theme-card-subtle theme-border border flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] theme-text-muted block font-semibold uppercase">
                Today&apos;s Daily Target Progress
              </span>
              <strong className="theme-text-primary font-bold text-sm">
                {dailyRecord.completedStudyMinutes}m of {dailyRecord.originalDailyTargetMinutes}m Completed
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] theme-text-muted block font-semibold uppercase">
                Remaining Workload
              </span>
              <strong
                className={`font-bold text-sm ${
                  dailyRecord.remainingTargetMinutes > 0
                    ? "text-sky-600 dark:text-sky-400"
                    : "text-emerald-500"
                }`}
              >
                {dailyRecord.remainingTargetMinutes > 0
                  ? `${dailyRecord.remainingTargetMinutes}m left`
                  : "Target Met! 🎉"}
              </strong>
            </div>
          </div>
        )}

        {/* Form Controls */}
        <div className="space-y-4 text-xs">
          {/* Subject Selection */}
          <div>
            <label className="block font-semibold theme-text-secondary mb-1">
              Target Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl theme-input font-bold"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.daily_target_minutes}m target)
                </option>
              ))}
            </select>
          </div>

          {/* Optional Task Selection */}
          <div>
            <label className="block font-semibold theme-text-secondary mb-1">
              Associated Task (Optional)
            </label>
            <select
              value={selectedTaskId || ""}
              onChange={(e) =>
                setSelectedTaskId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3.5 py-2.5 rounded-xl theme-input"
            >
              <option value="">-- General Subject Preparation --</option>
              {tasks
                .filter((t) => t.subject === selectedSubjectId || !t.subject)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.planned_minutes}m)
                  </option>
                ))}
            </select>
          </div>

          {/* Block Duration Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold theme-text-secondary">
                Total Block Duration (Includes scheduled breaks)
              </label>
              {dailyRecord && dailyRecord.remainingTargetMinutes > 0 && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                  Remaining daily: {dailyRecord.remainingTargetMinutes}m
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {presetDurations.map((mins) => {
                const active = blockMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationChange(mins)}
                    className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/25"
                        : "theme-card theme-border theme-text-secondary hover:border-emerald-500/40"
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    {mins === 60 && " (1h)"}
                    {mins === 120 && " (2h)"}
                    {mins === 180 && " (3h)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deterministic Schedule Preview */}
          <div className="p-4 rounded-xl theme-card-subtle border theme-border space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Deterministic Schedule ({blockMinutes}m total)
              </span>
              <span className="theme-text-muted">{previewSegments.length} Segments</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {previewSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg font-semibold border flex items-center gap-1.5 shrink-0 ${
                    seg.segment_type === "STUDY"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  <span>{seg.segment_type === "STUDY" ? "Study" : "Break"}:</span>
                  <span className="font-mono">{seg.duration_minutes}m</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] theme-text-muted">
              {blockMinutes === 60 && "Exact 1-hour block: 50m study + 10m break."}
              {blockMinutes === 120 && "Exact 2-hour block: 60m study + 10m break + 50m study."}
              {blockMinutes === 180 && "Exact 3-hour block: 60m study + 10m break + 60m study + 10m break + 40m study."}
            </p>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t theme-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl theme-text-muted hover:theme-text-primary text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{pendingSession ? "Start Fresh Block" : "Start Focus Block"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
