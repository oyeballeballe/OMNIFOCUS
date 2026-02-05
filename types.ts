
export interface Subject {
  id: string;
  name: string;
  color: string;
  isArchived?: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  dateString: string; // ISO date string YYYY-MM-DD for grouping
}

export interface DailyGoal {
  id: string;
  text: string;
  isCompleted: boolean;
  dateString: string; // YYYY-MM-DD
  createdAt: number;
}

export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerMode = 'stopwatch' | 'pomodoro' | 'short-break' | 'long-break';

export interface ActiveTimerState {
  status: TimerStatus;
  mode: TimerMode;
  subjectId: string;
  startTime: number | null; // The timestamp when the CURRENT running segment started
  accumulatedTime: number; // Time accrued before the current segment
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  subjectId: string;
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  date: string; // ISO Date YYYY-MM-DD
  topics: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', color: '#3b82f6' },
  { id: 'cs', name: 'Computer Science', color: '#10b981' },
  { id: 'lit', name: 'Literature', color: '#f59e0b' },
  { id: 'phys', name: 'Physics', color: '#a855f7' },
  { id: 'chem', name: 'Chemistry', color: '#f43f5e' },
  { id: 'misc', name: 'General', color: '#64748b' },
];

export const SUBJECT_COLORS = [
  '#64748b', // slate
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

export const isHexColor = (color: string) => color.startsWith('#');
