/**
 * 음정 엘리베이터 — 참조 엔진 정답표 검사 (Vitest)
 * 실행: npx vitest run src/engine
 * 이 파일과 golden/interval_elevator_golden_v1.json, engine.ts 는 함께 움직인다. 고치지 않는다.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as E from './engine';

interface GInterval {
  degree: number;
  base: string;
  floor: number;
  quality: string;
  name: string;
  floorLabel: string;
  upper: string;
  semitones: number;
  baseMidi: number;
  upperMidi: number;
  baseStep: number;
  upperStep: number;
  displayable: boolean;
}
interface Snapshot {
  phase: string;
  round: string;
  index: number;
  canRetry: boolean;
  run: unknown;
  visibility?: unknown;
  message?: { tone: string; title: string; lines: string[] };
}
interface GReplay {
  name: string;
  mission: string;
  seed: number;
  steps: { do: E.Action | null; expect: Snapshot }[];
  final: { main: unknown[]; results: unknown[]; retryResults: unknown[]; summary: unknown; retry: unknown[] };
}
type GOp =
  | { type: 'empty' }
  | { type: 'tutorial'; mission: string }
  | { type: 'mission'; summary: E.MissionSummary }
  | { type: 'classLink'; query: string };
interface Golden {
  intervals: GInterval[];
  qualityFor: [number, number, string | null][];
  missions: { mission: string; seed: number; problems: unknown[] }[];
  retries: { mission: string; seed: number; wrongIndexes: number[]; problems: unknown[] }[];
  replays: GReplay[];
  progress: { op: GOp; after: unknown; unlocked: Record<string, boolean>; stages: Record<string, boolean>; stars: unknown; top: unknown; explore: unknown }[];
  progressParse: { raw: string | null; expect: unknown }[];
  classLinks: { query: string; expect: unknown }[];
  keyboard: { degrees: number[]; expect: [number, number] }[];
  typeLabels: [string, string][];
  starsCases: { results: { firstTry: boolean; efficient: boolean | null }[]; expect: number }[];
}

const g = JSON.parse(readFileSync(fileURLToPath(new URL('./golden/interval_elevator_golden_v1.json', import.meta.url)), 'utf8')) as Golden;
const nk = E.noteKey;

function dump(p: E.Problem): unknown {
  if (p.kind === 'identify') {
    return {
      id: p.id, kind: p.kind, degree: p.degree, base: nk(p.base), floor: p.floor, open: p.open, hideBuilding: p.hideBuilding, typeKey: p.typeKey,
      options: p.options.map((o) => ({ id: o.id, role: o.role, label: o.label, exists: o.exists })),
    };
  }
  return { id: p.id, kind: p.kind, degree: p.degree, base: nk(p.base), start: p.start, target: p.target, open: p.open, typeKey: p.typeKey, pair: p.pair };
}

function snap(s: E.Session): Snapshot {
  const out: Snapshot = { phase: s.phase, round: s.round, index: s.index, canRetry: s.canRetry, run: s.run };
  if (s.phase === 'question' || s.phase === 'feedback') {
    const m = E.messageOf(s);
    out.visibility = E.visibilityOf(s);
    out.message = { tone: m.tone, title: E.lineText(m.title), lines: m.lines.map((l) => E.lineText(l)) };
  }
  return out;
}

describe('음정 계산', () => {
  it(`2~8도 × 기준음 21개 × 모든 층 (${g.intervals.length}건)`, () => {
    for (const r of g.intervals) {
      const v = E.describe(r.degree as E.Degree, E.parseNote(r.base), r.floor);
      expect({
        quality: v.quality, name: v.name, floorLabel: v.floorLabel, upper: nk(v.upper), semitones: v.semitones,
        baseMidi: v.baseMidi, upperMidi: v.upperMidi, baseStep: v.baseStep, upperStep: v.upperStep, displayable: v.displayable,
      }, `${r.base} ${r.degree}도 ${r.floor}층`).toEqual({
        quality: r.quality, name: r.name, floorLabel: r.floorLabel, upper: r.upper, semitones: r.semitones,
        baseMidi: r.baseMidi, upperMidi: r.upperMidi, baseStep: r.baseStep, upperStep: r.upperStep, displayable: r.displayable,
      });
    }
  });
  it('도수 + 반음 수 → 성질', () => {
    for (const [d, s, q] of g.qualityFor) expect(E.qualityFor(d as E.Degree, s), `${d}도 ${s}반음`).toBe(q);
  });
  it('기획 PDF 8장 단위 검증 10건', () => {
    const C4 = E.parseNote('C4');
    const cases: [E.Degree, E.QualityKey, string, number][] = [
      [3, 'm', 'Eb4', 3], [3, 'M', 'E4', 4], [3, 'd', 'Ebb4', 2], [3, 'A', 'E#4', 5], [3, 'AA', 'Ex4', 6],
      [5, 'dd', 'Gbb4', 5], [5, 'd', 'Gb4', 6], [5, 'P', 'G4', 7], [5, 'A', 'G#4', 8], [5, 'AA', 'Gx4', 9],
    ];
    for (const [d, q, upper, semis] of cases) {
      const f = E.floorOf(d, q);
      expect(nk(E.upperNote(C4, d, f))).toBe(upper);
      expect(E.semitonesOf(d, f)).toBe(semis);
    }
  });
});

describe('문제 만들기', () => {
  it(`미션 ${g.missions.length}세트 (같은 시드 → 같은 문제)`, () => {
    for (const c of g.missions) expect(E.generateProblems(c.mission, c.seed).map(dump), `${c.mission} 시드 ${c.seed}`).toEqual(c.problems);
  });
  it('다시 풀기 문제', () => {
    for (const c of g.retries) {
      const main = E.generateProblems(c.mission, c.seed);
      const wrong = c.wrongIndexes.map((i) => main[i]).filter((p): p is E.Problem => p !== undefined);
      expect(E.makeRetryProblems(c.mission, wrong, c.seed).map(dump), c.mission).toEqual(c.problems);
    }
  });
});

describe('미션 진행 재생', () => {
  for (const r of g.replays) {
    it(r.name, () => {
      let s = E.startSession(r.mission, r.seed);
      r.steps.forEach((st, i) => {
        if (st.do) s = E.reduce(s, st.do);
        expect(snap(s), `${i}번째 단계`).toEqual(st.expect);
      });
      expect(s.main.map(dump)).toEqual(r.final.main);
      expect(s.results).toEqual(r.final.results);
      expect(s.retryResults).toEqual(r.final.retryResults);
      expect(s.retry.map(dump)).toEqual(r.final.retry);
      expect(s.phase === 'done' || s.phase === 'summary' ? E.summarize(s) : null).toEqual(r.final.summary);
    });
  }
});

describe('진행 기록과 잠금', () => {
  it('기록 쌓기 · 단계와 미션 잠금 · 별 · 자주 틀린 것 · 자유 둘러보기', () => {
    let p = E.emptyProgress();
    for (const st of g.progress) {
      const op = st.op;
      if (op.type === 'tutorial') p = E.recordTutorial(p, op.mission);
      if (op.type === 'mission') p = E.recordMission(p, op.summary);
      if (op.type === 'classLink') p = E.applyClassLink(p, E.parseClassLink(op.query));
      expect(p, op.type).toEqual(st.after);
      expect(Object.fromEntries(E.MISSIONS.map((m) => [m.id, E.isMissionUnlocked(p, m.id)]))).toEqual(st.unlocked);
      expect(Object.fromEntries(E.STAGES.map((x) => [String(x.id), E.isStageUnlocked(p, x.id)]))).toEqual(st.stages);
      expect(Object.fromEntries(E.STAGES.map((x) => [String(x.id), E.stageStars(p, x.id)]))).toEqual(st.stars);
      expect(E.topMistakes(p)).toEqual(st.top);
      expect(E.exploreAccess(p).map((x) => ({ degree: x.degree, bases: x.bases.map(nk), open: x.open }))).toEqual(st.explore);
    }
  });
  it('저장된 기록 읽기 (깨진 값은 빈 기록으로)', () => {
    for (const c of g.progressParse) expect(E.parseProgress(c.raw), String(c.raw).slice(0, 40)).toEqual(c.expect);
  });
});

describe('수업 링크 · 건반 범위 · 별 · 종류 이름', () => {
  it('수업 링크 읽기', () => {
    for (const c of g.classLinks) expect(E.parseClassLink(c.query), c.query).toEqual(c.expect);
  });
  it('건반 범위', () => {
    for (const c of g.keyboard) expect(E.keyboardRange(c.degrees as E.Degree[])).toEqual(c.expect);
  });
  it('별 계산', () => {
    for (const c of g.starsCases) {
      const results = c.results.map((x, i) => ({
        problemId: String(i), typeKey: 'x', kind: x.efficient === null ? 'identify' : 'travel', firstTry: x.firstTry, wrong: x.firstTry ? 0 : 1,
        revealed: false, hint: 0, errors: [], moves: null, minimal: null, efficient: x.efficient,
      })) as E.ProblemResult[];
      expect(E.starsFor(results)).toBe(c.expect);
    }
  });
  it('문제 종류 이름', () => {
    for (const [k, label] of g.typeLabels) expect(E.typeLabel(k)).toBe(label);
  });
});
