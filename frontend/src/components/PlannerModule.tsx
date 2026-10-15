"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Save,
  Edit3,
} from "lucide-react";
import { AvailableTimeSettings, AvailableTimeEngine } from "@/lib/availableTimeEngine";
import { BacklogEngine, ReallocationResult, AllocatedStudyPlanItem } from "@/lib/backlogEngine";

interface PlannerModuleProps {
  subjects: any[];
  tasks: any[];
  availableSettings: AvailableTimeSettings;
  onOpenAvailableTimeModal: () => void;
  onAddTask: (task: any) => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  confirmedPlan: ReallocationResult | null;
  onSaveConfirmedPlan: (plan: ReallocationResult) => void;
  onStartSessionForSubject: (subjectId: number, mins: number) => void;
}

export default function PlannerModule({
  subjects,
  tasks,
  availableSettings,
  onOpenAvailableTimeModal,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  confirmedPlan,
  onSaveConfirmedPlan,
  onStartSessionForSubject,
}: PlannerModuleProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 1);
  const [plannedMins, setPlannedMins] = useState(60);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(1);
  const [isCollegeAssignment, setIsCollegeAssignment] = useState(false);

  // Editable proposal state
  const [proposal, setProposal] = useState<ReallocationResult | null>(confirmedPlan);
  const [isEditingAllocation, setIsEditingAllocation] = useState(false);

  const capacity = AvailableTimeEngine.calculateTodayCapacity(availableSettings);

  const handleRunReallocation = () => {
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

    const result = BacklogEngine.allocateBacklog(workloads, capacity.netAvailableMinutes);
    setProposal(result);
  };

  const handleManualAllocationChange = (subjectId: number, newMinutes: number) => {
    if (!proposal) return;
    const updatedAllocations = proposal.allocations.map((item) =>
      item.subject_id === subjectId
        ? { ...item, total_allocated: Math.max(0, newMinutes) }
        : item
    );
    const newTotal = updatedAllocations.reduce((acc, it) => acc + it.total_allocated, 0);
    setProposal({
      ...proposal,
      total_allocated_minutes: newTotal,
      remaining_capacity_minutes: Math.max(0, proposal.available_capacity_minutes - newTotal),
      allocations: updatedAllocations,
    });
  };

  const handleConfirmAndSave = () => {
    if (!proposal) return;
    onSaveConfirmedPlan(proposal);
    setIsEditingAllocation(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      id: Date.now(),
      title: title.trim(),
      subject: subjectId,
      planned_minutes: plannedMins,
      priority,
      status: "SCHEDULED",
      due_date: dueDate || null,
      is_college_assignment: isCollegeAssignment,
    });

    setTitle("");
    setIsAddingTask(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Module Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 mb-1">
            <CheckSquare className="w-4 h-4" />
            <span>CAPACITY-CONSTRAINED PREPARATION PLANNER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Study Planner & Automatic Backlog
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Allocate your remaining study capacity fairly across subject targets and outstanding backlog.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onOpenAvailableTimeModal}
            className="px-3 py-2 rounded-xl theme-card border theme-border font-bold text-xs flex items-center gap-1.5 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Capacity: {capacity.netAvailableMinutes}m</span>
          </button>

          <button
            onClick={handleRunReallocation}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Allocate Backlog</span>
          </button>

          <button
            onClick={() => setIsAddingTask(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Backlog Reallocation Proposal Section */}
      {proposal ? (
        <div className="glass-panel-elevated rounded-2xl p-4 sm:p-6 theme-border space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b theme-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base theme-text-primary">
                  Today's Allocated Study Plan & Backlog Clearance
                </h3>
              </div>
              <p className="text-xs theme-text-muted mt-0.5">{proposal.explanation}</p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs px-3 py-1 rounded-full font-bold theme-card border theme-border theme-text-primary">
                Capacity: {proposal.available_capacity_minutes}m • Scheduled: {proposal.total_allocated_minutes}m
              </span>
              <button
                onClick={() => setIsEditingAllocation(!isEditingAllocation)}
                className="px-3 py-1 rounded-lg text-xs font-semibold theme-card border theme-border theme-text-secondary hover:theme-text-primary flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditingAllocation ? "Done Editing" : "Edit Minutes"}
              </button>
            </div>
          </div>

          {/* Allocation Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {proposal.allocations.map((item) => (
              <div
                key={item.subject_id}
                className="p-4 rounded-xl theme-card border theme-border space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm theme-text-primary flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                      P{item.priority}
                    </span>
                  </div>
                  <p className="text-[11px] theme-text-muted mt-1 leading-snug">
                    {item.allocation_reason}
                  </p>
                </div>

                <div className="pt-2 border-t theme-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] theme-text-dim block uppercase font-semibold">
                      Allocated
                    </span>
                    {isEditingAllocation ? (
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="15"
                        value={item.total_allocated}
                        onChange={(e) =>
                          handleManualAllocationChange(
                            item.subject_id,
                            Number(e.target.value)
                          )
                        }
                        className="w-16 px-1.5 py-0.5 rounded theme-input text-xs font-bold font-mono"
                      />
                    ) : (
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {item.total_allocated}m
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onStartSessionForSubject(item.subject_id, item.total_allocated || 60)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span>Start</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t theme-border flex-wrap gap-2 text-xs">
            <span className="theme-text-muted">
              {proposal.shortfall_minutes > 0 ? (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {proposal.shortfall_minutes}m preserved in backlog without starving subjects.
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Plan is 100% within your available study capacity.
                </span>
              )}
            </span>

            <button
              onClick={handleConfirmAndSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Confirm & Save Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-8 theme-border text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
          <h3 className="font-bold text-base theme-text-primary">
            No Active Allocation Calculated Yet
          </h3>
          <p className="text-xs theme-text-muted max-w-md mx-auto">
            Click "Allocate Backlog" to calculate a customized preparation plan that distributes your {capacity.netAvailableMinutes}m capacity by subject priority and recovers unfinished work.
          </p>
          <button
            onClick={handleRunReallocation}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer"
          >
            Calculate Optimal Allocation Now
          </button>
        </div>
      )}

      {/* Add Task Form Modal */}
      {isAddingTask && (
        <form
          onSubmit={handleSaveTask}
          className="glass-panel-elevated rounded-2xl p-6 theme-border space-y-4 max-w-xl"
        >
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="font-bold text-sm theme-text-primary flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Add Study Task or Deliverable
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="theme-text-muted hover:theme-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold theme-text-secondary mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solve LeetCode Top 50 Graph Problems"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Target Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Planned Minutes
              </label>
              <input
                type="number"
                min="15"
                max="240"
                step="15"
                value={plannedMins}
                onChange={(e) => setPlannedMins(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Deadline (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
              >
                <option value={1}>High Priority (P1)</option>
                <option value={2}>Medium Priority (P2)</option>
                <option value={3}>Low Priority (P3)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm theme-text-primary">Scheduled Study Tasks</h3>
        {tasks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 theme-border text-center text-xs theme-text-muted">
            No pending study tasks. Click "Add Task" to create one.
          </div>
        ) : (
          tasks.map((task) => {
            const subject = subjects.find((s) => s.id === task.subject);
            const isCompleted = task.status === "COMPLETED";

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border theme-border flex items-center justify-between gap-4 transition-all ${
                  isCompleted
                    ? "theme-card-subtle opacity-60"
                    : "theme-card hover:border-slate-500/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="p-1 rounded cursor-pointer"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        isCompleted
                          ? "text-emerald-500 fill-emerald-500/20"
                          : "theme-text-dim"
                      }`}
                    />
                  </button>

                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-semibold truncate ${
                        isCompleted
                          ? "line-through theme-text-muted"
                          : "theme-text-primary"
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs theme-text-muted mt-1">
                      {subject && (
                        <span className="flex items-center gap-1.5 font-bold theme-text-secondary">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </span>
                      )}
                      <span>{task.planned_minutes}m planned</span>
                      {task.due_date && <span>Due {task.due_date}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-2 rounded-lg theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
