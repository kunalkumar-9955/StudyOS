/**
 * StudyOS Daily Subject Target & Session Persistence Engine
 * 
 * Provides:
 * 1. 5:00 AM Local Time Daily Study-Cycle Boundary (Study day runs from 5:00 AM to 4:59 AM next day).
 * 2. Distinction between Daily Subject Targets (authoritative goal) and individual study blocks.
 * 3. Partial Finish Block preservation: Finishing early (e.g. 35m of 120m target) saves actual 35m,
 *    preserves 85m remaining target as PENDING / RESUMABLE, and does NOT reset or wipe the target.
 * 4. Completed target protection: Target is COMPLETED only when actual study meets or exceeds target.
 *    Resume is NOT offered for completed targets.
 * 5. Idempotent 5:00 AM rollover: Unfinished work rolls into backlog once without duplicate accumulation.
 * 6. Historical study records preserved permanently across calendar dates.
 */

import { ActiveSessionData, TimerEngine } from "./timerEngine";

export type DailyTargetStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PAUSED"
  | "PENDING_RESUME"
  | "COMPLETED"
  | "FINISHED_EARLY";

export interface DailySubjectRecord {
  id: string; // "target_{subjectId}_{studyDayDate}"
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  date: string; // "YYYY-MM-DD" representing the 5:00 AM study-cycle date
  originalDailyTargetMinutes: number; // e.g. 120
  completedStudySeconds: number;      // e.g. 2100 (35m)
  completedStudyMinutes: number;      // e.g. 35
  remainingTargetMinutes: number;     // e.g. 85 (max(0, original - completed))
  status: DailyTargetStatus;
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
  private static LAST_ACTIVE_DATE_KEY = "studyos_last_active_study_day";
  private static ROLLED_OVER_DATES_KEY = "studyos_rolled_over_study_days";

  /**
   * Generates a stable study-day date string (YYYY-MM-DD) based on the 5:00 AM local cycle boundary.
   * A study day starts at 5:00:00 AM local time and ends at 4:59:59 AM the next calendar day.
   * 
   * Examples:
   * - 2026-10-15 04:30 AM -> Study Day is "2026-10-14" (belongs to previous study cycle)
   * - 2026-10-15 05:00 AM -> Study Day is "2026-10-15" (new study cycle begins)
   * - 2026-10-15 11:30 PM -> Study Day is "2026-10-15"
   * - 2026-10-16 04:59 AM -> Study Day is "2026-10-15" (still part of 15th study cycle)
   * - 2026-10-16 05:00 AM -> Study Day is "2026-10-16" (new study cycle begins)
   */
  static getStudyDayDateString(dateInput?: Date | number, resetHour: number = 5): string {
    const raw = dateInput
      ? typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput
      : new Date();

    // Offset time by resetHour hours so anything before 5:00 AM maps to the previous calendar day
    const effective = new Date(raw.getTime() - resetHour * 60 * 60 * 1000);
    const year = effective.getFullYear();
    const month = String(effective.getMonth() + 1).padStart(2, "0");
    const day = String(effective.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Alias for backwards compatibility, defaults to 5:00 AM cycle date.
   */
  static getLocalDateString(dateInput?: Date | number): string {
    return this.getStudyDayDateString(dateInput, 5);
  }

  /**
   * Reads all daily target records from storage.
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
   * Saves all daily target records to storage.
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
   * Retrieves or initializes a daily subject record for a given subject and study-cycle date.
   */
  static getOrCreateDailyRecord(
    subject: { id: number; name: string; color?: string; daily_target_minutes?: number },
    dateStr?: string
  ): DailySubjectRecord {
    const date = dateStr || this.getStudyDayDateString();
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
   * Saves or updates an existing daily record for a subject.
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
      if (session && session.state !== "CANCELLED" && session.state !== "COMPLETED") {
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

    if (session.state === "CANCELLED" || session.state === "COMPLETED") {
      this.clearPendingSessionForSubject(subjectId);
      return null;
    }
    return session;
  }

  /**
   * Removes pending session for a subject (e.g. upon full target completion or cancellation).
   */
  static clearPendingSessionForSubject(subjectId: number): void {
    if (typeof window === "undefined") return;
    try {
      const all = this.getAllPendingSessions();
      delete all[subjectId];
      localStorage.setItem(this.PENDING_SESSIONS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[StudyOS] Failed to clear pending session:", e);
    }
  }

  /**
   * Records actual focused study time onto the subject's daily target record.
   * 
   * Core Rules:
   * 1. ONLY actual focused study seconds are accumulated. Breaks are not counted as study.
   * 2. If completed minutes < original target:
   *    - Target is marked 'IN_PROGRESS' or 'PENDING_RESUME'.
   *    - Remaining minutes = max(0, originalTarget - completedMinutes).
   *    - Target is NOT marked COMPLETED.
   * 3. If completed minutes >= original target:
   *    - Target is marked 'COMPLETED'.
   *    - Remaining minutes = 0.
   *    - isTargetCompleted = true.
   */
  static recordStudyProgress(
    subjectId: number,
    additionalStudySeconds: number,
    dateStr?: string,
    isEarlyFinish?: boolean
  ): { record: DailySubjectRecord; isTargetCompleted: boolean } {
    const date = dateStr || this.getStudyDayDateString();
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

    let targetStatus: DailyTargetStatus;
    if (isCompleted) {
      targetStatus = "COMPLETED";
    } else if (isEarlyFinish) {
      targetStatus = "PENDING_RESUME";
    } else if (newCompletedMinutes > 0) {
      targetStatus = "IN_PROGRESS";
    } else {
      targetStatus = "NOT_STARTED";
    }

    const updatedRecord: DailySubjectRecord = {
      ...record,
      completedStudySeconds: newCompletedSeconds,
      completedStudyMinutes: newCompletedMinutes,
      remainingTargetMinutes: remainingMinutes,
      status: targetStatus,
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
   * Checks for a 5:00 AM study-cycle rollover and rolls over unfinished daily targets into backlog.
   * 
   * Strict Rules:
   * 1. Rollover evaluates at 5:00 AM local time.
   * 2. Today's targets start fresh for the new study day.
   * 3. Yesterday's unfinished target (original - completed) is rolled over into previous_backlog_minutes.
   * 4. Rollover happens EXACTLY ONCE per calendar study day to prevent duplicate backlog accumulation.
   * 5. Historical records and completed targets remain stored as history and are never wiped.
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

    const currentStudyDayStr = currentDateOverride || this.getStudyDayDateString();
    const lastActiveStudyDay =
      localStorage.getItem(this.LAST_ACTIVE_DATE_KEY) ||
      localStorage.getItem("studyos_last_active_date");

    // Initial run: record current study day, no rollover needed yet
    if (!lastActiveStudyDay) {
      localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, currentStudyDayStr);
      localStorage.setItem("studyos_last_active_date", currentStudyDayStr);
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    // Same study day: no rollover needed
    if (lastActiveStudyDay === currentStudyDayStr) {
      return { updatedSubjects: subjects, rolloverResult: null };
    }

    // A new 5:00 AM study cycle has arrived!
    // Check if we have already rolled over for this past date to prevent duplicate backlog accumulation
    let rolledOverDates: string[] = [];
    try {
      const saved =
        localStorage.getItem(this.ROLLED_OVER_DATES_KEY) ||
        localStorage.getItem("studyos_rolled_over_dates");
      if (saved) rolledOverDates = JSON.parse(saved);
    } catch {}

    if (rolledOverDates.includes(lastActiveStudyDay)) {
      // Already rolled over this past study day
      localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, currentStudyDayStr);
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
      const pastKey = `target_${subj.id}_${lastActiveStudyDay}`;
      const pastRecord = allRecords[pastKey];

      let unfinishedMins = 0;
      if (pastRecord) {
        unfinishedMins = pastRecord.remainingTargetMinutes;
      } else {
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

    // Mark past date as rolled over to guarantee idempotency
    rolledOverDates.push(lastActiveStudyDay);
    localStorage.setItem(this.ROLLED_OVER_DATES_KEY, JSON.stringify(rolledOverDates));
    localStorage.setItem("studyos_rolled_over_dates", JSON.stringify(rolledOverDates));
    localStorage.setItem(this.LAST_ACTIVE_DATE_KEY, currentStudyDayStr);
    localStorage.setItem("studyos_last_active_date", currentStudyDayStr);

    const rolloverResult: DayRolloverResult = {
      previousDate: lastActiveStudyDay,
      currentDate: currentStudyDayStr,
      carriedOverBacklogs,
    };

    return { updatedSubjects, rolloverResult };
  }
}
