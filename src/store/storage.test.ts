import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROGRESS_KEY,
  emptyProgress,
  exploreAccess,
  isMissionUnlocked,
  isStageUnlocked,
  parseClassLink,
  serializeProgress,
  type MissionSummary,
} from '@/engine/engine';
import { stopAudio } from '@/lib/audio';
import { useProgress } from './useProgress';
import { SETTINGS_KEY, useSettings } from './useSettings';

vi.mock('@/lib/audio', () => ({ stopAudio: vi.fn() }));

const values = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
};

beforeEach(() => {
  values.clear();
  vi.clearAllMocks();
  storage.getItem.mockImplementation((key: string) => values.get(key) ?? null);
  storage.setItem.mockImplementation((key: string, value: string) => { values.set(key, value); });
  vi.stubGlobal('window', { localStorage: storage });
  useProgress.setState(useProgress.getInitialState(), true);
  useSettings.setState(useSettings.getInitialState(), true);
});

afterEach(() => vi.unstubAllGlobals());

describe('browser progress persistence', () => {
  it('waits for explicit hydration and reads storage only once', () => {
    const saved = { ...emptyProgress(), teacherOpen: 3 };
    values.set(PROGRESS_KEY, serializeProgress(saved));
    expect(useProgress.getState().hydrated).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
    useProgress.getState().hydrate();
    useProgress.getState().hydrate();
    expect(useProgress.getState().progress).toEqual(saved);
    expect(useProgress.getState().hydrated).toBe(true);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('recovers safely from corrupted saved progress', () => {
    values.set(PROGRESS_KEY, '{broken json');
    expect(() => useProgress.getState().hydrate()).not.toThrow();
    expect(useProgress.getState().progress).toEqual(emptyProgress());
    expect(useProgress.getState().hydrated).toBe(true);
  });

  it('hydrates to usable in-memory state when storage reads are blocked', () => {
    storage.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => useProgress.getState().hydrate()).not.toThrow();
    expect(useProgress.getState().progress).toEqual(emptyProgress());
    expect(useProgress.getState().storageError).toContain('저장할 수 없어요');
    expect(useProgress.getState().hydrated).toBe(true);
  });

  it('records a single mission action as one play and persists the engine summary', () => {
    useProgress.getState().hydrate();
    const summary: MissionSummary = {
      missionId: '1-1', n: 4, firstTry: 3, accuracy: 75,
      stars: 2, moves: 0, minimal: 0, mistakes: ['id:3m'],
    };
    useProgress.getState().recordMission(summary);
    const saved = JSON.parse(values.get(PROGRESS_KEY)!);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(saved.missions['1-1']).toEqual({
      done: true, best: 2, plays: 1,
      last: { firstTry: 3, n: 4, moves: 0, minimal: 0 },
    });
    expect(saved.mistakes['id:3m']).toBe(1);
  });

  it('restores a finished tutorial after a fresh hydration', () => {
    useProgress.getState().hydrate();
    useProgress.getState().recordTutorial('1-0');
    useProgress.setState(useProgress.getInitialState(), true);
    useProgress.getState().hydrate();
    expect(useProgress.getState().progress.missions['1-0']).toEqual({
      done: true, best: 0, plays: 1, last: null,
    });
    expect(isMissionUnlocked(useProgress.getState().progress, '1-1')).toBe(true);
  });

  it('opens the class-linked stage without completing its tutorial or opening explore', () => {
    useProgress.getState().hydrate();
    useProgress.getState().applyClassLink(parseClassLink('?open=3&sound=off'));
    const p = useProgress.getState().progress;
    expect(isStageUnlocked(p, 3)).toBe(true);
    expect(isMissionUnlocked(p, '3-0')).toBe(true);
    expect(isMissionUnlocked(p, '3-1')).toBe(false);
    expect(p.missions).toEqual({});
    expect(exploreAccess(p)).toEqual([]);
    expect(JSON.parse(values.get(PROGRESS_KEY)!).teacherOpen).toBe(3);
    // A link never lowers an already unlocked teacher stage.
    useProgress.getState().applyClassLink(parseClassLink('?open=2'));
    expect(useProgress.getState().progress.teacherOpen).toBe(3);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('keeps session progress when writes fail and clears the warning after recovery', () => {
    useProgress.getState().hydrate();
    storage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => useProgress.getState().recordTutorial('1-0')).not.toThrow();
    expect(useProgress.getState().progress.missions['1-0'].done).toBe(true);
    expect(useProgress.getState().storageError).toContain('저장할 수 없어요');
    storage.setItem.mockImplementation((key, value) => { values.set(key, value); });
    useProgress.getState().recordTutorial('2-0');
    expect(useProgress.getState().storageError).toBeNull();
    expect(JSON.parse(values.get(PROGRESS_KEY)!).missions['1-0'].done).toBe(true);
  });

  it('reset clears progress, mistakes, and teacher unlocks durably', () => {
    useProgress.getState().hydrate();
    useProgress.getState().recordTutorial('1-0');
    useProgress.getState().applyClassLink(parseClassLink('?open=4'));
    useProgress.getState().reset();
    expect(useProgress.getState().progress).toEqual(emptyProgress());
    expect(JSON.parse(values.get(PROGRESS_KEY)!)).toEqual(emptyProgress());
    useProgress.setState(useProgress.getInitialState(), true);
    useProgress.getState().hydrate();
    expect(isStageUnlocked(useProgress.getState().progress, 2)).toBe(false);
  });
});

describe('browser sound settings', () => {
  it('hydrates saved settings once and silences existing audio when sound is off', () => {
    values.set(SETTINGS_KEY, JSON.stringify({ sound: false, moveSound: false }));
    useSettings.getState().hydrate();
    useSettings.getState().hydrate();
    expect(useSettings.getState()).toMatchObject({ hydrated: true, sound: false, moveSound: false });
    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('uses defaults for corrupted or blocked storage and still allows toggles', () => {
    values.set(SETTINGS_KEY, '{broken');
    useSettings.getState().hydrate();
    expect(useSettings.getState()).toMatchObject({ sound: true, moveSound: true });
    useSettings.setState(useSettings.getInitialState(), true);
    storage.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    storage.setItem.mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => useSettings.getState().hydrate()).not.toThrow();
    expect(() => useSettings.getState().setSound(false)).not.toThrow();
    expect(() => useSettings.getState().setMoveSound(false)).not.toThrow();
    expect(useSettings.getState()).toMatchObject({ hydrated: true, sound: false, moveSound: false });
    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  it('persists toggles together without resetting the other setting', () => {
    useSettings.getState().hydrate();
    useSettings.getState().setMoveSound(false);
    useSettings.getState().setSound(false);
    useSettings.getState().setSound(true);
    expect(JSON.parse(values.get(SETTINGS_KEY)!)).toEqual({ sound: true, moveSound: false });
    expect(stopAudio).toHaveBeenCalledTimes(1);
  });
});
