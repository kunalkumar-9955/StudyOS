/**
 * Editable sample records for StudyOS
 * (Python 120m, DSA 60m, Java 45m, study tasks, resources, and notes)
 * These are starting points that the user can freely edit, rename, archive, or delete.
 */

export const INITIAL_SUBJECTS = [
  {
    id: 1,
    name: "Python Systems",
    code: "PY-301",
    color: "#6366f1",
    daily_target_minutes: 120, // 120 min example
    priority: 1, // High
    completed_today_minutes: 0,
    previous_backlog_minutes: 40, // 40 min backlog example
    total_focused_study_seconds: 0,
  },
  {
    id: 2,
    name: "Data Structures & Algorithms",
    code: "CS-201",
    color: "#10b981",
    daily_target_minutes: 60, // 60 min example
    priority: 1, // High
    completed_today_minutes: 0,
    previous_backlog_minutes: 0,
    total_focused_study_seconds: 0,
  },
  {
    id: 3,
    name: "Java Enterprise",
    code: "CS-203",
    color: "#f59e0b",
    daily_target_minutes: 45, // 45 min example
    priority: 2, // Medium
    completed_today_minutes: 0,
    previous_backlog_minutes: 30, // 30 min backlog example
    total_focused_study_seconds: 0,
  },
  {
    id: 4,
    name: "System Design & Architecture",
    code: "ENG-104",
    color: "#0ea5e9",
    daily_target_minutes: 45,
    priority: 3, // Low
    completed_today_minutes: 0,
    previous_backlog_minutes: 0,
    total_focused_study_seconds: 0,
  },
];

export const INITIAL_RESOURCES = [
  {
    id: 1,
    name: "ChatGPT AI Assistant",
    category: "AI_TOOL",
    url: "https://chatgpt.com",
    is_approved: true,
    is_enabled_for_focus: true,
  },
  {
    id: 2,
    name: "Google Gemini",
    category: "AI_TOOL",
    url: "https://gemini.google.com",
    is_approved: true,
    is_enabled_for_focus: true,
  },
  {
    id: 3,
    name: "WhatsApp Web (Study Groups)",
    category: "COMMUNICATION",
    url: "https://web.whatsapp.com",
    is_approved: true,
    is_enabled_for_focus: true,
  },
  {
    id: 4,
    name: "MDN Web Docs",
    category: "LEARNING_RESOURCE",
    url: "https://developer.mozilla.org",
    is_approved: true,
    is_enabled_for_focus: true,
  },
];

export const INITIAL_TASKS = [
  {
    id: 1,
    subject: 1,
    title: "Async IO event loops & thread pool executor",
    planned_minutes: 60,
    priority: 1,
    status: "SCHEDULED",
    is_college_assignment: false,
    due_date: "2026-10-18",
  },
  {
    id: 2,
    subject: 2,
    title: "Binary Tree balance & AVL rotations",
    planned_minutes: 60,
    priority: 1,
    status: "SCHEDULED",
    is_college_assignment: false,
    due_date: "2026-10-17",
  },
  {
    id: 3,
    subject: 3,
    title: "Spring Security filter chains & JWT validation",
    planned_minutes: 45,
    priority: 2,
    status: "SCHEDULED",
    is_college_assignment: false,
    due_date: "2026-10-19",
  },
];

export const INITIAL_NOTES = [
  {
    id: 1,
    subject: 1,
    title: "Python Concurrency vs Parallelism",
    content: "## Concurrency vs Parallelism in Python\n\n- **GIL (Global Interpreter Lock)**: Prevents true multi-core parallel Python bytecode execution on a single process.\n- **Asyncio**: Single-threaded cooperative multitasking. Ideal for I/O bound network requests.\n- **Multiprocessing**: Spawns multiple OS processes each with its own Python interpreter. Ideal for CPU-bound computations.",
    questions_solved_count: 5,
    checklist_items: [
      { id: "1", text: "Benchmarked asyncio vs threading for 100 HTTP calls", done: true },
      { id: "2", text: "Implemented process pool chunking for image processing", done: false },
    ],
    revision_status: "IN_REVIEW",
  },
];

export const INITIAL_TIMETABLE = [
  { id: 1, day_of_week: 0, title: "Lab Seminar", start_time: "10:00", end_time: "12:00", classroom: "Hall B", is_break: false, subject_id: 1 },
];
