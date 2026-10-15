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
import LandingPage from "@/components/LandingPage";

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

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [user, setUser] = useState<any | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTimerSetupOpen, setIsTimerSetupOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isAvailableTimeModalOpen, setIsAvailableTimeModalOpen] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<number | undefined>(undefined);

  // Available Time Settings State
  const [availableSettings, setAvailableSettings] = useState<AvailableTimeSettings>(() =>
    AvailableTimeEngine.getSettings()
  );

  // Core Data States (Start empty for genuine per-user data persistence)
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
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

  // Initialize client and check authenticated user on mount
  useEffect(() => {
    ApiClient.init();

    // Check saved user session
    const savedUser = localStorage.getItem("studyos_user");
    const hasToken = ApiClient.isAuthenticated();

    if (savedUser && hasToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch {
        ApiClient.clearTokens();
        setUser(null);
      }
    } else if (!hasToken) {
      setUser(null);
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
  }, []);

  // When user is authenticated, load their personal backend data and check 5:00 AM rollover
  useEffect(() => {
    if (user && ApiClient.isAuthenticated()) {
      loadUserData();
    }
  }, [user]);

  // Save active session changes
  useEffect(() => {
    TimerEngine.saveActiveSession(activeSession);
  }, [activeSession]);

  // Active study session guard: prevent accidental browser reload or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        activeSession &&
        (activeSession.state === "STUDYING" || activeSession.state === "BREAK")
      ) {
        e.preventDefault();
        e.returnValue =
          "An active study session is in progress. Leaving will pause your session.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeSession]);

  // Active study session guard: intercept browser back navigation
  useEffect(() => {
    if (
      isFocusModalOpen &&
      activeSession &&
      (activeSession.state === "STUDYING" || activeSession.state === "BREAK")
    ) {
      window.history.pushState({ inFocus: true }, "");

      const handlePopState = () => {
        // Automatically pause session safely without resetting timer
        const paused = TimerEngine.pauseSession(activeSession);
        setActiveSession(paused);
        TimerEngine.saveActiveSession(paused);
        DailySessionEngine.savePendingSessionForSubject(paused.subjectId, paused);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [isFocusModalOpen, activeSession]);

  const loadUserData = async () => {
    try {
      if (ApiClient.isAuthenticated()) {
        const [subjs, tsk, res, nts, anl, ttbl] = await Promise.allSettled([
          ApiClient.request<any[]>("/subjects/"),
          ApiClient.request<any[]>("/tasks/"),
          ApiClient.request<any[]>("/resources/"),
          ApiClient.request<any[]>("/notes/"),
          ApiClient.request<any>("/analytics/"),
          ApiClient.request<any[]>("/timetable/"),
        ]);

        let loadedSubjects: any[] = [];
        if (subjs.status === "fulfilled" && Array.isArray(subjs.value)) {
          loadedSubjects = subjs.value;
          setSubjects(loadedSubjects);
        }
        if (tsk.status === "fulfilled" && Array.isArray(tsk.value)) {
          setTasks(tsk.value);
        }
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          setResources(res.value);
        }
        if (nts.status === "fulfilled" && Array.isArray(nts.value)) {
          setNotes(nts.value);
        }
        if (anl.status === "fulfilled") {
          setAnalyticsData(anl.value);
        }
        if (ttbl.status === "fulfilled" && Array.isArray(ttbl.value)) {
          setTimetable(ttbl.value);
        }

        // 5:00 AM Study Day rollover check for this user's subjects
        if (loadedSubjects.length > 0) {
          const { updatedSubjects, rolloverResult } =
            DailySessionEngine.checkAndHandleDayRollover(loadedSubjects);
          if (rolloverResult && rolloverResult.carriedOverBacklogs.length > 0) {
            setSubjects(updatedSubjects);
          }
        }
        return;
      }
    } catch (e) {
      console.warn("[StudyOS] Backend sync error, falling back to cached state:", e);
    }
  };

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    ApiClient.clearTokens();
    setUser(null);
    setSubjects([]);
    setTasks([]);
    setResources([]);
    setNotes([]);
    setTimetable([]);
    setAnalyticsData(null);
    setActiveSession(null);
    TimerEngine.saveActiveSession(null);
    setCurrentTab("dashboard");
  };

  // Available Time Settings Save
  const handleSaveAvailableSettings = (newSettings: AvailableTimeSettings) => {
    setAvailableSettings(newSettings);
    AvailableTimeEngine.saveSettings(newSettings);

    const cap = AvailableTimeEngine.calculateTodayCapacity(newSettings);
    const workloads = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color || "#10b981",
      priority: s.priority || 2,
      daily_target_minutes: s.daily_target_minutes || 60,
      completed_today_minutes: Math.round(
        (s.total_focused_study_seconds || 0) / 60
      ),
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

  const handleStartSession = async (
    subjectId: number,
    blockMinutes: number,
    taskId?: number
  ) => {
    const subject =
      subjects.find((s) => s.id === subjectId) ||
      subjects[0] || { id: subjectId, name: `Subject #${subjectId}`, color: "#10b981" };
    const task = tasks.find((t) => t.id === taskId);

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

  /**
   * Completes or finalizes a focus block.
   * 
   * Strict Behavior:
   * 1. Records actual focused study seconds onto the subject's daily target.
   * 2. If target is NOT fully completed (e.g. 35m done out of 120m target):
   *    - The remaining minutes (85m) are preserved as PENDING_RESUME.
   *    - A pending resumable session is preserved for this subject.
   *    - The target is NOT marked completed and NOT reset.
   * 3. If target IS fully completed:
   *    - The target is marked COMPLETED.
   *    - Pending session is cleared. Resume is not offered.
   */
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
      const { record, isTargetCompleted } = DailySessionEngine.recordStudyProgress(
        session.subjectId,
        session.accumulatedStudySeconds,
        undefined,
        session.isEarlyFinish
      );

      if (isTargetCompleted) {
        // Full daily target completed! Clear pending session so resume is not offered
        DailySessionEngine.clearPendingSessionForSubject(session.subjectId);
      } else {
        // Partial target completed: preserve remaining unfinished target as pending & resumable!
        const remainingMinutes = record.remainingTargetMinutes;
        const pendingSession: ActiveSessionData = {
          ...session,
          state: "PAUSED",
          totalBlockMinutes: remainingMinutes,
          currentSegmentIndex: 0,
          currentSegmentStartedAt: null,
          isEarlyFinish: false,
        };
        DailySessionEngine.savePendingSessionForSubject(
          session.subjectId,
          pendingSession
        );
      }

      // Add to completed sessions history
      const historyItem = {
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

      const updatedHistory = [historyItem, ...completedSessionsHistory];
      setCompletedSessionsHistory(updatedHistory);
      localStorage.setItem(
        "studyos_completed_sessions",
        JSON.stringify(updatedHistory)
      );

      // Increment completed minutes on the target subject using ONLY actual focused study seconds!
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id === session.subjectId) {
            const newTotalSecs =
              (s.total_focused_study_seconds || 0) + session.accumulatedStudySeconds;
            const newCompletedMins = Math.round(newTotalSecs / 60);
            return {
              ...s,
              total_focused_study_seconds: newTotalSecs,
              completed_today_minutes: newCompletedMins,
            };
          }
          return s;
        })
      );

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
      const dailyRec = DailySessionEngine.getOrCreateDailyRecord({
        id: activeSession.subjectId,
        name: activeSession.subjectName,
      });
      // Only clear pending session if target is completely finished
      if (
        dailyRec.status === "COMPLETED" ||
        dailyRec.remainingTargetMinutes <= 0
      ) {
        DailySessionEngine.clearPendingSessionForSubject(activeSession.subjectId);
      }
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
      completed_today_minutes: Math.round(
        (s.total_focused_study_seconds || 0) / 60
      ),
      previous_backlog_minutes: s.previous_backlog_minutes || 0,
      deadline: s.deadline,
    }));

    const result = BacklogEngine.allocateBacklog(
      workloads,
      cap.netAvailableMinutes
    );
    setConfirmedPlan(result);
    BacklogEngine.saveConfirmedPlan(result);
    setCurrentTab("planner");
  };

  // Subject Actions
  const handleAddSubject = async (newSubj: any) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const created = await ApiClient.request<any>("/subjects/", {
          method: "POST",
          body: JSON.stringify(newSubj),
        });
        setSubjects((prev) => [...prev, created]);
        return;
      }
    } catch (e) {
      console.warn("[StudyOS] Failed to save subject to backend:", e);
    }
    setSubjects((prev) => [...prev, newSubj]);
  };

  const handleUpdateSubject = async (updatedSubj: any) => {
    try {
      if (ApiClient.isAuthenticated() && updatedSubj.id) {
        await ApiClient.request<any>(`/subjects/${updatedSubj.id}/`, {
          method: "PUT",
          body: JSON.stringify(updatedSubj),
        });
      }
    } catch (e) {
      console.warn("[StudyOS] Failed to update subject on backend:", e);
    }
    setSubjects((prev) =>
      prev.map((s) => (s.id === updatedSubj.id ? updatedSubj : s))
    );
  };

  const handleDeleteSubject = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/subjects/${id}/`, {
          method: "DELETE",
        });
      }
    } catch (e) {
      console.warn("[StudyOS] Failed to delete subject on backend:", e);
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // Task Actions
  const handleAddTask = async (newTask: any) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const created = await ApiClient.request<any>("/tasks/", {
          method: "POST",
          body: JSON.stringify(newTask),
        });
        setTasks((prev) => [created, ...prev]);
        return;
      }
    } catch (e) {
      console.warn("[StudyOS] Failed to add task to backend:", e);
    }
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED";

    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/tasks/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch {}

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTask = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/tasks/${id}/`, {
          method: "DELETE",
        });
      }
    } catch {}
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Resource Actions
  const handleAddResource = async (newRes: any) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const created = await ApiClient.request<any>("/resources/", {
          method: "POST",
          body: JSON.stringify(newRes),
        });
        setResources((prev) => [...prev, created]);
        return;
      }
    } catch {}
    setResources((prev) => [...prev, newRes]);
  };

  const handleToggleResourceApproval = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const updated = await ApiClient.request<any>(
          `/resources/${id}/toggle_approval/`,
          { method: "POST" }
        );
        setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return;
      }
    } catch {}
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: !r.is_approved } : r))
    );
  };

  const handleToggleResourceFocus = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const updated = await ApiClient.request<any>(
          `/resources/${id}/toggle_focus/`,
          { method: "POST" }
        );
        setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return;
      }
    } catch {}
    setResources((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_enabled_for_focus: !r.is_enabled_for_focus } : r
      )
    );
  };

  const handleDeleteResource = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/resources/${id}/`, {
          method: "DELETE",
        });
      }
    } catch {}
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  // Notes Actions
  const handleAddNote = async (newNote: any) => {
    try {
      if (ApiClient.isAuthenticated()) {
        const created = await ApiClient.request<any>("/notes/", {
          method: "POST",
          body: JSON.stringify(newNote),
        });
        setNotes((prev) => [created, ...prev]);
        return;
      }
    } catch {}
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleUpdateNote = async (updatedNote: any) => {
    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/notes/${updatedNote.id}/`, {
          method: "PUT",
          body: JSON.stringify(updatedNote),
        });
      }
    } catch {}
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  };

  const handleDeleteNote = async (id: number) => {
    try {
      if (ApiClient.isAuthenticated()) {
        await ApiClient.request<any>(`/notes/${id}/`, {
          method: "DELETE",
        });
      }
    } catch {}
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Timetable Actions
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

  // ========================================================
  // ROUTE GUARD: UNAUTHENTICATED USERS SEE PUBLIC LANDING PAGE
  // ========================================================
  if (!user || !ApiClient.isAuthenticated()) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setIsAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
        />
      </>
    );
  }

  // ========================================================
  // AUTHENTICATED WORKSPACE
  // ========================================================
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
        onOpenAuth={() => {
          setAuthMode("login");
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
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
            if (
              updated.state === "PAUSED" ||
              updated.state === "STUDYING" ||
              updated.state === "READY"
            ) {
              DailySessionEngine.savePendingSessionForSubject(
                updated.subjectId,
                updated
              );
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
          approvedResources={resources.filter(
            (r) => r.is_approved && r.is_enabled_for_focus
          )}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
}
