'use client';

import { create } from 'zustand';
import { stopAudio } from '@/lib/audio';

export const SETTINGS_KEY = 'interval-elevator:settings';

interface SettingsState {
  hydrated: boolean;
  sound: boolean;
  moveSound: boolean;
  hydrate: () => void;
  setSound: (sound: boolean) => void;
  setMoveSound: (moveSound: boolean) => void;
}

function persist(sound: boolean, moveSound: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound, moveSound }));
    }
  } catch { /* Settings still work for the current visit. */ }
}

export const useSettings = create<SettingsState>((set, get) => ({
  hydrated: false,
  sound: true,
  moveSound: true,
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') return;
    let sound = true;
    let moveSound = true;
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
      if (raw && typeof raw === 'object') {
        const data = raw as { sound?: unknown; moveSound?: unknown };
        if (typeof data.sound === 'boolean') sound = data.sound;
        if (typeof data.moveSound === 'boolean') moveSound = data.moveSound;
      }
    } catch { /* Unreadable settings fall back to the defaults. */ }
    if (!sound) stopAudio();
    set({ hydrated: true, sound, moveSound });
  },
  setSound: (sound) => {
    if (!sound) stopAudio();
    set({ sound });
    persist(sound, get().moveSound);
  },
  setMoveSound: (moveSound) => {
    set({ moveSound });
    persist(get().sound, moveSound);
  },
}));

export default useSettings;
