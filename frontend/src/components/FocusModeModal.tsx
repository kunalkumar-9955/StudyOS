"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Coffee,
  CheckCircle,
  AlertOctagon,
  ExternalLink,
  Volume2,
  VolumeX,
  Compass,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  ActiveSessionData,
  TimerEngine,
} from "@/lib/timerEngine";

interface FocusModeModalProps {
  session: ActiveSessionData;
  onUpdateSession: (session: ActiveSessionData) => void;
  onClose: () => void;
  onCompleteSession: (session: ActiveSessionData) => void;
  onNavigateTab: (tab: any) => void;
  onOpenTimerSetup: () => void;
  onDismissCompletedSession: () => void;
  approvedResources: any[];
}

export default function FocusModeModal({
  session,
  onUpdateSession,
  onClose,
  onCompleteSession,
  onNavigateTab,
  onOpenTimerSetup,
  onDismissCompletedSession,
  approvedResources,
}: FocusModeModalProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showResourcesDrawer, setShowResourcesDrawer] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState<boolean>(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenNotice, setFullscreenNotice] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [wasStudyingBeforeConfirm, setWasStudyingBeforeConfirm] = useState<boolean>(false);
  const [awayNotice, setAwayNotice] = useState<string | null>(null);

  // Detect standalone PWA mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }
  }, []);

  // Monitor fullscreen state and detect unexpected exit during studying/break
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);

      // If user exited fullscreen via Escape or browser gestures while actively studying or on break
      if (!isFs && (session.state === "STUDYING" || session.state === "BREAK")) {
        setFullscreenNotice(
          "Fullscreen mode was minimized. Your study timer is still active and tracking safely. Click Fullscreen anytime to re-expand."
        );
      } else if (isFs) {
        setFullscreenNotice(null);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [session.state]);

  const requestFullscreenDirect = async () => {
    if (typeof document === "undefined") return;
    try {
      const elem = document.documentElement as any;
      if (
        !document.fullscreenElement &&
        !(document as any).webkitFullscreenElement &&
        !(document as any).msFullscreenElement
      ) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      }
    } catch (err: any) {
      console.warn("[StudyOS] Fullscreen API request rejected or unsupported:", err);
      // Helpful fallback message without corrupting timer
      setFullscreenNotice(
        "Browser blocked automatic fullscreen (or unsupported in this display context). Your study session continues normally."
      );
    }
  };

  const exitFullscreenDirect = async () => {
    if (typeof document === "undefined") return;
    try {
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("[StudyOS] Exit fullscreen error:", err);
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitFullscreenDirect();
    } else {
      await requestFullscreenDirect();
    }
  };

  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSegment = session.segments[session.currentSegmentIndex] || session.segments[0];
  const isReady = session.state === "READY";
  const isBreak = session.state === "BREAK";
  const isPaused = session.state === "PAUSED";
  const isStudying = session.state === "STUDYING";
  const isBreakFinished = session.state === "BREAK_FINISHED";
  const isCompleted = session.state === "COMPLETED";

  // Total planned study minutes across all study segments
  const totalPlannedStudyMinutes = session.segments
    .filter((s) => s.segment_type === "STUDY")
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  // Sync remaining seconds with timestamp calculations every second
  useEffect(() => {
    const updateTime = () => {
      const calc = TimerEngine.calculateRemainingSeconds(session);
      setRemainingSeconds(calc.remainingSeconds);

      if (calc.isSegmentOver && (isStudying || isBreak)) {
        handleSegmentElapsed();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session, isStudying, isBreak]);

  // Tab switching / In-App restriction safeguard:
  // When user switches browser tab during STUDYING, pause session so away-time is never counted as study.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session.state === "STUDYING") {
        const paused = TimerEngine.pauseSession(session);
        onUpdateSession(paused);
        setAwayNotice("Session was paused while you switched away from StudyOS. Click Resume Study to continue.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, onUpdateSession]);

  // Repeated 5-minute reminders when break completes and user has not resumed
  useEffect(() => {
    if (isBreakFinished) {
      TimerEngine.notify(
        "StudyOS: Break Completed",
        "Your rest break is over. Please return to StudyOS and press Resume Study to begin your next focus segment."
      );

      reminderIntervalRef.current = setInterval(() => {
        TimerEngine.notify(
          "StudyOS Reminder: Return to Study",
          "Your break ended. Resume Study to keep your daily target on track."
        );
      }, 5 * 60 * 1000);
    } else {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    }

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    };
  }, [isBreakFinished]);

  const handleSegmentElapsed = () => {
    const updated = TimerEngine.advanceSegment(session);
    onUpdateSession(updated);

    if (updated.state === "BREAK") {
      TimerEngine.notify(
        "StudyOS Break Time",
        "Focused study interval finished! Take a scheduled rest break."
      );
    } else if (updated.state === "BREAK_FINISHED") {
      TimerEngine.notify(
        "StudyOS: Break Over",
        "Your break is finished! Press Resume Study to begin the next study segment."
      );
    } else if (updated.state === "COMPLETED") {
      // Natural finish of all segments
      onCompleteSession(updated);
    }
  };

  const handleStartStudy = () => {
    // Request browser fullscreen directly from user click gesture
    requestFullscreenDirect();
    const started = TimerEngine.startReadySession(session);
    onUpdateSession(started);
    setAwayNotice(null);
    setFullscreenNotice(null);
  };

  const handlePause = () => {
    // Keep fullscreen active during paused session whenever supported
    const paused = TimerEngine.pauseSession(session);
    onUpdateSession(paused);
  };

  const handleResume = () => {
    // Request browser fullscreen again through user's Resume click gesture
    requestFullscreenDirect();
    const resumed = TimerEngine.resumeStudy(session);
    onUpdateSession(resumed);
    setAwayNotice(null);
    setFullscreenNotice(null);
  };

  const handleEnterBreakManually = () => {
    // Save current study interval progress
    let paused = session;
    if (session.state === "STUDYING") {
      paused = TimerEngine.pauseSession(session);
    }

    // Find next break segment or create break transition
    const nextIdx = paused.currentSegmentIndex + 1;
    if (nextIdx < paused.segments.length && paused.segments[nextIdx].segment_type === "BREAK") {
      const updated: ActiveSessionData = {
        ...paused,
        currentSegmentIndex: nextIdx,
        state: "BREAK",
        currentSegmentStartedAt: Date.now(),
        currentSegmentElapsedSeconds: 0,
      };
      onUpdateSession(updated);
    } else {
      // Advance to next segment
      const advanced = TimerEngine.advanceSegment(paused);
      onUpdateSession(advanced);
    }
  };

  // STEP A: User clicks Finish Block -> Open STEP B Confirmation
  const handleOpenFinishConfirmation = () => {
    if (session.state === "STUDYING") {
      setWasStudyingBeforeConfirm(true);
      const paused = TimerEngine.pauseSession(session);
      onUpdateSession(paused);
    } else {
      setWasStudyingBeforeConfirm(false);
    }
    setIsConfirmingFinish(true);
  };

  // User cancels confirmation -> returns to active session without reset
  const handleCancelConfirmation = () => {
    setIsConfirmingFinish(false);
    if (wasStudyingBeforeConfirm) {
      const resumed = TimerEngine.resumeStudy(session);
      onUpdateSession(resumed);
    }
  };

  // User confirms finishing -> STEP C Completion Summary
  const handleConfirmFinishBlock = () => {
    setIsConfirmingFinish(false);

    // Calculate actual elapsed study and break
    let finalSession = session;
    if (session.state === "STUDYING") {
      finalSession = TimerEngine.pauseSession(session);
    }

    const actualStudyMins = Math.round(finalSession.accumulatedStudySeconds / 60);
    const isEarly = actualStudyMins < totalPlannedStudyMinutes;

    const completed: ActiveSessionData = {
      ...finalSession,
      state: "COMPLETED",
      currentSegmentStartedAt: null,
      isEarlyFinish: isEarly,
    };

    onUpdateSession(completed);
    onCompleteSession(completed);

    // Exit fullscreen only after session has actually been finalized!
    // Focus Mode remains open to display Completion Summary.
    exitFullscreenDirect();
  };

  const handleCancelSession = () => {
    if (
      window.confirm(
        "Are you sure you want to exit and cancel this focus session? Unfinished target time will be retained in your backlog."
      )
    ) {
      exitFullscreenDirect();
      const cancelled: ActiveSessionData = {
        ...session,
        state: "CANCELLED",
      };
      onCompleteSession(cancelled);
    }
  };

  const handleSafeMinimize = () => {
    if (isStudying || isBreak) {
      setIsConfirmingExit(true);
    } else {
      exitFullscreenDirect();
      onClose();
    }
  };

  const handleConfirmExit = () => {
    let paused = session;
    if (session.state === "STUDYING" || session.state === "BREAK") {
      paused = TimerEngine.pauseSession(session);
    }
    onUpdateSession(paused);
    setIsConfirmingExit(false);
    exitFullscreenDirect();
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Current calculation for actual study stats
  const actualStudySeconds = session.accumulatedStudySeconds || 0;
  const actualBreakSeconds = session.accumulatedBreakSeconds || 0;
  const actualStudyMinutes = Math.floor(actualStudySeconds / 60);
  const actualStudyRemainderSecs = actualStudySeconds % 60;
  const remainingOrSkippedMinutes = Math.max(0, totalPlannedStudyMinutes - Math.round(actualStudySeconds / 60));

  // ==========================================
  // VIEW: STEP C — COMPLETION SUMMARY VIEW
  // ==========================================
  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-y-auto">
        <div className="w-full max-w-xl glass-panel-elevated rounded-3xl p-6 sm:p-8 theme-border space-y-6 text-center my-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: session.subjectColor || "#10b981" }}
              />
              <span className="font-bold text-sm text-slate-300">{session.subjectName}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                {session.isEarlyFinish ? "Session Finished Early" : "Full Block Completed"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Study Block Results Recorded
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your actual focused study time has been persisted to your daily progress records.
            </p>
          </div>

          {/* Numerical breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Focused Study
              </span>
              <p className="text-lg font-black text-emerald-400 font-mono">
                {actualStudyMinutes}m {actualStudyRemainderSecs}s
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Rest Breaks
              </span>
              <p className="text-lg font-black text-amber-400 font-mono">
                {Math.floor(actualBreakSeconds / 60)}m
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Planned Block
              </span>
              <p className="text-lg font-black text-slate-200 font-mono">
                {session.totalBlockMinutes}m
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Backlog Retention
              </span>
              <p className="text-lg font-black text-sky-400 font-mono">
                {remainingOrSkippedMinutes}m
              </p>
            </div>
          </div>

          {/* Retention notice */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5 text-left">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              {session.isEarlyFinish
                ? `${remainingOrSkippedMinutes}m of planned study remained unfinished. It has been safely preserved in your backlog for automatic reallocation.`
                : "You completed your full planned study block! Daily targets have been updated."}
            </p>
          </div>

          {/* Explicit User Actions */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  exitFullscreenDirect();
                  onDismissCompletedSession();
                  onNavigateTab("dashboard");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>

              <button
                onClick={() => {
                  exitFullscreenDirect();
                  onDismissCompletedSession();
                  onOpenTimerSetup();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Another Block</span>
              </button>

              <button
                onClick={() => {
                  exitFullscreenDirect();
                  onDismissCompletedSession();
                  onNavigateTab("subjects");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>View Subject Targets</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN FOCUS MODE INTERFACE
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 bg-[#020617] text-slate-100 flex flex-col justify-between p-3 sm:p-8 select-none overflow-y-auto">
      {/* Top Bar: Subject name, Segments, Audio, and Close */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0"
            style={{ backgroundColor: session.subjectColor || "#10b981" }}
          />
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight truncate">
              {session.subjectName}
            </h3>
            {session.taskTitle && (
              <p className="text-xs text-slate-400 truncate max-w-xs">{session.taskTitle}</p>
            )}
          </div>
        </div>

        {/* Segments breadcrumb */}
        <div className="hidden md:flex items-center gap-2">
          {session.segments.map((seg, idx) => {
            const active = idx === session.currentSegmentIndex;
            const done = idx < session.currentSegmentIndex;
            return (
              <div
                key={idx}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  active
                    ? seg.segment_type === "STUDY"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/40"
                    : done
                    ? "bg-slate-800/80 text-slate-400 border-slate-700/60 line-through"
                    : "bg-slate-900/40 text-slate-500 border-slate-800"
                }`}
              >
                {seg.segment_type === "STUDY" ? "Study" : "Break"} {seg.duration_minutes}m
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isStandalone && (
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              PWA Standalone
            </span>
          )}
          {isFullscreen && (
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Deep Focus Fullscreen
            </span>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Deep Focus Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowResourcesDrawer(!showResourcesDrawer)}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Approved Resources</span>
            <span className="sm:hidden">Resources</span>
          </button>
          <button
            onClick={handleSafeMinimize}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Minimize Focus Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen status notice banner */}
      {fullscreenNotice && (
        <div className="my-2 p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{fullscreenNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={requestFullscreenDirect}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
            >
              Re-enter Fullscreen
            </button>
            <button
              onClick={() => setFullscreenNotice(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Away notice banner */}
      {awayNotice && (
        <div className="my-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3 animate-pulse">
          <span>{awayNotice}</span>
          <button
            onClick={() => setAwayNotice(null)}
            className="text-[11px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Center Focus Display */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-6 relative min-w-0">
        {/* Glow Aura */}
        <div
          className={`absolute w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-1000 ${
            isBreak ? "bg-amber-500" : isReady ? "bg-indigo-500" : "bg-emerald-500"
          }`}
        />

        {/* State Pill */}
        <div className="mb-4">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
              isReady
                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40"
                : isBreak
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : isBreakFinished
                ? "bg-amber-500/25 text-amber-200 border-amber-500/60 animate-bounce"
                : isPaused
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {isReady
              ? "Ready to Focus (Session Idle)"
              : isBreak
              ? "Rest & Hydrate (Break Mode)"
              : isBreakFinished
              ? "Break Finished — Return to Study"
              : isPaused
              ? "Session Paused — Return to Resume"
              : "Deep Focused Study"}
          </span>
        </div>

        {/* Huge Countdown Display */}
        <div className="font-mono text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter text-slate-100 drop-shadow-2xl my-2">
          {formatTime(remainingSeconds)}
        </div>

        {/* Current Segment Details */}
        <p className="text-sm font-medium text-slate-400 max-w-md px-2">
          {isReady
            ? `Planned ${session.totalBlockMinutes}m block for ${session.subjectName}. Click Start Study below to begin Segment 1 (${currentSegment?.duration_minutes}m).`
            : isBreakFinished
            ? `Your rest break is over. Press Resume Study when ready to begin Segment ${session.currentSegmentIndex + 1} (${currentSegment?.duration_minutes}m).`
            : currentSegment?.segment_type === "STUDY"
            ? `Segment ${session.currentSegmentIndex + 1} of ${session.segments.length}: Deep study period (${currentSegment?.duration_minutes}m). In-app distractions restricted.`
            : `Segment ${session.currentSegmentIndex + 1} of ${session.segments.length}: Scheduled rest break (${currentSegment?.duration_minutes}m). Rest your eyes and stretch.`}
        </p>

        {/* Strict Break Finished Prompt */}
        {isBreakFinished && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 max-w-md text-xs space-y-2">
            <p className="font-bold text-sm">Scheduled Break Finished</p>
            <p>
              Focused study does not accumulate while you are away. Click <strong>Resume Study</strong> below to begin your next focus segment.
            </p>
          </div>
        )}

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-3 sm:gap-4 mt-8 flex-wrap justify-center">
          {/* READY STATE: Only Start Study starts countdown! */}
          {isReady && (
            <button
              onClick={handleStartStudy}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center gap-2.5 shadow-xl shadow-emerald-600/30 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Study</span>
            </button>
          )}

          {/* STUDYING STATE */}
          {isStudying && (
            <>
              <button
                onClick={handlePause}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 border border-slate-700 shadow-md cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>

              <button
                onClick={handleEnterBreakManually}
                className="px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm flex items-center gap-2 border border-amber-500/40 cursor-pointer"
              >
                <Coffee className="w-4 h-4" />
                <span>Take Break</span>
              </button>
            </>
          )}

          {/* PAUSED OR BREAK_FINISHED: Resume button */}
          {(isPaused || isBreakFinished) && (
            <button
              onClick={handleResume}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center gap-2.5 shadow-xl shadow-emerald-600/30 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Resume Study</span>
            </button>
          )}

          {/* FINISH BLOCK BUTTON: Always available after session is created, triggers confirmation */}
          {!isReady && (
            <button
              onClick={handleOpenFinishConfirmation}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-emerald-950/40 text-emerald-400 font-bold text-sm flex items-center gap-2 border border-slate-800 hover:border-emerald-500/40 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Finish Block</span>
            </button>
          )}

          {/* CANCEL SESSION */}
          <button
            onClick={handleCancelSession}
            className="p-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
            title="Cancel session"
          >
            <AlertOctagon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Footer: Stats and In-App Boundary Notice */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-4 gap-2">
        <div className="flex items-center gap-4">
          <span>
            Actual Focused Study: <strong className="text-emerald-400 font-mono">{actualStudyMinutes}m {actualStudyRemainderSecs}s</strong>
          </span>
          <span>
            Rest Breaks: <strong className="text-amber-400 font-mono">{Math.floor(actualBreakSeconds / 60)}m</strong>
          </span>
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          In-App Focus Locked • Fullscreen display mode active. Tab switching auto-pauses session. (Fullscreen is a display mode; it cannot block OS-level Alt+Tab or Android Home).
        </p>
      </div>

      {/* ======================================================== */}
      {/* STEP B: FINISH BLOCK CONFIRMATION MODAL                   */}
      {/* ======================================================== */}
      {isConfirmingFinish && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 theme-border space-y-6 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    Finish Study Block?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review your actual progress before completing this session
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelConfirmation}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Target Subject</span>
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: session.subjectColor }}
                  />
                  {session.subjectName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Actual Focused Study
                  </span>
                  <span className="font-black text-emerald-400 text-base font-mono">
                    {actualStudyMinutes}m {actualStudyRemainderSecs}s
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Actual Rest Breaks
                  </span>
                  <span className="font-black text-amber-400 text-base font-mono">
                    {Math.floor(actualBreakSeconds / 60)}m
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Planned Block Duration
                  </span>
                  <span className="font-black text-slate-200 text-base font-mono">
                    {session.totalBlockMinutes}m
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Segments Completed
                  </span>
                  <span className="font-black text-slate-200 text-base font-mono">
                    {session.currentSegmentIndex + 1} of {session.segments.length}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                {actualStudyMinutes < totalPlannedStudyMinutes ? (
                  <span className="text-amber-400 font-semibold block mb-0.5">
                    Ending early: {remainingOrSkippedMinutes}m unfinished target will remain in your backlog for automatic reallocation.
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold block mb-0.5">
                    Full study block completed! All planned segment minutes met.
                  </span>
                )}
                Only actual focused study ({actualStudyMinutes}m) will be added to your target progress.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelConfirmation}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Continue Studying
              </button>

              <button
                type="button"
                onClick={handleConfirmFinishBlock}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Confirm Finish Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SAFE EXIT CONFIRMATION MODAL                            */}
      {/* ======================================================== */}
      {isConfirmingExit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 theme-border space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">Pause & Leave Focus Mode?</h3>
                <p className="text-xs text-slate-400">Your session will be preserved in a paused state.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Leaving Focus Mode will safely pause your timer. Your accumulated study time ({actualStudyMinutes}m) and remaining segment time ({formatTime(remainingSeconds)}) will be preserved so you can <strong>Resume Pending Session</strong> from the Dashboard at any time without losing progress.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmingExit(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Keep Studying
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 cursor-pointer"
              >
                Pause & Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Resources Slide-Over Drawer */}
      {showResourcesDrawer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#090f1d] border-l border-slate-800 p-6 z-50 flex flex-col justify-between shadow-2xl backdrop-blur-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-sm text-slate-100">Approved Study Resources</h4>
              </div>
              <button
                onClick={() => setShowResourcesDrawer(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Only explicitly approved study resources appear here during active sessions.
            </p>

            <div className="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
              {approvedResources.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
                  No approved resources configured yet. You can add resources in the Approved Resources tab.
                </div>
              ) : (
                approvedResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{res.name}</p>
                      <span className="text-[10px] text-indigo-400 uppercase font-semibold">
                        {res.category}
                      </span>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-500/30 shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              External tools (like ChatGPT or WhatsApp Web) will open in an external tab. Your StudyOS timer remains running safely in this tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
