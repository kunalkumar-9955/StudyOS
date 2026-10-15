"use client";

import React, { useState } from "react";
import { X, Clock, Sun, Moon, Utensils, Activity, Save, Check } from "lucide-react";
import {
  AvailableTimeSettings,
  AvailableTimeEngine,
} from "@/lib/availableTimeEngine";

interface AvailableTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AvailableTimeSettings;
  onSaveSettings: (settings: AvailableTimeSettings) => void;
}

export default function AvailableTimeModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: AvailableTimeModalProps) {
  const [baseDailyStudyMinutes, setBaseDailyStudyMinutes] = useState(
    settings.baseDailyStudyMinutes
  );
  const [wakeUpTime, setWakeUpTime] = useState(settings.wakeUpTime);
  const [sleepTime, setSleepTime] = useState(settings.sleepTime);
  const [mealsAndPersonal, setMealsAndPersonal] = useState(
    settings.mealsAndPersonalMinutes
  );
  const [walkingAndHealth, setWalkingAndHealth] = useState(
    settings.walkingAndHealthMinutes
  );
  const [fixedCommitments, setFixedCommitments] = useState(
    settings.fixedCommitmentsMinutes
  );
  const [todayOverride, setTodayOverride] = useState<number | null>(
    settings.todayOverrideMinutes
  );

  if (!isOpen) return null;

  const currentCapacity = AvailableTimeEngine.calculateTodayCapacity({
    baseDailyStudyMinutes,
    wakeUpTime,
    sleepTime,
    mealsAndPersonalMinutes: mealsAndPersonal,
    walkingAndHealthMinutes: walkingAndHealth,
    fixedCommitmentsMinutes: fixedCommitments,
    todayOverrideMinutes: todayOverride,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AvailableTimeSettings = {
      baseDailyStudyMinutes,
      wakeUpTime,
      sleepTime,
      mealsAndPersonalMinutes: mealsAndPersonal,
      walkingAndHealthMinutes: walkingAndHealth,
      fixedCommitmentsMinutes: fixedCommitments,
      todayOverrideMinutes: todayOverride,
    };
    onSaveSettings(updated);
    onClose();
  };

  const presetOverrides = [180, 240, 300, 360, 420, 480];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-lg border theme-border p-4 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                Available Time & Capacity Settings
              </h3>
              <p className="text-xs theme-text-muted">
                Configure your daily study capacity independently of college schedules
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

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Quick Override for Today */}
          <div className="p-4 rounded-xl theme-card-subtle border theme-border space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold theme-text-primary">
                Today's Manual Capacity Adjustment
              </label>
              {todayOverride !== null && (
                <button
                  type="button"
                  onClick={() => setTodayOverride(null)}
                  className="text-[11px] text-amber-500 hover:underline font-semibold cursor-pointer"
                >
                  Reset to Routine
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {presetOverrides.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTodayOverride(mins)}
                  className={`py-1.5 px-2 rounded-lg font-semibold border transition-all cursor-pointer ${
                    todayOverride === mins
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "theme-card theme-text-secondary theme-border hover:border-emerald-500/40"
                  }`}
                >
                  {mins / 60}h
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="theme-text-muted">Or custom minutes:</span>
              <input
                type="number"
                min="30"
                max="900"
                step="15"
                value={todayOverride ?? baseDailyStudyMinutes}
                onChange={(e) => setTodayOverride(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded theme-input text-center font-bold"
              />
              <span className="theme-text-muted">
                ({Math.round(((todayOverride ?? baseDailyStudyMinutes) / 60) * 10) / 10} hours)
              </span>
            </div>
          </div>

          {/* Routine & Sleep Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold theme-text-secondary block mb-1 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Wake-Up Time
              </label>
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold theme-text-secondary block mb-1 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Sleep Time
              </label>
              <input
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold theme-text-secondary block mb-1 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-sky-400" />
                Meals & Personal (Min)
              </label>
              <input
                type="number"
                min="0"
                max="300"
                step="15"
                value={mealsAndPersonal}
                onChange={(e) => setMealsAndPersonal(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold theme-text-secondary block mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Exercise & Walk (Min)
              </label>
              <input
                type="number"
                min="0"
                max="240"
                step="15"
                value={walkingAndHealth}
                onChange={(e) => setWalkingAndHealth(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg theme-input text-xs"
                required
              />
            </div>
          </div>

          {/* Real Net Capacity Output */}
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                Calculated Study Capacity: {currentCapacity.netAvailableMinutes} minutes ({currentCapacity.netAvailableHours} hours)
              </p>
              <p className="text-[11px] theme-text-muted mt-0.5">
                {currentCapacity.isOverridden
                  ? "Manual daily override active for today."
                  : `Waking window (${Math.round(currentCapacity.totalWindowMinutes / 60)}h) minus routine deductions (${currentCapacity.totalDeductionsMinutes}m).`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-text-muted hover:theme-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Apply Capacity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
