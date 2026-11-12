'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TUTORIALS,
  WHITE_BASES,
  describe,
  missionById,
  openOf,
  referenceFloor,
  type Degree,
  type Letter,
  type Message,
  type Note,
  type TutorialStep,
} from '@/engine/engine';
import { playSequence, playTogether, stopAudio } from '@/lib/audio';
import { useProgress } from '@/store/useProgress';
import { useSettings } from '@/store/useSettings';
import { GameFrame } from './GameFrame';
import { GameBoard } from './GameBoard';
import { MoveButtons } from './MoveButtons';

interface TutorialState {
  index: number;
  degree: Degree;
  base: Note;
  floor: number;
  open: [number, number];
}

function enterStep(state: TutorialState, index: number, steps: readonly TutorialStep[]): TutorialState {
  const set = steps[index]?.set;
  return {
    ...state,
    index,
    degree: set?.degree ?? state.degree,
    base: set?.base ? (WHITE_BASES.find((note) => note.letter === set.base) ?? state.base) : state.base,
    floor: set?.floor ?? state.floor,
    open: set?.open ?? state.open,
  };
}

export function TutorialClient({ missionId }: { missionId: string }) {
  const mission = missionById(missionId);
  const steps = TUTORIALS[mission.tutorial!];
  const router = useRouter();
  const sound = useSettings((store) => store.sound);
  const moveSound = useSettings((store) => store.moveSound);
  const recordTutorial = useProgress((store) => store.recordTutorial);
  const [state, setState] = useState<TutorialState>(() => {
    const degree = mission.degrees[0] ?? 3;
    return enterStep({
      index: 0,
      degree,
      base: mission.bases[0] ?? WHITE_BASES[0]!,
      floor: referenceFloor(degree),
      open: openOf(mission, degree),
    }, 0, steps);
  });
  // Tap and key handlers share the most recent state, including rapid interactions.
  const current = useRef(state);
  const completed = useRef(false);
  const step = steps[state.index]!;

  const commit = useCallback((next: TutorialState) => {
    current.current = next;
    setState(next);
  }, []);

  const advance = useCallback((from = current.current) => {
    if (completed.current) return;
    if (from.index + 1 === steps.length) {
      completed.current = true;
      recordTutorial(missionId);
      router.push(`/stage/${mission.stageId}/`);
      return;
    }
    commit(enterStep(from, from.index + 1, steps));
  }, [commit, mission.stageId, missionId, recordTutorial, router, steps]);

  const move = useCallback((dir: 1 | -1) => {
    if (completed.current) return;
    const previous = current.current;
    const floor = previous.floor + dir;
    if (floor < previous.open[0] || floor > previous.open[1]) return;
    const next = { ...previous, floor };
    const instruction = steps[previous.index]!;
    if (sound && moveSound) {
      const view = describe(next.degree, next.base, next.floor);
      void playTogether(view.base, view.upper, 1.15);
    }
    const fulfills = (instruction.wait === 'up' && dir === 1)
      || (instruction.wait === 'down' && dir === -1)
      || (instruction.wait === 'reach' && floor === instruction.reach);
    if (fulfills) advance(next);
    else commit(next);
  }, [advance, commit, moveSound, sound, steps]);

  const listen = useCallback((kind: 'sequence' | 'together') => {
    if (completed.current) return;
    const previous = current.current;
    const view = describe(previous.degree, previous.base, previous.floor);
    if (sound) {
      if (kind === 'sequence') void playSequence(view.base, view.upper);
      else void playTogether(view.base, view.upper);
      if (steps[previous.index]!.wait === 'listen') advance(previous);
    }
  }, [advance, sound, steps]);

  const changeBase = (letter: Letter) => {
    if (completed.current) return;
    const previous = current.current;
    if (previous.base.letter === letter) return;
    const base = WHITE_BASES.find((note) => note.letter === letter);
    if (!base) return;
    const next = { ...previous, base };
    if (steps[previous.index]!.wait === 'base') advance(next);
    else commit(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.repeat || (target instanceof HTMLElement && (
        target.closest('input, select, textarea') || target.isContentEditable
      ))) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        move(event.key === 'ArrowUp' ? 1 : -1);
      } else if (event.key === 'Enter') {
        if (target instanceof HTMLElement && target.closest('button, a')) return;
        const instruction = steps[current.current.index]!;
        if (instruction.wait === 'next' || (instruction.wait === 'listen' && !sound)) {
          event.preventDefault();
          advance();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, move, sound, steps]);

  useEffect(() => () => stopAudio(), []);

  const message: Message = { tone: 'ask', title: ['선배 안내원'], lines: [[step.text]] };
  const canNext = step.wait === 'next' || (step.wait === 'listen' && !sound);

  return (
    <GameFrame
      title={`${mission.stageId}단계 · 안내`}
      backHref={`/stage/${mission.stageId}/`}
      counter={`안내 ${state.index + 1}/${steps.length}`}
    >
      <GameBoard
        degree={state.degree}
        base={state.base}
        floor={state.floor}
        open={state.open}
        message={message}
        focus={step.focus}
        onListen={listen}
        messageAction={canNext ? (
          <button type="button" className="btn tutorial-next" onClick={() => advance()}>
            {state.index === steps.length - 1 ? '안내 마치기' : '다음'} <span aria-hidden="true">→</span>
          </button>
        ) : undefined}
      >
        <MoveButtons degree={state.degree} floor={state.floor} open={state.open} onMove={move} />
      </GameBoard>
      {missionId === '2-0' && (
        <section className={`setup${step.focus === 'bases' ? ' tutorial-focus' : ''}`} aria-label="기준음 바꿔 보기">
          <div className="row">
            <span className="lab">기준음</span>
            <div className="seg">
              {WHITE_BASES.map((base) => (
                <button key={base.letter} type="button" aria-pressed={state.base.letter === base.letter} onClick={() => changeBase(base.letter)}>{base.letter}</button>
              ))}
            </div>
          </div>
        </section>
      )}
    </GameFrame>
  );
}

export default TutorialClient;
