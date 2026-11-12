'use client';
import Link from 'next/link';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentProblem, isMissionUnlocked, messageOf, missionById, newSeed, notesOf, reduce, roundProblems, startSession, summarize, visibilityOf, type Action, type Session } from '@/engine/engine';
import { useProgress } from '@/store/useProgress';
import { useSettings } from '@/store/useSettings';
import { playSequence, playTogether, stopAudio } from '@/lib/audio';
import { GameFrame } from './GameFrame';
import { GameBoard } from './GameBoard';
import { MoveButtons } from './MoveButtons';
import { OptionPad } from './OptionPad';
import { ResultCard } from './ResultCard';
import { TutorialClient } from './TutorialClient';

type SessionAction = Action | { type: 'start'; session: Session };
const sessionReducer = (state: Session | null, action: SessionAction) => action.type === 'start' ? action.session : state ? reduce(state, action) : state;

export function PlayClient({ missionId }: { missionId: string }) {
  const { hydrated, progress } = useProgress();
  const mission = missionById(missionId);
  if (!hydrated) return <main id="main" className="page-shell loading" role="status">출근 준비를 하고 있어요…</main>;
  if (!isMissionUnlocked(progress, missionId)) return <main id="main" className="page-shell"><section className="panel"><p className="eyebrow">다음에 만나요</p><h1>아직 잠겨 있어요</h1><p>앞 미션을 마치면 이 미션이 열려요.</p><Link className="button primary" href={`/stage/${mission.stageId}/`}>단계로 돌아가기</Link></section></main>;
  return mission.kind === 'tutorial' ? <TutorialClient key={missionId} missionId={missionId} /> : <MissionSession key={missionId} missionId={missionId} />;
}

function MissionSession({ missionId }: { missionId: string }) {
  const [session, dispatch] = useReducer(sessionReducer, null);
  const [animation, setAnimation] = useState<{ id: string; floor: number } | null>(null);
  const router = useRouter();
  const recorded = useRef(false);
  const settings = useSettings();
  const mission = missionById(missionId);
  useEffect(() => { dispatch({ type: 'start', session: startSession(missionId, newSeed()) }); return stopAudio; }, [missionId]);
  useEffect(() => {
    if (!session || session.phase !== 'done' || recorded.current) return;
    recorded.current = true;
    useProgress.getState().recordMission(summarize(session));
    router.replace(`/stage/${mission.stageId}/`);
  }, [session, router, mission.stageId]);

  const send = useCallback((action: Action) => {
    if (!session || animation) return;
    const next = reduce(session, action);
    if (next === session) return;
    if (next.phase === 'question' || next.phase === 'feedback') {
      const p = currentProblem(next);
      const notes = notesOf(p, next.run);
      if (next.run.status === 'revealed' && session.run.status === 'asking' && p.kind === 'travel' && next.run.kind === 'travel' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setAnimation({ id: p.id, floor: next.run.lastArrive ?? p.start });
      }
      if (settings.sound) {
        if (action.type === 'move' && settings.moveSound) void playTogether(notes.base, notes.upper, 1.15);
        if (session.run.status === 'asking' && next.run.status !== 'asking') {
          if (p.kind === 'travel' && next.run.status === 'solved') void playSequence(notes.base, notes.upper);
          else void playTogether(notes.base, notes.upper);
        }
      }
    }
    dispatch(action);
  }, [session, settings.sound, settings.moveSound, animation]);

  useEffect(() => {
    if (!animation || !session || session.run.kind !== 'travel') return;
    const target = session.run.floor;
    const timer = window.setTimeout(() => {
      if (animation.floor === target) setAnimation(null);
      else setAnimation({ ...animation, floor: animation.floor + (target > animation.floor ? 1 : -1) });
    }, 340);
    return () => window.clearTimeout(timer);
  }, [animation, session]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!session || e.repeat || session.phase === 'summary' || session.phase === 'done') return;
      const target = e.target as HTMLElement;
      if (target.closest('input,select,textarea,[contenteditable="true"]')) return;
      const problem = currentProblem(session);
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); send({ type: 'move', dir: e.key === 'ArrowUp' ? 1 : -1 }); }
      if (/^[1-4]$/.test(e.key) && problem.kind === 'identify') { const option = problem.options[Number(e.key) - 1]; if (option) { e.preventDefault(); send({ type: 'answer', optionId: option.id }); } }
      if (e.key === 'Enter' && !target.closest('button,a')) { e.preventDefault(); send({ type: session.phase === 'feedback' ? 'next' : 'arrive' }); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [session, send]);

  if (!session) return <GameFrame title={`${mission.stageId}단계 · ${mission.title}`}><p className="loading" role="status">미션을 준비하고 있어요…</p></GameFrame>;
  if (session.phase === 'summary' || session.phase === 'done') return <GameFrame title={`${mission.stageId}단계 · 결과`} backHref={`/stage/${mission.stageId}/`}><ResultCard session={session} onRetry={() => send({ type: 'retry' })} onFinish={() => send({ type: 'finish' })} /></GameFrame>;
  const problem = currentProblem(session);
  const notes = notesOf(problem, session.run);
  const displayedFloor = animation?.id === problem.id ? animation.floor : notes.view.floor;
  const count = roundProblems(session).length;
  const listen = (kind: 'sequence' | 'together') => {
    if (!settings.sound) return;
    if (kind === 'sequence') void playSequence(notes.base, notes.upper); else void playTogether(notes.base, notes.upper);
  };
  return <GameFrame title={`${mission.stageId}단계 · ${mission.title}`} backHref={`/stage/${mission.stageId}/`} counter={`${session.round === 'retry' ? '다시 풀기 ' : ''}${session.index + 1}/${count}`}>
    <GameBoard degree={problem.degree} base={notes.base} floor={displayedFloor} open={problem.open} degrees={mission.degrees} visibility={visibilityOf(session)} message={messageOf(session)} onListen={listen}
      options={problem.kind === 'identify' && session.run.kind === 'identify' ? <OptionPad options={problem.options} eliminated={session.run.eliminated} onAnswer={id => send({ type: 'answer', optionId: id })} /> : undefined}>
      {session.phase === 'feedback' ? <button type="button" className="button primary next-problem" disabled={!!animation} onClick={() => send({ type: 'next' })}>{animation ? '목적층으로 이동하고 있어요…' : session.index === count - 1 ? '결과 보기 →' : '다음 문제 →'}</button> : problem.kind === 'travel' && session.run.kind === 'travel' ? <MoveButtons degree={problem.degree} floor={session.run.floor} open={problem.open} onMove={dir => send({ type: 'move', dir })} onArrive={() => send({ type: 'arrive' })} arriveDisabled={session.run.moves === 0 || session.run.moves === session.run.movesAtLastArrive} /> : <p className="answer-instruction">악보를 보고 왼쪽에서 층을 골라 주세요.</p>}
    </GameBoard>
    {!settings.sound && <p className="small-note sound-off-note">소리가 꺼져 있어요. 악보와 건반으로 계속할 수 있어요.</p>}
  </GameFrame>;
}
export default PlayClient;
