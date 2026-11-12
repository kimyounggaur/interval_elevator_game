'use client';

import { create } from 'zustand';
import {
  PROGRESS_KEY,
  applyClassLink as engineApplyClassLink,
  emptyProgress,
  parseProgress,
  recordMission as engineRecordMission,
  recordTutorial as engineRecordTutorial,
  serializeProgress,
  type ClassLink,
  type MissionSummary,
  type Progress,
} from '@/engine/engine';

interface ProgressState {
  hydrated: boolean;
  progress: Progress;
  storageError: string | null;
  hydrate: () => void;
  recordMission: (summary: MissionSummary) => void;
  recordTutorial: (id: string) => void;
  applyClassLink: (link: ClassLink) => void;
  reset: () => void;
}

const STORAGE_WARNING = '이 브라우저에서는 기록을 저장할 수 없어요. 지금 방문한 동안에는 계속할 수 있어요.';

function persist(progress: Progress): string | null {
  try {
    if (typeof window === 'undefined') return STORAGE_WARNING;
    window.localStorage.setItem(PROGRESS_KEY, serializeProgress(progress));
    return null;
  } catch {
    return STORAGE_WARNING;
  }
}

export const useProgress = create<ProgressState>((set, get) => ({
  hydrated: false,
  progress: emptyProgress(),
  storageError: null,
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') return;
    try {
      const progress = parseProgress(window.localStorage.getItem(PROGRESS_KEY));
      set({ hydrated: true, progress, storageError: null });
    } catch {
      set({ hydrated: true, progress: emptyProgress(), storageError: STORAGE_WARNING });
    }
  },
  recordMission: (summary) => {
    const progress = engineRecordMission(get().progress, summary);
    const storageError = persist(progress);
    set({ progress, storageError });
  },
  recordTutorial: (id) => {
    const progress = engineRecordTutorial(get().progress, id);
    const storageError = persist(progress);
    set({ progress, storageError });
  },
  applyClassLink: (link) => {
    const previous = get().progress;
    const progress = engineApplyClassLink(previous, link);
    if (progress === previous) return;
    const storageError = persist(progress);
    set({ progress, storageError });
  },
  reset: () => {
    const progress = emptyProgress();
    const storageError = persist(progress);
    set({ progress, storageError });
  },
}));

export default useProgress;
