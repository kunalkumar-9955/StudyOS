"use client";

import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Coffee,
  AlertCircle,
  Check,
} from "lucide-react";

interface TimetableModuleProps {
  timetable: any[];
  subjects: any[];
  onAddEntry: (entry: any) => void;
  onDeleteEntry: (id: number) => void;
  saturdayMode: string;
  onChangeSaturdayMode: (mode: string) => void;
}

export default function TimetableModule({
  timetable,
  subjects,
  onAddEntry,
  onDeleteEntry,
  saturdayMode,
  onChangeSaturdayMode,
}: TimetableModuleProps) {
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Form state
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [classroom, setClassroom] = useState("");
  const [subjectId, setSubjectId] = useState<number | null>(subjects[0]?.id || null);
  const [isBreak, setIsBreak] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const filteredEntries = timetable
    .filter((e) => e.day_of_week === activeDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("Please enter a title for the period.");
      return;
    }

    if (endTime <= startTime) {
      setValidationError("End time must be after start time.");
      return;
    }

    const hasOverlap = filteredEntries.some(
      (entry) =>
        (startTime >= entry.start_time && startTime < entry.end_time) ||
        (endTime > entry.start_time && endTime <= entry.end_time) ||
        (startTime <= entry.start_time && endTime >= entry.end_time)
    );

    if (hasOverlap) {
      setValidationError("Warning: This period overlaps with an existing class or break on this day.");
      return;
    }

    onAddEntry({
      id: Date.now(),
      day_of_week: activeDay,
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      classroom: classroom.trim(),
      is_break: isBreak,
      subject_id: isBreak ? null : subjectId,
    });

    setTitle("");
    setClassroom("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Module Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span>OPTIONAL UTILITY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Class Timetable (Optional)
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Secondary schedule for lectures and university periods. This is completely optional and never blocks your self-study workflow.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 theme-card border theme-border rounded-xl px-3 py-1.5 text-xs">
            <span className="theme-text-muted">Saturday Mode:</span>
            <select
              value={saturdayMode}
              onChange={(e) => onChangeSaturdayMode(e.target.value)}
              className="bg-transparent font-bold theme-text-primary focus:outline-none"
            >
              <option value="COLLEGE" className="theme-card">College Day</option>
              <option value="REST" className="theme-card">Rest Day</option>
              <option value="SELF_STUDY" className="theme-card">Flexible Self-Study</option>
            </select>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-600/25"
          >
            <Plus className="w-4 h-4" />
            Add Period
          </button>
        </div>
      </div>

      {/* Weekday Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {days.map((day, idx) => {
          const count = timetable.filter((t) => t.day_of_week === idx).length;
          const active = activeDay === idx;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                active
                  ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/25"
                  : "theme-card theme-text-muted hover:theme-text-primary theme-border"
              }`}
            >
              {day}
              {count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? "bg-white/20 text-white" : "theme-card-subtle theme-text-dim"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* New Period Modal / Form */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="glass-panel-elevated rounded-2xl p-4 sm:p-6 theme-border space-y-4 max-w-xl text-xs"
        >
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="font-bold text-sm theme-text-primary flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-500" />
              Add Period for {days[activeDay]}
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="theme-text-muted hover:theme-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold theme-text-secondary mb-1">
                Period Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems Lab or Lunch Break"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Classroom / Hall (Optional)
              </label>
              <input
                type="text"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                placeholder="e.g. Lab 4 or Hall A-201"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <label className="flex items-center gap-2 font-semibold theme-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBreak}
                  onChange={(e) => setIsBreak(e.target.checked)}
                  className="rounded border-slate-400 text-sky-600 focus:ring-0"
                />
                <span>Recess / Lunch Period</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/25 cursor-pointer"
            >
              Save Period
            </button>
          </div>
        </form>
      )}

      {/* Daily Periods List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 theme-border text-center text-xs theme-text-muted space-y-2">
            <Calendar className="w-8 h-8 mx-auto theme-text-dim" />
            <p className="font-bold text-sm theme-text-primary">
              No classes configured for {days[activeDay]}.
            </p>
            <p>You can add classes if you wish, or ignore this optional module.</p>
          </div>
        ) : (
          filteredEntries.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border theme-border flex items-center justify-between gap-4 transition-all ${
                item.is_break
                  ? "theme-card-subtle border-dashed theme-text-muted"
                  : "theme-card hover:border-slate-500/40"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.is_break
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-sky-500/10 text-sky-500"
                  }`}
                >
                  {item.is_break ? <Coffee className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>

                <div>
                  <h4 className="font-bold text-sm theme-text-primary flex items-center gap-2">
                    {item.title}
                    {item.is_break && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold">
                        Recess
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-3 text-xs theme-text-muted mt-1">
                    <span className="font-mono">
                      {item.start_time} - {item.end_time}
                    </span>
                    {item.classroom && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.classroom}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteEntry(item.id)}
                className="p-2 rounded-lg theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete period"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
