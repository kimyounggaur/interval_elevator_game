/**
 * 정답표 다시 만들기: npx tsx scripts/make-golden.ts
 * 사용자가 규칙 변경을 승인했을 때만 실행한다. 실행하면 src/engine/golden/interval_elevator_golden_v1.json 을 덮어쓴다.
 * 실행 전후로 git diff 로 무엇이 바뀌었는지 사용자에게 보여 준다.
 */
import * as E from '../src/engine/engine';
import { writeFileSync } from 'node:fs';
const nk = E.noteKey;
const BASES21 = E.LETTERS.flatMap(l => [-1, 0, 1].map(acc => ({ letter: l, acc, octave: 4 } as E.Note)));

// 1) 음정 표: 2~8도 × 기준음 21개 × 모든 층
const intervals: any[] = [];
for (const d of [2,3,4,5,6,7,8] as E.Degree[]) for (const b of BASES21) for (const f of E.floorsOf(d)) {
  const v = E.describe(d, b, f.index);
  intervals.push({ degree: d, base: nk(b), floor: f.index, quality: v.quality, name: v.name, floorLabel: v.floorLabel, upper: nk(v.upper), semitones: v.semitones, baseMidi: v.baseMidi, upperMidi: v.upperMidi, baseStep: v.baseStep, upperStep: v.upperStep, displayable: v.displayable });
}
// 2) 도수+반음 → 성질
const qualityFor: any[] = [];
for (const d of [1,2,3,4,5,6,7,8] as E.Degree[]) for (let s = -3; s <= 16; s++) qualityFor.push([d, s, E.qualityFor(d, s)]);

// 3) 미션별 문제
const pdump = (p: E.Problem) => p.kind === 'identify'
  ? { id: p.id, kind: p.kind, degree: p.degree, base: nk(p.base), floor: p.floor, open: p.open, hideBuilding: p.hideBuilding, typeKey: p.typeKey, options: p.options.map(o => ({ id: o.id, role: o.role, label: o.label, exists: o.exists })) }
  : { id: p.id, kind: p.kind, degree: p.degree, base: nk(p.base), start: p.start, target: p.target, open: p.open, typeKey: p.typeKey, pair: p.pair };
const SEEDS = [1, 7, 42, 2026, 4294967295];
const missions: any[] = [];
for (const m of E.MISSIONS) { if (m.kind === 'tutorial') continue; for (const seed of SEEDS) missions.push({ mission: m.id, seed, problems: E.generateProblems(m.id, seed).map(pdump) }); }

// 4) 다시 풀기 문제
const retries: any[] = [];
for (const [mid, seed, idx] of [['1-1', 7, [0, 2]], ['2-1', 42, [1, 3, 5]], ['3-2', 7, [0, 4]], ['4-3', 2026, [1]], ['4-4', 9, [0, 1, 2, 3, 4, 5, 6, 7]]] as [string, number, number[]][]) {
  const main = E.generateProblems(mid, seed);
  retries.push({ mission: mid, seed, wrongIndexes: idx, problems: E.makeRetryProblems(mid, idx.map(i => main[i]!), seed).map(pdump) });
}

// 5) 진행 재생
const snap = (s: E.Session) => {
  const out: any = { phase: s.phase, round: s.round, index: s.index, canRetry: s.canRetry, run: s.run };
  if (s.phase === 'question' || s.phase === 'feedback') {
    const m = E.messageOf(s);
    out.visibility = E.visibilityOf(s);
    out.message = { tone: m.tone, title: E.lineText(m.title), lines: m.lines.map(l => E.lineText(l)) };
  }
  return out;
};
type Plan = (s: E.Session) => E.Action | null;
const pick = (s: E.Session, role: E.OptionRole): E.Action => { const p = E.currentProblem(s) as E.IdentifyProblem; const r = s.run as E.IdentifyRun; const o = p.options.find(o => o.role === role && !r.eliminated.includes(o.id)); if (!o) throw new Error('no option ' + role); return { type: 'answer', optionId: o.id }; };
const toward = (s: E.Session): E.Action => { const p = E.currentProblem(s) as E.TravelProblem; const r = s.run as E.TravelRun; return { type: 'move', dir: p.target > r.floor ? 1 : -1 }; };
const away = (s: E.Session): E.Action => { const p = E.currentProblem(s) as E.TravelProblem; const r = s.run as E.TravelRun; const d = p.target > r.floor ? -1 : 1; return { type: 'move', dir: (r.floor + d < p.open[0] || r.floor + d > p.open[1]) ? (-d as 1|-1) : (d as 1|-1) }; };
function play(mission: string, seed: number, script: (string | ((s: E.Session) => E.Action))[]) {
  let s = E.startSession(mission, seed);
  const steps: any[] = [{ do: null, expect: snap(s) }];
  for (const cmd of script) {
    let a: E.Action;
    if (typeof cmd === 'function') a = cmd(s);
    else if (['correct', 'neighbor', 'enharmonic', 'family'].includes(cmd)) a = pick(s, cmd as E.OptionRole);
    else if (cmd === 'toward') a = toward(s); else if (cmd === 'away') a = away(s);
    else if (cmd === 'up') a = { type: 'move', dir: 1 }; else if (cmd === 'down') a = { type: 'move', dir: -1 };
    else a = { type: cmd } as E.Action;
    s = E.reduce(s, a);
    steps.push({ do: a, expect: snap(s) });
  }
  return { mission, seed, steps, final: { main: s.main.map(pdump), results: s.results, retryResults: s.retryResults, summary: s.phase === 'done' || s.phase === 'summary' ? E.summarize(s) : null, retry: s.retry.map(pdump) } };
}
const allCorrect = (n: number) => Array.from({ length: n }, () => ['correct', 'next']).flat();
const solveTravel = (s0: number) => { const out: string[] = []; for (let i = 0; i < s0; i++) out.push('toward'); return [...out, 'arrive', 'next']; };
const travelSteps = (mission: string, seed: number, i: number) => { const p = E.generateProblems(mission, seed)[i] as E.TravelProblem; return Math.abs(p.target - p.start); };
const replays: any[] = [];
replays.push({ name: '1-1 모두 첫 시도 정답 → 별 3, 다시 풀기 없음', ...play('1-1', 7, [...allCorrect(4), 'finish']) });
replays.push({ name: '1-1 첫 문제에서 다른 층을 골랐다가 정답 → 별 2, 다시 풀기 1문제', ...play('1-1', 7, ['neighbor', 'correct', 'next', ...allCorrect(3), 'finish', 'retry', 'correct', 'next', 'finish']) });
replays.push({ name: '1-1 선택지 3개에서 두 번 틀림 → 남은 하나라 바로 정답 공개', ...play('1-1', 11, ['answer-again-ignored-check', 'enharmonic', 'neighbor', 'correct', 'next', ...allCorrect(3), 'retry', 'correct', 'next', 'finish'].filter(x => x !== 'answer-again-ignored-check')) });
replays.push({ name: '3-1 힌트 1(도수) → 힌트 2(반음) → 정답 공개, 두 번째 문제는 성질만 틀림', ...play('3-1', 42, ['enharmonic', 'neighbor', 'neighbor', 'correct', 'next', 'neighbor', 'correct', 'next', ...allCorrect(4), 'retry', 'correct', 'next', 'correct', 'next', 'finish']) });
replays.push({ name: '4-1 없는 이름(단5도·장5도)을 고름 → 완전 계열 힌트', ...play('4-1', 5, ['family', 'correct', 'next', ...allCorrect(5), 'retry', 'correct', 'next', 'finish']) });
const p32 = E.generateProblems('3-2', 7) as E.TravelProblem[];
replays.push({ name: '3-2 반대로 갔다가 도착(오답) → 두 번 누름 무시 → 목적층 도착 / 지나쳤다 돌아옴(별 3 불가)', ...play('3-2', 7, [
  'away', 'arrive', 'arrive', ...Array.from({ length: Math.abs(p32[0]!.target - p32[0]!.start) + 1 }, () => 'toward'), 'arrive', 'next',
  ...solveTravel(travelSteps('3-2', 7, 1)),
  ...Array.from({ length: travelSteps('3-2', 7, 2) }, () => 'toward'), 'away', 'toward', 'arrive', 'next',
  ...solveTravel(travelSteps('3-2', 7, 3)), ...solveTravel(travelSteps('3-2', 7, 4)),
  'retry', ...solveTravel(1), 'finish']) });
replays.push({ name: '2-2 움직이지 않고 도착(무시)·열린 범위 밖 이동(무시)·세 번 틀려 정답 공개', ...play('2-2', 3, [
  'arrive', (s: E.Session) => { const p = E.currentProblem(s) as E.TravelProblem; const r = s.run as E.TravelRun; return { type: 'move', dir: r.floor === p.open[0] ? -1 : 1 } as E.Action; }, 'away', 'toward', 'toward', 'away', 'arrive', 'toward', 'away', 'arrive', 'toward', 'away', 'arrive', 'next',
  ...solveTravel(1), ...solveTravel(1), ...solveTravel(1), 'retry', ...solveTravel(1), 'finish']) });
replays.push({ name: '4-3 두 건물 비교 모두 가장 짧게 → 별 3', ...play('4-3', 2026, [0,1,2,3,4,5].flatMap(i => solveTravel(travelSteps('4-3', 2026, i))).concat(['finish'])) });
replays.push({ name: '4-4 총정리: 답하기 전 건물 가림', ...play('4-4', 9, ['correct', 'next']) });

// 6) 진행 기록·잠금
const sumOf = (name: string) => replays.find(r => r.name.startsWith(name))!.final.summary as E.MissionSummary;
const unlockMap = (p: E.Progress) => Object.fromEntries(E.MISSIONS.map(m => [m.id, E.isMissionUnlocked(p, m.id)]));
const stageMap = (p: E.Progress) => Object.fromEntries(E.STAGES.map(s => [s.id, E.isStageUnlocked(p, s.id)]));
const progress: any[] = [];
let pg = E.emptyProgress();
const pstep = (op: any, p: E.Progress) => progress.push({ op, after: p, unlocked: unlockMap(p), stages: stageMap(p), stars: Object.fromEntries(E.STAGES.map(s => [s.id, E.stageStars(p, s.id)])), top: E.topMistakes(p), explore: E.exploreAccess(p).map(x => ({ degree: x.degree, bases: x.bases.map(nk), open: x.open })) });
pstep({ type: 'empty' }, pg);
pg = E.recordTutorial(pg, '1-0'); pstep({ type: 'tutorial', mission: '1-0' }, pg);
pg = E.recordMission(pg, sumOf('1-1 첫 문제에서')); pstep({ type: 'mission', summary: sumOf('1-1 첫 문제에서') }, pg);
pg = E.recordMission(pg, sumOf('1-1 모두')); pstep({ type: 'mission', summary: sumOf('1-1 모두') }, pg);
const s12 = { missionId: '1-2', n: 2, firstTry: 2, accuracy: 100, stars: 3, moves: 2, minimal: 2, mistakes: [] } as E.MissionSummary;
pg = E.recordMission(pg, s12); pstep({ type: 'mission', summary: s12 }, pg);
pg = E.recordTutorial(pg, '2-0'); pstep({ type: 'tutorial', mission: '2-0' }, pg);
const link = E.parseClassLink('?open=4&sound=off');
pg = E.applyClassLink(pg, link); pstep({ type: 'classLink', query: '?open=4&sound=off' }, pg);
pg = E.recordMission(pg, sumOf('3-1')); pstep({ type: 'mission', summary: sumOf('3-1') }, pg);
pg = E.recordTutorial(pg, '4-0'); pstep({ type: 'tutorial', mission: '4-0' }, pg);
const parse = [
  { raw: E.serializeProgress(pg), expect: pg },
  { raw: null, expect: E.emptyProgress() }, { raw: '', expect: E.emptyProgress() }, { raw: 'not json', expect: E.emptyProgress() },
  { raw: '{"v":2,"missions":{}}', expect: E.emptyProgress() },
  { raw: '{"v":1,"missions":{"1-0":{"done":true,"best":9,"plays":"x"},"9-9":{"done":true}},"mistakes":{"id:3m":2,"bad":-1},"teacherOpen":99}', expect: E.parseProgress('{"v":1,"missions":{"1-0":{"done":true,"best":9,"plays":"x"},"9-9":{"done":true}},"mistakes":{"id:3m":2,"bad":-1},"teacherOpen":99}') },
];
const classLinks = ['?open=3', 'open=3&sound=off', '?open=0', '?open=5', '?open=abc', '?open=2.5', '?sound=on', '?sound=x', ''].map(q => ({ query: q, expect: E.parseClassLink(q) }));
const keyboard = [[3], [5], [3, 5]].map(d => ({ degrees: d, expect: E.keyboardRange(d as E.Degree[]) }));
const typeLabels = ['id:3m', 'id:5P', 'tr:3M>d', 'tr:5P>A', 'weird'].map(k => [k, E.typeLabel(k)]);
const R = (firstTry: boolean, efficient: boolean | null = null) => ({ firstTry, efficient });
const starsCases = [
  { results: [R(true), R(true), R(true), R(true), R(true), R(true)] },
  { results: [R(true), R(true), R(true), R(true), R(false), R(false)] },
  { results: [R(true), R(true), R(true), R(false), R(false), R(false)] },
  { results: [R(true, true), R(true, true), R(true, false), R(true, true), R(true, true)] },
  { results: [R(true, true), R(false, false)] },
  { results: [R(true), R(true), R(true), R(false)] },
].map(c => ({ ...c, expect: E.starsFor(c.results as E.ProblemResult[]) }));
const golden = {
  meta: { name: '음정 엘리베이터 정답표', version: 1, created: '2026-11-12', engine: 'src/engine/engine.ts (참조 엔진 v1)', notes: '음 표기: Eb4 = E플랫4, Fx5 = F더블샵5, Cbb5 = C더블플랫5. 층은 색인(0 = B2). message는 문장 회귀 검사용' },
  intervals, qualityFor, missions, retries, replays, progress, progressParse: parse, classLinks, keyboard, typeLabels, starsCases,
};
const out = process.argv[2] ?? 'src/engine/golden/interval_elevator_golden_v1.json';
writeFileSync(out, JSON.stringify(golden));
console.log('intervals', intervals.length, 'qualityFor', qualityFor.length, 'missions', missions.length, 'retries', retries.length, 'replays', replays.length, 'steps', replays.reduce((t, r) => t + r.steps.length, 0), 'progress', progress.length);
