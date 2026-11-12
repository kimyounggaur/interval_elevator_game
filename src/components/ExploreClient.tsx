'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { degreeLetters, describe, exploreAccess, referenceFloor, type Degree, type Message, type Note } from '@/engine/engine';
import { useProgress } from '@/store/useProgress';
import { useSettings } from '@/store/useSettings';
import { playSequence, playTogether, stopAudio } from '@/lib/audio';
import { GameFrame } from './GameFrame';
import { GameBoard } from './GameBoard';
import { MoveButtons } from './MoveButtons';
const DEFAULT_OPEN: [number, number] = [2, 3];

export function ExploreClient() {
  const { hydrated, progress } = useProgress();
  const access = useMemo(() => exploreAccess(progress), [progress]);
  const [degree, setDegree] = useState<Degree>(3);
  const [base, setBase] = useState<Note>({ letter: 'C', acc: 0, octave: 4 });
  const [floor, setFloor] = useState(referenceFloor(3));
  const [message, setMessage] = useState<Message>({ tone: 'ask', title: ['한 층 = 반음 하나'], lines: [['아래 버튼으로 한 층씩 움직여 보세요.']] });
  const settings = useSettings();
  const selectedFromLink = useRef(false);
  useEffect(() => {
    if (!hydrated || selectedFromLink.current) return;
    selectedFromLink.current = true;
    const requested = Number(new URLSearchParams(window.location.search).get('degree'));
    const allowed = access.find(a => a.degree === requested);
    if (allowed) {
      setDegree(allowed.degree); setBase(allowed.bases[0]); setFloor(referenceFloor(allowed.degree));
      setMessage({ tone: 'ask', title: [`${allowed.degree}도 건물에 왔어요`], lines: [['한 층씩 움직여 보세요.']] });
    }
  }, [hydrated, access]);
  const current = access.find(a => a.degree === degree) || access[0];
  const effectiveDegree = current?.degree || degree;
  const open: [number, number] = current?.open || DEFAULT_OPEN;
  const view = describe(effectiveDegree, base, floor);
  useEffect(() => stopAudio, []);
  const move = useCallback((dir: -1 | 1) => {
    if (!current || floor + dir < open[0] || floor + dir > open[1]) return;
    const next = describe(effectiveDegree, base, floor + dir);
    const prev = describe(effectiveDegree, base, floor);
    setFloor(floor + dir);
    setMessage({ tone: 'ask', title: [`${prev.name} → ${next.name}`], lines: [['위 음 ', { note: prev.upper }, ' → ', { note: next.upper }], [`악보 자리는 그대로, 소리만 반음 ${dir > 0 ? '위로' : '아래로'}`]] });
    if (settings.sound && settings.moveSound) void playTogether(base, next.upper, 1.15);
  }, [current, floor, open, effectiveDegree, base, settings.sound, settings.moveSound]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.repeat || (e.target as HTMLElement).closest('input,select,textarea')) return; if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(e.key === 'ArrowUp' ? 1 : -1); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [move]);
  const changeBase = (nextBase: Note) => {
    setBase(nextBase); const next = describe(effectiveDegree, nextBase, floor);
    setMessage({ tone: 'ask', title: ['기준음 ', { note: nextBase }], lines: [[`${degreeLetters(nextBase, effectiveDegree).join('·')} ${effectiveDegree}칸 → 위 음 자리 ${next.upper.letter}`], [`${next.floorLabel} ${next.name}: `, { note: nextBase }, '–', { note: next.upper }]] });
  };
  if (!hydrated) return <main id="main" className="page-shell loading" role="status">거리를 열고 있어요…</main>;
  if (!current) return <GameFrame title="자유 둘러보기"><section className="panel"><h2>먼저 출근 안내를 들어요</h2><p>1단계 안내를 마치면 열려요.</p><Link href="/play/1-0/" className="button primary">첫 출근 안내 시작 →</Link></section></GameFrame>;
  return <GameFrame title="자유 둘러보기" counter={`${effectiveDegree}도 건물`}>
    <GameBoard degree={effectiveDegree} base={base} floor={floor} open={open} message={message} onListen={kind => { if (!settings.sound) return; if (kind === 'sequence') void playSequence(base, view.upper); else void playTogether(base, view.upper); }}>
      <MoveButtons degree={effectiveDegree} floor={floor} open={open} onMove={move} />
    </GameBoard>
    <section className="setup" aria-label="바꿔 보기"><h2>바꿔 보기</h2>
      <div className="row"><span className="lab" id="building-label">건물</span><div className="seg" role="group" aria-labelledby="building-label">{access.map(a => <button type="button" key={a.degree} aria-pressed={a.degree === effectiveDegree} onClick={() => { setDegree(a.degree); setBase(a.bases[0]); setFloor(referenceFloor(a.degree)); setMessage({ tone: 'ask', title: [`${a.degree}도 건물에 왔어요`], lines: [['한 층씩 움직여 보세요.']] }); }}>{a.degree}도<small>{a.degree === 5 ? '완전 계열' : '장·단 계열'}</small></button>)}</div></div>
      <div className="row"><span className="lab" id="base-label">기준음</span><div className="seg" role="group" aria-labelledby="base-label">{current.bases.map(b => <button type="button" key={b.letter} aria-pressed={b.letter === base.letter} onClick={() => changeBase(b)}>{b.letter}</button>)}</div></div>
      <label className="switch"><input type="checkbox" checked={settings.moveSound} onChange={e => settings.setMoveSound(e.target.checked)} />층을 옮길 때 소리 내기</label>
      {!settings.sound && <p className="small-note">소리가 꺼져 있어요. <Link href="/settings/">설정에서 켤 수 있어요.</Link></p>}
    </section>
  </GameFrame>;
}
export default ExploreClient;
