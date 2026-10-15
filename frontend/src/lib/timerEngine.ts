/**
 * StudyOS Deterministic Timer Engine
 * Implements strict study and break scheduling, state machine, timestamp-based recovery,
 * manual resume waiting, in-app focus restrictions, and background notification reminders.
 */

export type TimerState =
  | 'READY'            // Initial idle state before user clicks "Start Study"
  | 'STUDYING'         // Timer actively counting down focused study
  | 'BREAK'            // Timer counting down scheduled rest break
  | 'PAUSED'           // Session paused; remaining duration and accumulation frozen
  | 'BREAK_FINISHED'   // Scheduled break elapsed; waiting for user to click "Resume Study"
  | 'CONFIRMING_FINISH'// User clicked "Finish Block"; confirmation dialog active
  | 'COMPLETED'        // Block finished or ended early; showing Completion Summary
  | 'CANCELLED';       // Session explicitly cancelled

export interface TimerSegment {
  segment_index: number;
  segment_type: 'STUDY' | 'BREAK';
  duration_seconds: number;
  duration_minutes: number;
}

export interface ActiveSessionData {
  sessionId: string;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  taskTitle?: string;
  totalBlockMinutes: number;
  state: TimerState;
  currentSegmentIndex: number;
  segments: TimerSegment[];
  currentSegmentElapsedSeconds: number; // Seconds elapsed in current segment prior to current run
  accumulatedStudySeconds: number;      // Total actual focused study seconds across the session
  accumulatedBreakSeconds: number;      // Total actual break seconds across the session
  currentSegmentStartedAt: number | null; // Timestamp (ms) when current run interval started
  pausedAt: number | null;
  startedAt: number;
  isEarlyFinish?: boolean;
  lastReminderSentAt?: number;
}

export class TimerEngine {
  private static STORAGE_KEY = "studyos_active_session";

  /**
   * Generates deterministic schedule matching the strict algorithm:
   * 60m -> 50m study + 10m break
   * 120m -> 60m study + 10m break + 50m study
   * 180m -> 60m study + 10m break + 60m study + 10m break + 40m study
   * 240m -> 60m study + 10m break + 60m study + 10m break + 60m study + 10m break + 30m study
   * Sum of segment durations is always exactly equal to totalMinutes.
   */
  static generateSchedule(totalMinutes: number): TimerSegment[] {
    if (totalMinutes < 15) {
      throw new Error("Minimum session duration is 15 minutes");
    }

    const segments: { type: 'STUDY' | 'BREAK'; minutes: number }[] = [];

    if (totalMinutes < 60) {
      if (totalMinutes >= 30) {
        segments.push({ type: 'STUDY', minutes: totalMinutes - 5 });
        segments.push({ type: 'BREAK', minutes: 5 });
      } else {
        segments.push({ type: 'STUDY', minutes: totalMinutes });
      }
    } else if (totalMinutes === 60) {
      segments.push({ type: 'STUDY', minutes: 50 });
      segments.push({ type: 'BREAK', minutes: 10 });
    } else {
      // Greater than 60 minutes
      segments.push({ type: 'STUDY', minutes: 60 });
      segments.push({ type: 'BREAK', minutes: 10 });
      let remaining = totalMinutes - 70;

      while (remaining > 60) {
        segments.push({ type: 'STUDY', minutes: 60 });
        segments.push({ type: 'BREAK', minutes: 10 });
        remaining -= 70;
      }

      if (remaining > 0) {
        segments.push({ type: 'STUDY', minutes: remaining });
      }
    }

    return segments.map((s, idx) => ({
      segment_index: idx,
      segment_type: s.type,
      duration_minutes: s.minutes,
      duration_seconds: s.minutes * 60,
    }));
  }

  /**
   * Initializes a session in READY (idle) state.
   * Focus Mode does NOT auto-start countdown or record fake study.
   */
  static createInitialSession(params: {
    subjectId: number;
    subjectName: string;
    subjectColor: string;
    totalBlockMinutes: number;
    taskTitle?: string;
  }): ActiveSessionData {
    const segments = this.generateSchedule(params.totalBlockMinutes);
    return {
      sessionId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`,
      subjectId: params.subjectId,
      subjectName: params.subjectName,
      subjectColor: params.subjectColor,
      taskTitle: params.taskTitle,
      totalBlockMinutes: params.totalBlockMinutes,
      state: 'READY',
      currentSegmentIndex: 0,
      segments,
      currentSegmentElapsedSeconds: 0,
      accumulatedStudySeconds: 0,
      accumulatedBreakSeconds: 0,
      currentSegmentStartedAt: null,
      pausedAt: null,
      startedAt: Date.now(),
    };
  }

  static getActiveSession(): ActiveSessionData | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Migration safeguard for legacy session objects lacking currentSegmentElapsedSeconds
      if (typeof parsed.currentSegmentElapsedSeconds !== "number") {
        parsed.currentSegmentElapsedSeconds = 0;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  static saveActiveSession(session: ActiveSessionData | null): void {
    if (typeof window === "undefined") return;
    if (session) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Calculates current remaining seconds in the active segment using timestamps.
   * Preserves exact remaining seconds across pause, resume, tab switching, and page reloads.
   */
  static calculateRemainingSeconds(session: ActiveSessionData): {
    remainingSeconds: number;
    segmentElapsedSeconds: number;
    totalStudySeconds: number;
    totalBreakSeconds: number;
    isSegmentOver: boolean;
  } {
    const currentSegment = session.segments[session.currentSegmentIndex];
    if (!currentSegment) {
      return {
        remainingSeconds: 0,
        segmentElapsedSeconds: 0,
        totalStudySeconds: session.accumulatedStudySeconds,
        totalBreakSeconds: session.accumulatedBreakSeconds,
        isSegmentOver: true,
      };
    }

    let runningIntervalElapsed = 0;
    if (
      (session.state === 'STUDYING' || session.state === 'BREAK') &&
      session.currentSegmentStartedAt
    ) {
      const now = Date.now();
      runningIntervalElapsed = Math.max(
        0,
        Math.floor((now - session.currentSegmentStartedAt) / 1000)
      );
    }

    const totalElapsedInSegment =
      (session.currentSegmentElapsedSeconds || 0) + runningIntervalElapsed;
    const duration = currentSegment.duration_seconds;
    const remaining = Math.max(0, duration - totalElapsedInSegment);
    const isOver = totalElapsedInSegment >= duration;

    let currentStudyTotal = session.accumulatedStudySeconds || 0;
    let currentBreakTotal = session.accumulatedBreakSeconds || 0;

    if (session.state === 'STUDYING') {
      currentStudyTotal += runningIntervalElapsed;
    } else if (session.state === 'BREAK') {
      currentBreakTotal += runningIntervalElapsed;
    }

    return {
      remainingSeconds: remaining,
      segmentElapsedSeconds: totalElapsedInSegment,
      totalStudySeconds: currentStudyTotal,
      totalBreakSeconds: currentBreakTotal,
      isSegmentOver: isOver,
    };
  }

  /**
   * Pauses an active session, freezing the exact remaining duration
   * and study/break accumulation.
   */
  static pauseSession(session: ActiveSessionData): ActiveSessionData {
    if (session.state !== 'STUDYING' && session.state !== 'BREAK') {
      return session;
    }

    const now = Date.now();
    let additionalElapsed = 0;
    if (session.currentSegmentStartedAt) {
      additionalElapsed = Math.max(0, Math.floor((now - session.currentSegmentStartedAt) / 1000));
    }

    const isStudy = session.state === 'STUDYING';

    return {
      ...session,
      state: 'PAUSED',
      pausedAt: now,
      currentSegmentStartedAt: null,
      currentSegmentElapsedSeconds: (session.currentSegmentElapsedSeconds || 0) + additionalElapsed,
      accumulatedStudySeconds: isStudy
        ? (session.accumulatedStudySeconds || 0) + additionalElapsed
        : session.accumulatedStudySeconds,
      accumulatedBreakSeconds: !isStudy
        ? (session.accumulatedBreakSeconds || 0) + additionalElapsed
        : session.accumulatedBreakSeconds,
    };
  }

  /**
   * Resumes a paused session. Continues from the exact frozen remaining time.
   */
  static resumeStudy(session: ActiveSessionData): ActiveSessionData {
    const currentSegment = session.segments[session.currentSegmentIndex];
    const isBreak = currentSegment?.segment_type === 'BREAK' && session.state === 'PAUSED';
    const now = Date.now();

    return {
      ...session,
      state: isBreak ? 'BREAK' : 'STUDYING',
      currentSegmentStartedAt: now,
      pausedAt: null,
    };
  }

  /**
   * Starts a session from READY state upon explicit user click.
   */
  static startReadySession(session: ActiveSessionData): ActiveSessionData {
    const now = Date.now();
    return {
      ...session,
      state: 'STUDYING',
      currentSegmentStartedAt: now,
      pausedAt: null,
    };
  }

  /**
   * Transitions when a segment naturally completes.
   * If study segment completes -> transitions to scheduled break.
   * If break segment completes -> enters BREAK_FINISHED waiting for manual user resume.
   */
  static advanceSegment(session: ActiveSessionData): ActiveSessionData {
    const currentSegment = session.segments[session.currentSegmentIndex];
    const now = Date.now();

    // Finalize remainder of the segment duration
    const remainingToFullSegment = currentSegment
      ? Math.max(0, currentSegment.duration_seconds - (session.currentSegmentElapsedSeconds || 0))
      : 0;

    let finalStudy = session.accumulatedStudySeconds;
    let finalBreak = session.accumulatedBreakSeconds;

    if (currentSegment?.segment_type === 'STUDY') {
      finalStudy += remainingToFullSegment;
    } else if (currentSegment?.segment_type === 'BREAK') {
      finalBreak += remainingToFullSegment;
    }

    const nextIdx = session.currentSegmentIndex + 1;
    if (nextIdx >= session.segments.length) {
      // All planned segments complete!
      return {
        ...session,
        currentSegmentIndex: session.segments.length - 1,
        state: 'COMPLETED',
        currentSegmentStartedAt: null,
        currentSegmentElapsedSeconds: currentSegment?.duration_seconds || 0,
        accumulatedStudySeconds: finalStudy,
        accumulatedBreakSeconds: finalBreak,
        isEarlyFinish: false,
      };
    }

    const nextSegment = session.segments[nextIdx];
    if (nextSegment.segment_type === 'BREAK') {
      // Transition from Study into Break
      return {
        ...session,
        currentSegmentIndex: nextIdx,
        state: 'BREAK',
        currentSegmentStartedAt: now,
        currentSegmentElapsedSeconds: 0,
        accumulatedStudySeconds: finalStudy,
        accumulatedBreakSeconds: finalBreak,
      };
    } else {
      // Transition from Break into next Study Segment -> BREAK_FINISHED waiting state!
      // Strict requirement: User must return and press Resume Study manually.
      return {
        ...session,
        currentSegmentIndex: nextIdx,
        state: 'BREAK_FINISHED',
        currentSegmentStartedAt: null,
        currentSegmentElapsedSeconds: 0,
        accumulatedStudySeconds: finalStudy,
        accumulatedBreakSeconds: finalBreak,
      };
    }
  }

  /**
   * Requests browser notification permissions.
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    }
    return false;
  }

  /**
   * Sends desktop/mobile notification when permitted.
   */
  static notify(title: string, body: string): void {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/icons/icon-192.svg",
          badge: "/icons/icon-192.svg",
        });
      } catch (e) {
        console.warn("[StudyOS] Notification trigger failed:", e);
      }
    }
  }
}
