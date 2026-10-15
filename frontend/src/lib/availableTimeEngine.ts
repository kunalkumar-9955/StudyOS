/**
 * StudyOS Available Time Engine
 * Calculates net available study capacity independently of college schedules.
 * Accounts for sleep, meals, personal routines, and manual daily capacity overrides.
 */

export interface AvailableTimeSettings {
  baseDailyStudyMinutes: number; // e.g. 360 minutes (6h)
  wakeUpTime: string; // "07:00"
  sleepTime: string; // "23:00"
  mealsAndPersonalMinutes: number; // 90m
  walkingAndHealthMinutes: number; // 60m
  fixedCommitmentsMinutes: number; // 0m
  todayOverrideMinutes: number | null; // null if using calculated
}

export const DEFAULT_AVAILABLE_TIME_SETTINGS: AvailableTimeSettings = {
  baseDailyStudyMinutes: 360, // 6 hours default
  wakeUpTime: "07:00",
  sleepTime: "23:00",
  mealsAndPersonalMinutes: 90,
  walkingAndHealthMinutes: 60,
  fixedCommitmentsMinutes: 0,
  todayOverrideMinutes: null,
};

export class AvailableTimeEngine {
  private static STORAGE_KEY = "studyos_available_time_settings";

  static getSettings(): AvailableTimeSettings {
    if (typeof window === "undefined") return DEFAULT_AVAILABLE_TIME_SETTINGS;
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return DEFAULT_AVAILABLE_TIME_SETTINGS;
      return { ...DEFAULT_AVAILABLE_TIME_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_AVAILABLE_TIME_SETTINGS;
    }
  }

  static saveSettings(settings: AvailableTimeSettings): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  /**
   * Calculates net available study capacity for today.
   */
  static calculateTodayCapacity(settings: AvailableTimeSettings): {
    totalWindowMinutes: number;
    totalDeductionsMinutes: number;
    netAvailableMinutes: number;
    netAvailableHours: number;
    isOverridden: boolean;
  } {
    if (settings.todayOverrideMinutes !== null && settings.todayOverrideMinutes >= 0) {
      return {
        totalWindowMinutes: settings.todayOverrideMinutes,
        totalDeductionsMinutes: 0,
        netAvailableMinutes: settings.todayOverrideMinutes,
        netAvailableHours: Math.round((settings.todayOverrideMinutes / 60) * 10) / 10,
        isOverridden: true,
      };
    }

    // Calculate waking window: e.g. 07:00 to 23:00 = 16 hours = 960 minutes
    const [wakeH, wakeM] = settings.wakeUpTime.split(":").map(Number);
    const [sleepH, sleepM] = settings.sleepTime.split(":").map(Number);

    let wakingMinutes = 0;
    if (sleepH >= wakeH) {
      wakingMinutes = (sleepH * 60 + sleepM) - (wakeH * 60 + wakeM);
    } else {
      wakingMinutes = (24 * 60 - (wakeH * 60 + wakeM)) + (sleepH * 60 + sleepM);
    }

    const totalDeductions =
      settings.mealsAndPersonalMinutes +
      settings.walkingAndHealthMinutes +
      settings.fixedCommitmentsMinutes;

    // Remaining waking free time
    const potentialMax = Math.max(0, wakingMinutes - totalDeductions);
    // Capped by base daily study preference so user isn't forced to study 14 hours
    const netAvailable = Math.min(settings.baseDailyStudyMinutes, potentialMax);

    return {
      totalWindowMinutes: wakingMinutes,
      totalDeductionsMinutes: totalDeductions,
      netAvailableMinutes: netAvailable,
      netAvailableHours: Math.round((netAvailable / 60) * 10) / 10,
      isOverridden: false,
    };
  }
}
