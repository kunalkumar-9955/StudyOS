/**
 * StudyOS Backlog & Daily Preparation Engine
 * Handles daily targets, unfinished work tracking, carried-over backlog,
 * and capacity-aware reallocation without silent data loss.
 */

export interface SubjectWorkload {
  id: number;
  name: string;
  code?: string;
  color: string;
  priority: number; // 1 = High, 2 = Medium, 3 = Low
  daily_target_minutes: number;
  completed_today_minutes: number;
  previous_backlog_minutes: number;
  deadline?: string;
}

export interface CalculatedSubjectWorkload extends SubjectWorkload {
  unfinished_target_today: number;
  total_remaining_workload: number;
  target_progress_percent: number;
}

export interface AllocatedStudyPlanItem {
  subject_id: number;
  name: string;
  color: string;
  priority: number;
  daily_target: number;
  normal_allocated: number;
  backlog_allocated: number;
  total_allocated: number;
  backlog_preserved: number;
  allocation_reason: string;
}

export interface ReallocationResult {
  available_capacity_minutes: number;
  total_allocated_minutes: number;
  remaining_capacity_minutes: number;
  shortfall_minutes: number;
  total_backlog_preserved: number;
  allocations: AllocatedStudyPlanItem[];
  explanation: string;
}

export class BacklogEngine {
  private static BACKLOG_STORAGE_KEY = "studyos_subject_backlogs";
  private static CONFIRMED_PLAN_KEY = "studyos_confirmed_daily_plan";

  static computeSubjectWorkload(s: SubjectWorkload): CalculatedSubjectWorkload {
    const target = s.daily_target_minutes || 0;
    const completed = s.completed_today_minutes || 0;
    const unfinished = Math.max(0, target - completed);
    const prevBacklog = s.previous_backlog_minutes || 0;
    const totalRemaining = unfinished + prevBacklog;
    const progressPct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

    return {
      ...s,
      unfinished_target_today: unfinished,
      total_remaining_workload: totalRemaining,
      target_progress_percent: progressPct,
    };
  }

  /**
   * Generates a fair, capacity-constrained plan allocating normal targets and backlog.
   * Priority: P1 first, then P2, then P3.
   * Never allocates more than availableCapacityMinutes.
   * If capacity is insufficient, retains remaining backlog and returns explanation.
   */
  static allocateBacklog(
    subjects: SubjectWorkload[],
    availableCapacityMinutes: number
  ): ReallocationResult {
    let capacityLeft = availableCapacityMinutes;
    const sorted = [...subjects].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

    const items: AllocatedStudyPlanItem[] = [];

    // Pass 1: Allocate normal daily targets by priority up to capacity
    for (const subj of sorted) {
      const calc = this.computeSubjectWorkload(subj);
      const targetNeeded = calc.unfinished_target_today;
      const normalAlloc = Math.min(targetNeeded, capacityLeft);
      capacityLeft -= normalAlloc;

      items.push({
        subject_id: subj.id,
        name: subj.name,
        color: subj.color,
        priority: subj.priority,
        daily_target: subj.daily_target_minutes,
        normal_allocated: normalAlloc,
        backlog_allocated: 0,
        total_allocated: normalAlloc,
        backlog_preserved: calc.previous_backlog_minutes,
        allocation_reason: `Daily target: ${subj.daily_target_minutes}m (allocated ${normalAlloc}m)`,
      });
    }

    // Pass 2: Allocate available remaining capacity to backlog
    const itemMap = new Map<number, AllocatedStudyPlanItem>();
    items.forEach((it) => itemMap.set(it.subject_id, it));

    for (const subj of sorted) {
      if (capacityLeft <= 0) break;
      const it = itemMap.get(subj.id);
      if (!it) continue;

      const backlog = it.backlog_preserved;
      if (backlog > 0) {
        const add = Math.min(backlog, capacityLeft);
        it.backlog_allocated = add;
        it.backlog_preserved -= add;
        it.total_allocated += add;
        it.allocation_reason += ` + ${add}m backlog recovery`;
        capacityLeft -= add;
      }
    }

    const allocations = Array.from(itemMap.values());
    const totalAllocated = allocations.reduce((acc, it) => acc + it.total_allocated, 0);
    const totalBacklogPreserved = allocations.reduce((acc, it) => acc + it.backlog_preserved, 0);
    const totalDemand = subjects.reduce(
      (acc, s) => acc + s.daily_target_minutes + s.previous_backlog_minutes,
      0
    );
    const shortfall = Math.max(0, totalDemand - availableCapacityMinutes);

    let explanation = `Allocated ${totalAllocated}m across ${allocations.length} subjects based on priority within your ${availableCapacityMinutes}m study capacity.`;
    if (shortfall > 0) {
      explanation += ` ${shortfall}m preserved in backlog due to schedule capacity without starving high-priority subjects.`;
    } else {
      explanation += ` All targets and outstanding backlogs fully scheduled!`;
    }

    return {
      available_capacity_minutes: availableCapacityMinutes,
      total_allocated_minutes: totalAllocated,
      remaining_capacity_minutes: capacityLeft,
      shortfall_minutes: shortfall,
      total_backlog_preserved: totalBacklogPreserved,
      allocations,
      explanation,
    };
  }

  static getConfirmedPlan(): ReallocationResult | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(this.CONFIRMED_PLAN_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  static saveConfirmedPlan(plan: ReallocationResult): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.CONFIRMED_PLAN_KEY, JSON.stringify(plan));
  }
}
