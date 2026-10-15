"use client";

import React, { useState, useEffect } from "react";
import Navigation, { NavTab } from "@/components/Navigation";
import DashboardView from "@/components/DashboardView";
import PlannerModule from "@/components/PlannerModule";
import SubjectsModule from "@/components/SubjectsModule";
import ResourcesModule from "@/components/ResourcesModule";
import MaterialsAndNotesModule from "@/components/MaterialsAndNotesModule";
import AnalyticsModule from "@/components/AnalyticsModule";
import TimetableModule from "@/components/TimetableModule";
import FocusModeModal from "@/components/FocusModeModal";
import TimerSetupModal from "@/components/TimerSetupModal";
import AvailableTimeModal from "@/components/AvailableTimeModal";
import AuthModal from "@/components/AuthModal";

import { ApiClient } from "@/lib/api";
import { OfflineStorage } from "@/lib/offlineDb";
import {
  ActiveSessionData,
  TimerEngine,
} from "@/lib/timerEngine";
import {
  AvailableTimeSettings,
  AvailableTimeEngine,
} from "@/lib/availableTimeEngine";
import {
  BacklogEngine,
  ReallocationResult,
} from "@/lib/backlogEngine";
import { DailySessionEngine } from "@/lib/dailySessionEngine";
import {
  INITIAL_SUBJECTS,
  INITIAL_RESOURCES,
  INITIAL_TASKS,
  INITIAL_NOTES,
  INITIAL_TIMETABLE,
} from "@/lib/initialData";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [user, setUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTimerSetupOpen, setIsTimerSetupOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isAvailableTimeModalOpen, setIsAvailableTimeModalOpen] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<number | undefined>(undefined);

  // Available Time Settings State
  const [availableSettings, setAvailableSettings] = useState<AvailableTimeSettings>(() =>
    AvailableTimeEngine.getSettings()
  );

  // Core Data States
  const [subjects, setSubjects] = useState<any[]>(INITIAL_SUBJECTS);
  const [tasks, setTasks] = useState<any[]>(INITIAL_TASKS);
  const [resources, setResources] = useState<any[]>(INITIAL_RESOURCES);
  const [notes, setNotes] = useState<any[]>(INITIAL_NOTES);
  const [timetable, setTimetable] = useState<any[]>(INITIAL_TIMETABLE);
  const [saturdayMode, setSaturdayMode] = useState<string>("COLLEGE");

  // Timer Session State
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);

  // Confirmed Study Plan State
  const [confirmedPlan, setConfirmedPlan] = useState<ReallocationResult | null>(() =>
    BacklogEngine.getConfirmedPlan()
  );

  // Analytics & History
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [completedSessionsHistory, setCompletedSessionsHistory] = useState<any[]>([]);

  // Initialize client and offline cache on mount
  useEffect(() => {
    ApiClient.init();

    // Check saved user
    const savedUser = localStorage.getItem("studyos_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }

    // Check active timer session
    const savedSession = TimerEngine.getActiveSession();
    if (savedSession) {
      setActiveSession(savedSession);
      if (savedSession.state === "COMPLETED") {
        setIsFocusModalOpen(true);
      }
    }

    // Check completed sessions history
    const savedHistory = localStorage.getItem("studyos_completed_sessions");
    if (savedHistory) {
      try {
        setCompletedSessionsHistory(JSON.parse(savedHistory));
      } catch {}
    }

    // Day rollover check (yesterday's unfinished targets rolled into backlog without duplication)
    const { updatedSubjects, rolloverResult } = DailySessionEngine.checkAndHandleDayRollover(INITIAL_SUBJECTS);
    if (rolloverResult && rolloverResult.carriedOverBacklogs.length > 0) {
      setSubjects(updatedSubjects);
      OfflineStorage.setCached("studyos_subjects", updatedSubjects);
    }

    loadInitialData();
  }, []);

  // Save active session changes
  useEffect(() => {
    TimerEngine.saveActiveSession(activeSession);
  }, [activeSession]);

  const loadInitialData = async () => {
    try {
      if (ApiClient.isAuthenticated()) {
        const [subjs, tsk, res, nts, anl] = await Promise.allSettled([
          ApiClient.request<any[]>("/subjects/"),
          ApiClient.request<any[]>("/tasks/"),
          ApiClient.request<any[]>("/resources/"),
          ApiClient.request<any[]>("/notes/"),
          ApiClient.request<any>("/analytics/"),
        ]);

        if (subjs.status === "fulfilled" && subjs.value.length > 0) setSubjects(subjs.value);
        if (tsk.status === "fulfilled" && tsk.value.length > 0) setTasks(tsk.value);
        if (res.status === "fulfilled" && res.value.length > 0) setResources(res.value);
        if (nts.status === "fulfilled" && nts.value.length > 0) setNotes(nts.value);
        if (anl.status === "fulfilled") setAnalyticsData(anl.value);
        return;
      }
    } catch {
      // Backend unreachable or offline, fallback to local storage
    }

    // Try IndexedDB cache
    const cachedSubjects = await OfflineStorage.getCached<any[]>("studyos_subjects");
    if (cachedSubjects && cachedSubjects.length > 0) setSubjects(cachedSubjects);

    const cachedNotes = await OfflineStorage.getCached<any[]>("studyos_notes");
    if (cachedNotes && cachedNotes.length > 0) setNotes(cachedNotes);
  };

  // Available Time Settings Save
  const handleSaveAvailableSettings = (newSettings: AvailableTimeSettings) => {
    setAvailableSettings(newSettings);
    AvailableTimeEngine.saveSettings(newSettings);

    // Auto-update plan to match new capacity if one exists
    const cap = AvailableTimeEngine.calculateTodayCapacity(newSettings);
    const workloads = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color || "#10b981",
      priority: s.priority || 2,
      daily_target_minutes: s.daily_target_minutes || 60,
      completed_today_minutes: Math.round((s.total_focused_study_seconds || 0) / 60),
      previous_backlog_minutes: s.previous_backlog_minutes || 0,
    }));
    const newPlan = BacklogEngine.allocateBacklog(workloads, cap.netAvailableMinutes);
    setConfirmedPlan(newPlan);
    BacklogEngine.saveConfirmedPlan(newPlan);
  };

  // Start Focus Block from Setup Modal or Direct Subject Action
  const handleOpenTimerSetup = (subjectId?: number) => {
    setPreselectedSubjectId(subjectId);
    setIsTimerSetupOpen(true);
  };

  const handleStartSession = async (subjectId: number, blockMinutes: number, taskId?: number) => {
    const subject = subjects.find((s) => s.id === subjectId) || subjects[0];
    const task = tasks.find((t) => t.id === taskId);

    // Creates session in READY state (idle countdown, 0 fake records)
    const newSession = TimerEngine.createInitialSession({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color || "#10b981",
      totalBlockMinutes: blockMinutes,
      taskTitle: task?.title,
    });

    setActiveSession(newSession);
    TimerEngine.saveActiveSession(newSession);
    DailySessionEngine.savePendingSessionForSubject(subject.id, newSession);
    setIsTimerSetupOpen(false);
    setIsFocusModalOpen(true);
  };

  const handleResumeSession = (pending: ActiveSessionData) => {
    setActiveSession(pending);
    TimerEngine.saveActiveSession(pending);
    setIsTimerSetupOpen(false);
    setIsFocusModalOpen(true);
  };

  const handleCompleteSession = async (session: ActiveSessionData) => {
    if (session.state === "CANCELLED") {
      DailySessionEngine.clearPendingSessionForSubject(session.subjectId);
      setActiveSession(null);
      TimerEngine.saveActiveSession(null);
      setIsFocusModalOpen(false);
      return;
    }

    if (session.state === "COMPLETED") {
      const actualStudyMins = Math.round(session.accumulatedStudySeconds / 60);
      const actualBreakMins = Math.round(session.accumulatedBreakSeconds / 60);

      // Record actual focused study onto the subject's daily target record
      DailySessionEngine.recordStudyProgress(session.subjectId, session.accumulatedStudySeconds);
      // Clear pending session for this subject upon block completion
      DailySessionEngine.clearPendingSessionForSubject(session.subjectId);

      const record = {
        id: session.sessionId,
        subjectName: session.subjectName,
        totalBlockMinutes: session.totalBlockMinutes,
        accumulatedStudySeconds: session.accumulatedStudySeconds,
        accumulatedBreakSeconds: session.accumulatedBreakSeconds,
        isEarlyFinish: session.isEarlyFinish,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updatedHistory = [record, ...completedSessionsHistory];
      setCompletedSessionsHistory(updatedHistory);
      localStorage.setItem("studyos_completed_sessions", JSON.stringify(updatedHistory));

      // Increment completed minutes on the target subject using ONLY actual focused study seconds!
      setSubjects((prev) => {
        const updated = prev.map((s) => {
          if (s.id === session.subjectId) {
            const newTotalSecs = (s.total_focused_study_seconds || 0) + session.accumulatedStudySeconds;
            const newCompletedMins = Math.round(newTotalSecs / 60);
            return {
              ...s,
              total_focused_study_seconds: newTotalSecs,
              completed_today_minutes: newCompletedMins,
            };
          }
          return s;
        });
        OfflineStorage.setCached("studyos_subjects", updated);
        return updated;
      });

      // Update analytics with actual focused study and break times
      setAnalyticsData((prev: any) => ({
        ...prev,
        today_focused_minutes:
          (prev?.today_focused_minutes || 0) + actualStudyMins,
        today_break_minutes:
          (prev?.today_break_minutes || 0) + actualBreakMins,
      }));

      // Keep activeSession in COMPLETED state so FocusModeModal renders Step C (Completion Summary)!
      setActiveSession(session);
      TimerEngine.saveActiveSession(session);

      // Sync with backend if authenticated
      try {
        if (ApiClient.isAuthenticated()) {
          await ApiClient.request("/sessions/complete/", {
            method: "POST",
            body: JSON.stringify({
              session_id: session.sessionId,
              accumulated_study_seconds: session.accumulatedStudySeconds,
              accumulated_break_seconds: session.accumulatedBreakSeconds,
              is_early_finish: session.isEarlyFinish,
            }),
          });
        }
      } catch {}
    }
  };

  const handleDismissCompletedSession = () => {
    if (activeSession) {
      DailySessionEngine.clearPendingSessionForSubject(activeSession.subjectId);
    }
    setActiveSession(null);
    TimerEngine.saveActiveSession(null);
    setIsFocusModalOpen(false);
  };

  // Backlog Reallocation Trigger
  const handleTriggerReallocation = () => {
    const cap = AvailableTimeEngine.calculateTodayCapacity(availableSettings);
    const workloads = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color || "#10b981",
      priority: s.priority || 2,
      daily_target_minutes: s.daily_target_minutes || 60,
      completed_today_minutes: Math.round((s.total_focused_study_seconds || 0) / 60),
      previous_backlog_minutes: s.previous_backlog_minutes || 0,
      deadline: s.deadline,
    }));

    const result = BacklogEngine.allocateBacklog(workloads, cap.netAvailableMinutes);
    setConfirmedPlan(result);
    BacklogEngine.saveConfirmedPlan(result);
    setCurrentTab("planner");
  };

  // Subject Actions
  const handleAddSubject = (newSubj: any) => {
    const updated = [...subjects, newSubj];
    setSubjects(updated);
    OfflineStorage.setCached("studyos_subjects", updated);
  };

  const handleUpdateSubject = (updatedSubj: any) => {
    const updated = subjects.map((s) => (s.id === updatedSubj.id ? updatedSubj : s));
    setSubjects(updated);
    OfflineStorage.setCached("studyos_subjects", updated);
  };

  const handleDeleteSubject = (id: number) => {
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    OfflineStorage.setCached("studyos_subjects", updated);
  };

  // Task Actions
  const handleAddTask = (newTask: any) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED" }
          : t
      )
    );
  };

  const handleDeleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Resource Actions
  const handleAddResource = (newRes: any) => {
    setResources((prev) => [newRes, ...prev]);
  };

  const handleToggleResourceApproval = (id: number) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: !r.is_approved } : r))
    );
  };

  const handleToggleResourceFocus = (id: number) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_enabled_for_focus: !r.is_enabled_for_focus } : r
      )
    );
  };

  const handleDeleteResource = (id: number) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  // Note Actions
  const handleAddNote = (newNote: any) => {
    const updated = [newNote, ...notes];
    setNotes(updated);
    OfflineStorage.setCached("studyos_notes", updated);
  };

  const handleUpdateNote = (updatedNote: any) => {
    const updated = notes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
    setNotes(updated);
    OfflineStorage.setCached("studyos_notes", updated);
  };

  const handleDeleteNote = (id: number) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    OfflineStorage.setCached("studyos_notes", updated);
  };

  // Optional Timetable Actions
  const handleAddTimetableEntry = (entry: any) => {
    setTimetable((prev) => [...prev, entry]);
  };

  const handleDeleteTimetableEntry = (id: number) => {
    setTimetable((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenSubjectSession = (subjId?: number) => {
    if (subjId) {
      const pending = DailySessionEngine.getPendingSessionForSubject(subjId);
      if (pending) {
        setActiveSession(pending);
        TimerEngine.saveActiveSession(pending);
        setIsFocusModalOpen(true);
        return;
      }
    }
    if (activeSession && (!subjId || activeSession.subjectId === subjId)) {
      setIsFocusModalOpen(true);
    } else {
      handleOpenTimerSetup(subjId);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full min-w-0 theme-bg theme-text-primary transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenTimerModal={() => {
          if (activeSession) {
            setIsFocusModalOpen(true);
          } else {
            handleOpenTimerSetup();
          }
        }}
        hasActiveSession={!!activeSession}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          ApiClient.clearTokens();
          setUser(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 p-3 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        {currentTab === "dashboard" && (
          <DashboardView
            activeSession={activeSession}
            onOpenTimerModal={handleOpenSubjectSession}
            subjects={subjects}
            availableSettings={availableSettings}
            onOpenAvailableTimeModal={() => setIsAvailableTimeModalOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            analyticsData={analyticsData}
            onTriggerReallocation={handleTriggerReallocation}
            confirmedPlan={confirmedPlan}
          />
        )}

        {currentTab === "planner" && (
          <PlannerModule
            subjects={subjects}
            tasks={tasks}
            availableSettings={availableSettings}
            onOpenAvailableTimeModal={() => setIsAvailableTimeModalOpen(true)}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            confirmedPlan={confirmedPlan}
            onSaveConfirmedPlan={(plan) => {
              setConfirmedPlan(plan);
              BacklogEngine.saveConfirmedPlan(plan);
            }}
            onStartSessionForSubject={(subjId, mins) => {
              handleStartSession(subjId, mins);
            }}
          />
        )}

        {currentTab === "subjects" && (
          <SubjectsModule
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            onStartSessionForSubject={(subjId, mins) => {
              handleOpenSubjectSession(subjId);
            }}
          />
        )}

        {currentTab === "resources" && (
          <ResourcesModule
            resources={resources}
            subjects={subjects}
            onAddResource={handleAddResource}
            onToggleApproval={handleToggleResourceApproval}
            onToggleFocus={handleToggleResourceFocus}
            onDeleteResource={handleDeleteResource}
          />
        )}

        {currentTab === "materials" && (
          <MaterialsAndNotesModule
            notes={notes}
            subjects={subjects}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {currentTab === "analytics" && (
          <AnalyticsModule
            analyticsData={analyticsData}
            subjects={subjects}
            completedSessionsHistory={completedSessionsHistory}
          />
        )}

        {currentTab === "timetable" && (
          <TimetableModule
            timetable={timetable}
            subjects={subjects}
            onAddEntry={handleAddTimetableEntry}
            onDeleteEntry={handleDeleteTimetableEntry}
            saturdayMode={saturdayMode}
            onChangeSaturdayMode={(mode) => setSaturdayMode(mode)}
          />
        )}
      </main>

      {/* Available Time & Routine Modal */}
      <AvailableTimeModal
        isOpen={isAvailableTimeModalOpen}
        onClose={() => setIsAvailableTimeModalOpen(false)}
        settings={availableSettings}
        onSaveSettings={handleSaveAvailableSettings}
      />

      {/* Timer Setup Modal */}
      <TimerSetupModal
        isOpen={isTimerSetupOpen}
        onClose={() => setIsTimerSetupOpen(false)}
        subjects={subjects}
        tasks={tasks}
        preselectedSubjectId={preselectedSubjectId}
        onStartSession={handleStartSession}
        onResumeSession={handleResumeSession}
      />

      {/* Focus Mode Fullscreen Modal */}
      {isFocusModalOpen && activeSession && (
        <FocusModeModal
          session={activeSession}
          onUpdateSession={(updated) => {
            setActiveSession(updated);
            TimerEngine.saveActiveSession(updated);
            if (updated.state === "PAUSED" || updated.state === "STUDYING" || updated.state === "READY") {
              DailySessionEngine.savePendingSessionForSubject(updated.subjectId, updated);
            }
            if (updated.state === "PAUSED") {
              DailySessionEngine.recordStudyProgress(updated.subjectId, 0);
            }
          }}
          onClose={() => setIsFocusModalOpen(false)}
          onCompleteSession={handleCompleteSession}
          onNavigateTab={(tab) => {
            setIsFocusModalOpen(false);
            setCurrentTab(tab);
          }}
          onOpenTimerSetup={() => {
            setIsFocusModalOpen(false);
            handleOpenTimerSetup();
          }}
          onDismissCompletedSession={handleDismissCompletedSession}
          approvedResources={resources.filter((r) => r.is_approved && r.is_enabled_for_focus)}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
