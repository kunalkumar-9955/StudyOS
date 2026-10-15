/**
 * StudyOS Daily Subject Target & Session Persistence Engine
 * 
 * Provides:
 * 1. Distinction between Daily Subject Targets and individual study sessions.
 * 2. Persistent subject sessions that can be paused and resumed without resetting.
 * 3. Daily date tracking with calendar rollover (yesterday's unfinished target -> previous backlog).
 * 4. Multi-subject session persistence (working on Python does not wipe DSA's pending session).
 * 5. Safe recovery across browser reloads, laptop restarts, and visibility change tab-switching.
 */

import { ActiveSessionData, TimerEngine } from "./timerEngine";

export interface DailySubjectRecord {
  id: string; // "target_{subjectId}_{date}"
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  date: string; // "YYYY-MM-DD" in local timezone
  originalDailyTargetMinutes: number; // e.g. 120
  completedStudySeconds: number;      // e.g. 2100 (35m)
  completedStudyMinutes: number;      // e.g. 35
  remainingTargetMinutes: number;     // e.g. 85 (max(0, original - completed))
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  lastSessionId?: string;
  lastSavedTimestamp: number;
  completedAt?: number;
}

export interface DayRolloverResult {
  previousDate: string;
  currentDate: string;
  carriedOverBacklogs: {
    subjectId: number;
    subjectName: string;
    unfinishedMinutes: number;
  }[];
}

export class DailySessionEngine {
  private static DAILY_TARGETS_KEY = "studyos_daily_subject_records";
  private static PENDING_SESSIONS_KEY = "studyos_pending_subject_sessions";
  private static LAST_ACTIVE_DATE_KEY = "studyos_last_active_date";
  private static ROLLED_OVER_DATES_KEY = "studyos_rolled_over_dates";

  /**
   * Generates a stable date string (YYYY-MM-DD) in the user's local timezone.
   */
  static getLocalDateString(dateInput?: Date | number): string {
    const d = dateInput
      ? typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput
      : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Reads all daily target records from localStorage.
   */
  static getAllDailyRecords(): Record<string, DailySubjectRecord> {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(this.DAILY_TARGETS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves all daily target records to localStorage.
   */
  static saveAllDailyRecords(records: Record<string, DailySubjectRecord>): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.DAILY_TARGETS_KEY, JSON.stringify(records));
    } catch (e) {
      console.error("[StudyOS] Failed to save daily records:", e);
    }
  }

  /**
   * Retrieves or initializes a daily subject record for a given subject and date.
   */
  static getOrCreateDailyRecord(
    subject: { id: number; name: string; color?: string; daily_target_minutes?: number },
    dateStr?: string
  ): DailySubjectRecord {
    const date = dateStr || this.getLocalDateString();
    const key = `target_${subject.id}_${date}`;
    const allRecords = this.getAllDailyRecords();

    if (allRecords[key]) {
      return allRecords[key];
    }

    const targetMinutes = subject.daily_target_minutes || 60;
    const newRecord: DailySubjectRecord = {
      id: key,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color || "#10b981",
      date,
      originalDailyTargetMinutes: targetMinutes,
      completedStudySeconds: 0,
      completedStudyMinutes: 0,
      remainingTargetMinutes: targetMinutes,
      status: "NOT_STARTED",
      lastSavedTimestamp: Date.now(),
    };

    allRecords[key] = newRecord;
    this.saveAllDailyRecords(allRecords);
    return newRecord;
  }

  /**
   * Updates an existing daily record for a subject.
   */
  static saveDailyRecord(record: DailySubjectRecord): void {
    const all = this.getAllDailyRecords();
    all[record.id] = {
      ...record,
      lastSavedTimestamp: Date.now(),
    };
    this.saveAllDailyRecords(all);
  }

  /**
   * Reads all pending resumable sessions indexed by subjectId.
   */
  static getAllPendingSessions(): Record<number, ActiveSessionData> {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(this.PENDING_SESSIONS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves a pending resumable session for a subject.
   */
  static savePendingSessionForSubject(subjectId: number, session: ActiveSessionData | null): void {
    if (typeof window === "undefined") return;
    try {
      const all = this.getAllPendingSessions();
      if (session && session.state !== "CANCELLED") {
        all[subjectId] = session;
      } else {
        delete all[subjectId];
      }
      localStorage.setItem(this.PENDING_SESSIONS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[StudyOS] Failed to save pending session for subject:", e);
    }
  }

  /**
   * Retrieves a pending resumable session for a subject if one exists.
   */
  static getPendingSessionForSubject(subjectId: number): ActiveSessionData | null {
    const all = this.getAllPendingSessions();
    const session = all[subjectId];
    if (!session) return null;

    // Check if session is valid and resumable
    if (session.state === "CANCELLED") {
      this.clearPendingSessionForSubject(subjectId);
      return null;
    }
    return session;
  }

  /**
   * Removes pending session for a subject (e.g. upon final completion or cancellation).
   */
  static clearPendingSessionForSubject(subjectId: number): void {
    this.savePendingSessionForSubject(subjectId, null);
  }

  /**
   * Records actual focused study time onto the subject's daily target record.
   * Updates completed study duration and remaining target.
   * If remaining target reaches 0, marks daily target as COMPLETED.
   */
  static recordStudyProgress(
    subjectId: number,
    additionalStudySeconds: number,
    dateStr?: string
  ): { record: DailySubjectRecord; isTargetCompleted: boolean } {
    const date = dateStr || this.getLocalDateString();
    const key = `target_${subjectId}_${date}`;
    const all = this.getAllDailyRecords();
    let record = all[key];

    if (!record) {
      record = {
        id: key,
        subjectId,
        subjectName: `Subject #${subjectId}`,
        subjectColor: "#10b981",
        date,
        originalDailyTargetMinutes: 60,
        completedStudySeconds: 0,
        completedStudyMinutes: 0,
        remainingTargetMinutes: 60,
        status: "NOT_STARTED",
        lastSavedTimestamp: Date.now(),
      };
    }

    const newCompletedSeconds = (record.completedStudySeconds || 0) + Math.max(0, additionalStudySeconds);
    const newCompletedMinutes = Math.round(newCompletedSeconds / 60);
    const remainingMinutes = Math.max(0, record.originalDailyTargetMinutes - newCompletedMinutes);
    const isCompleted = remainingMinutes === 0;

    const updatedRecord: DailySubjectRecord = {
      ...record,
      completedStudySeconds: newCompletedSeconds,
      completedStudyMinutes: newCompletedMinutes,
      remainingTargetMinutes: remainingMinutes,
      status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
      lastSavedTimestamp: Date.now(),
      completedAt: isCompleted ? (record.completedAt || Date.now()) : undefined,
    };

    all[key] = updatedRecord;
    this.saveAllDailyRecords(all);

    return {
      record: updatedRecord,
      isTargetCompleted: isCompleted,
    };
  }

  /**
   * Checks for a calendar day change and rolls over unfinished daily targets into backlog.
   * 
   * Strict Rules:
   * 1. Today's targets are created fresh.
   * 2. Yesterday's unfinished target (original - completed) is rolled over into previous_backlog_minutes.
   * 3. Rollover happens EXACTLY ONCE per calendar date to prevent duplicate backlog accumulation.
   * 4. Old completed targets stay completed.
   */
  static checkAndHandleDayRollover(
    subjects: any[],
    currentDateOverride?: string
  ): {
    updatedSubjects: any[];
    rolloverResult: DayRolloverResult | null;
  } {
    if (typeof window === "undefined") {
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    const todayStr = currentDateOverride || this.getLocalDateString();
    const lastActiveDate = localStorage.getItem(this.LAST_ACTIVE_DATE_KEY);

    // Initial run or same day: no rollover needed
    if (!lastActiveDate) {
      localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, todayStr);
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    if (lastActiveDate === todayStr) {
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    // A new calendar day has arrived!
    // Check if we have already rolled over for this past date to avoid duplicate backlog
    let rolledOverDates: string[] = [];
    try {
      const saved = localStorage.getItem(this.ROLLED_OVER_DATES_KEY);
      if (saved) rolledOverDates = JSON.parse(saved);
    } catch {}

    if (rolledOverDates.includes(lastActiveDate)) {
      // Already rolled over this past date
      localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, todayStr);
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    // Inspect yesterday's records for unfinished targets
    const allRecords = this.getAllDailyRecords();
    const carriedOverBacklogs: {
      subjectId: number;
      subjectName: string;
      unfinishedMinutes: number;
    }[] = [];

    const updatedSubjects = subjects.map((subj) => {
      const pastKey = `target_${subj.id}_${lastActiveDate}`;
      const pastRecord = allRecords[pastKey];

      let unfinishedMins = 0;
      if (pastRecord) {
        unfinishedMins = pastRecord.remainingTargetMinutes;
      } else {
        // If no past session record existed, check if user completed anything
        const targetMins = subj.daily_target_minutes || 60;
        const completedMins = Math.round((subj.total_focused_study_seconds || 0) / 60);
        unfinishedMins = Math.max(0, targetMins - completedMins);
      }

      if (unfinishedMins > 0) {
        carriedOverBacklogs.push({
          subjectId: subj.id,
          subjectName: subj.name,
          unfinishedMinutes: unfinishedMins,
        });

        return {
          ...subj,
          // Unfinished target rolled into previous backlog exactly once
          previous_backlog_minutes: (subj.previous_backlog_minutes || 0) + unfinishedMins,
          // Today starts fresh
          total_focused_study_seconds: 0,
          completed_today_minutes: 0,
        };
      }

      return {
        ...subj,
        total_focused_study_seconds: 0,
        completed_today_minutes: 0,
      };
    });

    // Mark past date as rolled over
    rolledOverDates.push(lastActiveDate);
    localStorage.setItem(this.ROLLED_OVER_DATES_KEY, JSON.stringify(rolledOverDates));
    localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, todayStr);

    const rolloverResult: DayRolloverResult = {
      previousDate: lastActiveDate,
      currentDate: todayStr,
      carriedOverBacklogs,
    };

    return { updatedSubjects, rolloverResult };
  }
}
