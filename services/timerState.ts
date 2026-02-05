
import { ActiveTimerState, TimerStatus } from '../types';

const STORAGE_KEY = 'studySync_activeTimer';

export const saveActiveState = (state: ActiveTimerState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save timer state to localStorage", e);
  }
};

export const loadActiveState = (): ActiveTimerState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load timer state", e);
    return null;
  }
};

export const clearActiveState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear timer state", e);
  }
};

export const calculateElapsed = (state: ActiveTimerState | null): number => {
  if (!state) return 0;
  if (state.status === 'idle') return 0;
  if (state.status === 'paused') return state.accumulatedTime;
  
  // If running, calculate delta
  const now = Date.now();
  const currentSegment = state.startTime ? now - state.startTime : 0;
  return state.accumulatedTime + currentSegment;
};
