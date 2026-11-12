/**
 * 음정 엘리베이터 — 참조 엔진 v1 (2026-11-12)
 *
 * 이 파일은 그대로 복사해 쓰고 고치지 않는다. 화면 코드는 이 파일이 내보내는 함수와 데이터만 쓴다.
 * 검증: src/engine/golden/interval_elevator_golden_v1.json 을 engine.golden.test.ts 가 대조한다.
 * 규칙을 바꿔야 하면 기획서를 먼저 고치고, 엔진과 정답표를 함께 다시 만든다.
 *
 * 핵심 원칙 (기획 PDF 8장)
 * - 음은 문자·임시표·옥타브를 따로 보관한다. MIDI 번호만 저장하면 이명동음 표기가 사라진다.
 * - 위 음은 도수로 문자와 옥타브를 먼저 정하고, 필요한 반음 간격에 맞춰 임시표를 정한다.
 * - 층 이동 수는 층 번호 숫자를 빼지 않고 실제 층 순서(색인)로 계산한다. 0층은 없다.
 * - 정답·피드백·건반·악보·소리 높이는 모두 이 파일의 같은 계산에서 나온다.
 *
 * 차례
 *  1. 음과 음정       2. 표기          3. 난수
 *  4. 단계와 미션     5. 문제 만들기    6. 미션 진행(상태 기계)
 *  7. 결과와 별       8. 보이기 규칙    9. 안내 문장
 * 10. 안내(튜토리얼) 대본   11. 진행 기록과 잠금   12. 수업 링크   13. 화면 도우미
 */

// ─────────────────────────────────────────────────────────────
// 1. 음과 음정
// ─────────────────────────────────────────────────────────────

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** 장·단 계열(2·3·6·7도) / 완전 계열(1·4·5·8도) */
export type Family = 'majorMinor' | 'perfect';
/** dd 겹감 · d 감 · m 단 · M 장 · P 완전 · A 증 · AA 겹증 */
export type QualityKey = 'dd' | 'd' | 'm' | 'M' | 'P' | 'A' | 'AA';

/** 음 하나. acc: -2 겹내림 · -1 내림 · 0 없음 · +1 올림 · +2 겹올림 (계산 중에는 ±3도 나올 수 있다) */
export interface Note {
  letter: Letter;
  acc: number;
  octave: number;
}

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PITCH_CLASS: Readonly<Record<Letter, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 장음정·완전음정의 반음 수 (기획 PDF 8장) */
export const BASE_SEMITONES: Readonly<Record<Degree, number>> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12 };

export const QUALITY_NAME: Readonly<Record<QualityKey, string>> = {
  dd: '겹감',
  d: '감',
  m: '단',
  M: '장',
  P: '완전',
  A: '증',
  AA: '겹증',
};

export interface FloorDef {
  /** 건물 안 층 순서. 0이 가장 아래(겹감) */
  index: number;
  quality: QualityKey;
  /** 기준층(장·완전)에서 몇 반음 떨어졌나 */
  offset: number;
  /** 화면 표기: B2, B1, 1층, 2층 … */
  label: string;
  /** 화면 읽기 프로그램용: 지하 2층, 지하 1층, 1층 … */
  longLabel: string;
}

const MAJOR_MINOR_FLOORS: readonly FloorDef[] = [
  { index: 0, quality: 'dd', offset: -3, label: 'B2', longLabel: '지하 2층' },
  { index: 1, quality: 'd', offset: -2, label: 'B1', longLabel: '지하 1층' },
  { index: 2, quality: 'm', offset: -1, label: '1층', longLabel: '1층' },
  { index: 3, quality: 'M', offset: 0, label: '2층', longLabel: '2층' },
  { index: 4, quality: 'A', offset: 1, label: '3층', longLabel: '3층' },
  { index: 5, quality: 'AA', offset: 2, label: '4층', longLabel: '4층' },
];

const PERFECT_FLOORS: readonly FloorDef[] = [
  { index: 0, quality: 'dd', offset: -2, label: 'B2', longLabel: '지하 2층' },
  { index: 1, quality: 'd', offset: -1, label: 'B1', longLabel: '지하 1층' },
  { index: 2, quality: 'P', offset: 0, label: '1층', longLabel: '1층' },
  { index: 3, quality: 'A', offset: 1, label: '2층', longLabel: '2층' },
  { index: 4, quality: 'AA', offset: 2, label: '3층', longLabel: '3층' },
];

export function familyOf(degree: Degree): Family {
  return degree === 1 || degree === 4 || degree === 5 || degree === 8 ? 'perfect' : 'majorMinor';
}

export function floorsOf(degree: Degree): readonly FloorDef[] {
  return familyOf(degree) === 'perfect' ? PERFECT_FLOORS : MAJOR_MINOR_FLOORS;
}

/** 기준층(장음정 또는 완전음정)의 색인. 장·단 계열 3, 완전 계열 2 */
export function referenceFloor(degree: Degree): number {
  return familyOf(degree) === 'perfect' ? 2 : 3;
}

export function floorDef(degree: Degree, floor: number): FloorDef {
  const f = floorsOf(degree)[floor];
  if (!f) throw new RangeError(`${degree}도 건물에는 ${floor}번 층이 없습니다`);
  return f;
}

/** 성질 → 층 색인. 그 건물에 없는 성질이면 오류 (예: 5도의 '단') */
export function floorOf(degree: Degree, quality: QualityKey): number {
  const i = floorsOf(degree).findIndex((f) => f.quality === quality);
  if (i < 0) throw new RangeError(`${degree}도에는 ${QUALITY_NAME[quality]} 층이 없습니다`);
  return i;
}

/** 첫 버전에서 건물에 그리는 층 범위 (겹감·겹증은 그리지 않는다). 장·단 계열 B1~3층, 완전 계열 B1~2층 */
export function buildingFloors(degree: Degree): [number, number] {
  return familyOf(degree) === 'perfect' ? [1, 3] : [1, 4];
}

export function semitonesOf(degree: Degree, floor: number): number {
  return BASE_SEMITONES[degree] + floorDef(degree, floor).offset;
}

/** 기준음(아래 음)과 도수·층으로 위 음을 계산한다. 문자·옥타브는 도수로, 임시표는 반음 간격으로 정한다 */
export function upperNote(base: Note, degree: Degree, floor: number): Note {
  const i = LETTERS.indexOf(base.letter) + degree - 1;
  const letter = LETTERS[i % 7] as Letter;
  const octave = base.octave + Math.floor(i / 7);
  const natural = PITCH_CLASS[letter] + 12 * octave - (PITCH_CLASS[base.letter] + 12 * base.octave);
  return { letter, acc: semitonesOf(degree, floor) - natural + base.acc, octave };
}

/** 소리 높이 (가온 다 C4 = 60) */
export function midiOf(n: Note): number {
  return 12 * (n.octave + 1) + PITCH_CLASS[n.letter] + n.acc;
}

/** 높은음자리표 오선 위치. E4(맨 아랫줄) = 0, 한 칸 또는 한 줄 오를 때마다 +1. C4 = -2(아래 덧줄 1개), F5 = 8(맨 윗줄) */
export function staffStepOf(n: Note): number {
  return (n.octave - 4) * 7 + LETTERS.indexOf(n.letter) - 2;
}

/** 도수와 반음 수로 성질을 찾는다. 겹감~겹증 밖이면 null */
export function qualityFor(degree: Degree, semitones: number): QualityKey | null {
  const offset = semitones - BASE_SEMITONES[degree];
  const f = floorsOf(degree).find((x) => x.offset === offset);
  return f ? f.quality : null;
}

export function intervalName(degree: Degree, quality: QualityKey): string {
  return `${QUALITY_NAME[quality]}${degree}도`;
}

/** 첫 버전 출제 조건: 두 음 모두 임시표 2개 이내, 간격이 0보다 큼 */
export function isDisplayable(base: Note, degree: Degree, floor: number): boolean {
  const u = upperNote(base, degree, floor);
  return Math.abs(base.acc) <= 2 && Math.abs(u.acc) <= 2 && semitonesOf(degree, floor) > 0;
}

export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.acc === b.acc && a.octave === b.octave;
}

export interface IntervalView {
  degree: Degree;
  family: Family;
  floor: number;
  floorLabel: string;
  floorLongLabel: string;
  quality: QualityKey;
  name: string;
  base: Note;
  upper: Note;
  semitones: number;
  baseMidi: number;
  upperMidi: number;
  baseStep: number;
  upperStep: number;
  displayable: boolean;
}

/** 화면에 필요한 값을 한 번에 계산한다 (표시판·악보·건반·소리가 모두 이것을 쓴다) */
export function describe(degree: Degree, base: Note, floor: number): IntervalView {
  const f = floorDef(degree, floor);
  const upper = upperNote(base, degree, floor);
  return {
    degree,
    family: familyOf(degree),
    floor,
    floorLabel: f.label,
    floorLongLabel: f.longLabel,
    quality: f.quality,
    name: intervalName(degree, f.quality),
    base,
    upper,
    semitones: semitonesOf(degree, floor),
    baseMidi: midiOf(base),
    upperMidi: midiOf(upper),
    baseStep: staffStepOf(base),
    upperStep: staffStepOf(upper),
    displayable: isDisplayable(base, degree, floor),
  };
}

// ─────────────────────────────────────────────────────────────
// 2. 표기
// ─────────────────────────────────────────────────────────────

export type SpellStyle = 'symbol' | 'ascii' | 'word';

const WORD_COUNT: readonly string[] = ['', '', '더블 ', '트리플 '];

/** 임시표 글자. symbol: ♭ 𝄫 ♯ 𝄪 (세 개 이상은 ♭𝄫, ♯𝄪처럼 합침) · ascii: b bb # x · word: 플랫, 더블 샵 … */
export function accidentalText(acc: number, style: SpellStyle = 'symbol'): string {
  const n = Math.abs(acc);
  if (n === 0) return '';
  if (style === 'ascii') return acc < 0 ? 'b'.repeat(n) : `${n % 2 === 1 ? '#' : ''}${'x'.repeat(Math.floor(n / 2))}`;
  if (style === 'word') {
    const name = acc < 0 ? '플랫' : '샵';
    return n <= 3 ? ` ${WORD_COUNT[n] ?? ''}${name}` : ` ${name} ${n}개`;
  }
  return acc < 0 ? `${n % 2 === 1 ? '♭' : ''}${'𝄫'.repeat(Math.floor(n / 2))}` : `${n % 2 === 1 ? '♯' : ''}${'𝄪'.repeat(Math.floor(n / 2))}`;
}

/**
 * 음 이름 글자. 'symbol'의 𝄫·𝄪는 휴대폰 글꼴에 없을 수 있으므로 화면에서는 임시표를 악보 글리프(SVG)로 그린다.
 * 'word'는 화면 읽기 프로그램용 (예: "E 플랫")
 */
export function spell(n: Note, style: SpellStyle = 'symbol', withOctave = false): string {
  return `${n.letter}${accidentalText(n.acc, style)}${withOctave ? n.octave : ''}`;
}

/** 'Eb4', 'F#5', 'Cbb5', 'Gx4' 같은 글자를 음으로 바꾼다 (정답표·테스트용) */
export function parseNote(text: string): Note {
  const m = /^([A-G])(b+|#?x*)(-?\d+)$/.exec(text);
  if (!m) throw new SyntaxError(`음 이름을 읽을 수 없습니다: ${text}`);
  const t = m[2] ?? '';
  const acc = t.startsWith('b') ? -t.length : (t.startsWith('#') ? 1 : 0) + 2 * (t.length - (t.startsWith('#') ? 1 : 0));
  return { letter: m[1] as Letter, acc, octave: Number(m[3]) };
}

export function noteKey(n: Note): string {
  return spell(n, 'ascii', true);
}

/** 한 칸, 두 칸 … (고유어 수) */
export const COUNT_WORD: readonly string[] = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];

function countWord(n: number): string {
  return COUNT_WORD[n] ?? String(n);
}

/** 기준음 문자부터 위 음 문자까지 센 글자들. 3도 C → ['C','D','E'] */
export function degreeLetters(base: Note, degree: Degree): Letter[] {
  const start = LETTERS.indexOf(base.letter);
  const out: Letter[] = [];
  for (let k = 0; k < degree; k++) out.push(LETTERS[(start + k) % 7] as Letter);
  return out;
}

// ─────────────────────────────────────────────────────────────
// 3. 난수 (같은 시드 → 같은 문제)
// ─────────────────────────────────────────────────────────────

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

export function deriveSeed(seed: number, salt: number): number {
  return Math.imul((seed ^ salt) >>> 0, 0x9e3779b1) >>> 0;
}

/** 미션을 시작할 때마다 새 시드를 만든다 */
export function newSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

// ─────────────────────────────────────────────────────────────
// 4. 단계와 미션
// ─────────────────────────────────────────────────────────────

export type MissionKind = 'tutorial' | 'identify' | 'travel' | 'pairs';

/** 손님 모시기 한 문제의 종류: 같은 건물에서 from 층 → to 층 */
export interface TravelSpec {
  degree: Degree;
  from: QualityKey;
  to: QualityKey;
}

export interface MissionDef {
  id: string;
  stageId: number;
  kind: MissionKind;
  title: string;
  degrees: Degree[];
  bases: Note[];
  /** 도수별로 열린 층 범위 [아래, 위] (층 색인) */
  open: Partial<Record<Degree, [number, number]>>;
  /** 문제 수 (안내는 0) */
  count: number;
  optionCount?: 3 | 4;
  travel?: TravelSpec[];
  pairs?: [TravelSpec, TravelSpec][];
  /** 층 맞히기에서 답하기 전 건물 이름을 가린다 (두 건물 섞기) */
  hideBuilding?: boolean;
  tutorial?: TutorialId;
}

export interface StageDef {
  id: number;
  title: string;
  subtitle: string;
  buildings: Degree[];
  missions: MissionDef[];
}

const C4: Note = { letter: 'C', acc: 0, octave: 4 };
/** 첫 버전 기준음: 가온 다(C4)부터 B4까지 흰건반 7개 */
export const WHITE_BASES: readonly Note[] = LETTERS.map((letter) => ({ letter, acc: 0, octave: 4 }));

const CORE_3: [number, number] = [2, 3]; // 1층 단 ~ 2층 장
const ALL_3: [number, number] = [1, 4]; // B1 감 ~ 3층 증
const ALL_5: [number, number] = [1, 3]; // B1 감 ~ 2층 증

const tr = (degree: Degree, from: QualityKey, to: QualityKey): TravelSpec => ({ degree, from, to });

export const STAGES: readonly StageDef[] = [
  {
    id: 1,
    title: '첫 출근',
    subtitle: '3도 건물 · 기준음 C · 단3도와 장3도',
    buildings: [3],
    missions: [
      { id: '1-0', stageId: 1, kind: 'tutorial', title: '안내', degrees: [3], bases: [C4], open: { 3: CORE_3 }, count: 0, tutorial: 'first-day' },
      { id: '1-1', stageId: 1, kind: 'identify', title: '층 맞히기', degrees: [3], bases: [C4], open: { 3: CORE_3 }, count: 4, optionCount: 3 },
      {
        id: '1-2', stageId: 1, kind: 'travel', title: '손님 모시기', degrees: [3], bases: [C4], open: { 3: CORE_3 }, count: 2,
        travel: [tr(3, 'm', 'M'), tr(3, 'M', 'm')],
      },
    ],
  },
  {
    id: 2,
    title: '기준음이 바뀌어요',
    subtitle: '3도 건물 · 기준음 C~B · 단3도와 장3도',
    buildings: [3],
    missions: [
      { id: '2-0', stageId: 2, kind: 'tutorial', title: '안내', degrees: [3], bases: [...WHITE_BASES], open: { 3: CORE_3 }, count: 0, tutorial: 'new-bases' },
      { id: '2-1', stageId: 2, kind: 'identify', title: '층 맞히기', degrees: [3], bases: [...WHITE_BASES], open: { 3: CORE_3 }, count: 6, optionCount: 3 },
      {
        id: '2-2', stageId: 2, kind: 'travel', title: '손님 모시기', degrees: [3], bases: [...WHITE_BASES], open: { 3: CORE_3 }, count: 4,
        travel: [tr(3, 'm', 'M'), tr(3, 'M', 'm')],
      },
    ],
  },
  {
    id: 3,
    title: '지하 1층과 3층',
    subtitle: '3도 건물 · 감3도부터 증3도까지',
    buildings: [3],
    missions: [
      { id: '3-0', stageId: 3, kind: 'tutorial', title: '안내', degrees: [3], bases: [...WHITE_BASES], open: { 3: ALL_3 }, count: 0, tutorial: 'new-floors' },
      { id: '3-1', stageId: 3, kind: 'identify', title: '층 맞히기', degrees: [3], bases: [...WHITE_BASES], open: { 3: ALL_3 }, count: 6, optionCount: 4 },
      {
        id: '3-2', stageId: 3, kind: 'travel', title: '손님 모시기', degrees: [3], bases: [...WHITE_BASES], open: { 3: ALL_3 }, count: 5,
        travel: [tr(3, 'm', 'd'), tr(3, 'M', 'A'), tr(3, 'M', 'd'), tr(3, 'm', 'A'), tr(3, 'd', 'A')],
      },
    ],
  },
  {
    id: 4,
    title: '5도 건물',
    subtitle: '완전 계열 · 두 건물 비교',
    buildings: [3, 5],
    missions: [
      { id: '4-0', stageId: 4, kind: 'tutorial', title: '안내', degrees: [5], bases: [...WHITE_BASES], open: { 5: ALL_5 }, count: 0, tutorial: 'fifth-building' },
      { id: '4-1', stageId: 4, kind: 'identify', title: '층 맞히기', degrees: [5], bases: [...WHITE_BASES], open: { 5: ALL_5 }, count: 6, optionCount: 4 },
      {
        id: '4-2', stageId: 4, kind: 'travel', title: '손님 모시기', degrees: [5], bases: [...WHITE_BASES], open: { 5: ALL_5 }, count: 4,
        travel: [tr(5, 'P', 'A'), tr(5, 'P', 'd'), tr(5, 'A', 'd'), tr(5, 'd', 'A')],
      },
      {
        id: '4-3', stageId: 4, kind: 'pairs', title: '두 건물 비교', degrees: [3, 5], bases: [...WHITE_BASES], open: { 3: ALL_3, 5: ALL_5 }, count: 6,
        pairs: [
          [tr(3, 'M', 'd'), tr(5, 'P', 'd')],
          [tr(3, 'd', 'M'), tr(5, 'd', 'P')],
          [tr(3, 'M', 'A'), tr(5, 'P', 'A')],
        ],
      },
      {
        id: '4-4', stageId: 4, kind: 'identify', title: '총정리', degrees: [3, 5], bases: [...WHITE_BASES], open: { 3: ALL_3, 5: ALL_5 }, count: 8,
        optionCount: 4, hideBuilding: true,
      },
    ],
  },
];

export const MISSIONS: readonly MissionDef[] = STAGES.flatMap((s) => s.missions);

export function missionById(id: string): MissionDef {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new RangeError(`없는 미션: ${id}`);
  return m;
}

export function stageById(id: number): StageDef {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new RangeError(`없는 단계: ${id}`);
  return s;
}

export function openOf(m: MissionDef, degree: Degree): [number, number] {
  const r = m.open[degree];
  if (!r) throw new RangeError(`${m.id} 미션에 ${degree}도 범위가 없습니다`);
  return r;
}

// ─────────────────────────────────────────────────────────────
// 5. 문제 만들기
// ─────────────────────────────────────────────────────────────

export type OptionRole = 'correct' | 'neighbor' | 'enharmonic' | 'family';

export interface AnswerOption {
  /** 예: '3m' (단3도), '2A' (증2도), '5m' (단5도, 없는 이름) */
  id: string;
  degree: Degree;
  quality: QualityKey;
  label: string;
  /** correct 정답 · neighbor 같은 건물 다른 층 · enharmonic 같은 소리 다른 도수 · family 그 건물에 없는 이름 */
  role: OptionRole;
  /** 실제로 있는 음정 이름인가 (family 함정은 false) */
  exists: boolean;
}

export interface IdentifyProblem {
  kind: 'identify';
  id: string;
  missionId: string;
  degree: Degree;
  base: Note;
  floor: number;
  open: [number, number];
  options: AnswerOption[];
  hideBuilding: boolean;
  typeKey: string;
}

export interface TravelProblem {
  kind: 'travel';
  id: string;
  missionId: string;
  degree: Degree;
  base: Note;
  start: number;
  target: number;
  open: [number, number];
  typeKey: string;
  /** 두 건물 비교 미션에서 짝 번호와 순서 (0 = 3도, 1 = 5도) */
  pair: { id: number; pos: 0 | 1 } | null;
}

export type Problem = IdentifyProblem | TravelProblem;

type Round = 'main' | 'retry';

interface Candidate {
  degree: Degree;
  base: Note;
  floor: number;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

function roundRobin<T>(lists: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const max = lists.reduce((n, l) => Math.max(n, l.length), 0);
  for (let i = 0; i < max; i++) {
    for (const l of lists) {
      const x = l[i];
      if (x !== undefined) out.push(x);
    }
  }
  return out;
}

/** 같은 문제가 연달아 나오지 않게 뒤쪽의 다른 문제와 자리를 바꾼다 */
function separateRepeats<T>(items: readonly T[], same: (a: T, b: T) => boolean): T[] {
  const a = items.slice();
  for (let i = 1; i < a.length; i++) {
    const prev = a[i - 1] as T;
    if (same(a[i] as T, prev)) {
      let j = -1;
      for (let k = i + 1; k < a.length; k++) {
        if (!same(a[k] as T, prev)) {
          j = k;
          break;
        }
      }
      if (j > 0) {
        const t = a[i] as T;
        a[i] = a[j] as T;
        a[j] = t;
      }
    }
  }
  return a;
}

/** 기준음 주머니: 한 바퀴를 다 쓰기 전에는 같은 기준음을 다시 뽑지 않는다 */
function makeBag(items: readonly Note[], rng: Rng): (valid: (n: Note) => boolean) => Note {
  let pool: Note[] = [];
  return (valid) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (pool.length === 0) pool = shuffle(items, rng);
      const i = pool.findIndex(valid);
      if (i >= 0) return pool.splice(i, 1)[0] as Note;
      pool = [];
    }
    throw new Error('조건에 맞는 기준음이 없습니다');
  };
}

function problemId(missionId: string, round: Round, index: number): string {
  return `${missionId}/${round === 'main' ? 'm' : 'r'}${index}`;
}

function optionOf(degree: Degree, quality: QualityKey, role: OptionRole): AnswerOption {
  return { id: `${degree}${quality}`, degree, quality, label: intervalName(degree, quality), role, exists: role !== 'family' };
}

/** 같은 소리(같은 반음 수)인 이웃 도수의 이름. 먼저 한 도수 아래, 다음 한 도수 위를 본다. 겹감·겹증은 쓰지 않는다 */
function enharmonicTrap(degree: Degree, floor: number): AnswerOption | null {
  const s = semitonesOf(degree, floor);
  for (const d2 of [degree - 1, degree + 1]) {
    if (d2 < 1 || d2 > 8) continue;
    const q = qualityFor(d2 as Degree, s);
    if (q && q !== 'dd' && q !== 'AA') return optionOf(d2 as Degree, q, 'enharmonic');
  }
  return null;
}

/** 그 건물에 없는 이름. 완전 계열: 기준층 이하면 '단', 위면 '장'. 장·단 계열: '완전' */
function familyTrap(degree: Degree, floor: number): AnswerOption {
  if (familyOf(degree) === 'perfect') return optionOf(degree, floor <= referenceFloor(degree) ? 'm' : 'M', 'family');
  return optionOf(degree, 'P', 'family');
}

/**
 * 층 맞히기 선택지: 정답 + 같은 건물의 가까운 층 (count-2)개 + 함정 1개, 순서는 섞는다.
 * 함정: 장·단 계열(3도) = 같은 소리 다른 도수(예: 단3도 ↔ 증2도), 완전 계열(5도) = 없는 이름(예: 단5도)
 */
export function buildOptions(degree: Degree, floor: number, open: [number, number], count: number, rng: Rng): AnswerOption[] {
  const correct = optionOf(degree, floorDef(degree, floor).quality, 'correct');
  const neighbors = range(open[0], open[1])
    .filter((f) => f !== floor)
    .sort((a, b) => Math.abs(a - floor) - Math.abs(b - floor) || a - b)
    .slice(0, Math.max(0, count - 2))
    .map((f) => optionOf(degree, floorDef(degree, f).quality, 'neighbor'));
  const trap = familyOf(degree) === 'majorMinor' ? enharmonicTrap(degree, floor) ?? familyTrap(degree, floor) : familyTrap(degree, floor);
  return shuffle([correct, ...neighbors, trap], rng);
}

function makeIdentify(m: MissionDef, c: Candidate, index: number, round: Round, rng: Rng): IdentifyProblem {
  const open = openOf(m, c.degree);
  if (c.floor < open[0] || c.floor > open[1]) throw new RangeError('열리지 않은 층으로 문제를 만들 수 없습니다');
  return {
    kind: 'identify',
    id: problemId(m.id, round, index),
    missionId: m.id,
    degree: c.degree,
    base: c.base,
    floor: c.floor,
    open,
    options: buildOptions(c.degree, c.floor, open, m.optionCount ?? 3, rng),
    hideBuilding: m.hideBuilding === true,
    typeKey: `id:${c.degree}${floorDef(c.degree, c.floor).quality}`,
  };
}

function travelOk(base: Note, sp: TravelSpec): boolean {
  return isDisplayable(base, sp.degree, floorOf(sp.degree, sp.from)) && isDisplayable(base, sp.degree, floorOf(sp.degree, sp.to));
}

function makeTravel(m: MissionDef, sp: TravelSpec, base: Note, index: number, round: Round, pair: TravelProblem['pair']): TravelProblem {
  const open = openOf(m, sp.degree);
  const start = floorOf(sp.degree, sp.from);
  const target = floorOf(sp.degree, sp.to);
  if (start === target) throw new RangeError('출발층과 목적층이 같습니다');
  if (start < open[0] || start > open[1] || target < open[0] || target > open[1]) throw new RangeError('열리지 않은 층입니다');
  return {
    kind: 'travel',
    id: problemId(m.id, round, index),
    missionId: m.id,
    degree: sp.degree,
    base,
    start,
    target,
    open,
    typeKey: `tr:${sp.degree}${sp.from}>${sp.to}`,
    pair,
  };
}

/**
 * 층 맞히기 문제 고르기 (균형 규칙)
 * 1) 칸 순서: 도수를 번갈아, 같은 도수 안에서는 층(성질)을 번갈아 → 성질별 문제 수가 많아야 1개 차이
 * 2) 층마다 후보 줄: 위 음 임시표 모양(𝄫·♭·없음·♯·𝄪)을 번갈아, 같은 모양 안에서는 기준음을 섞어서
 * 3) 칸마다 그 층의 후보 줄에서, 이 미션에서 가장 적게 쓴 기준음의 후보를 고른다 (같으면 줄의 앞쪽).
 *    줄이 비면 처음 줄을 다시 쓴다.
 * 4) 고른 뒤 순서를 섞고, 서로 다른 문제가 3개 이상이면 똑같은 문제가 연달아 나오지 않게 한다.
 */
function genIdentify(m: MissionDef, rng: Rng): IdentifyProblem[] {
  const degreeOrder = shuffle(m.degrees, rng);
  const floorOrder = new Map<Degree, number[]>();
  const lines = new Map<string, Candidate[]>();
  for (const d of m.degrees) {
    const [lo, hi] = openOf(m, d);
    const order = shuffle(range(lo, hi), rng);
    floorOrder.set(d, order);
    for (const f of order) {
      const byAcc = new Map<number, Candidate[]>();
      for (const b of m.bases) {
        if (!isDisplayable(b, d, f)) continue;
        const a = upperNote(b, d, f).acc;
        const list = byAcc.get(a) ?? [];
        list.push({ degree: d, base: b, floor: f });
        byAcc.set(a, list);
      }
      const keys = shuffle([...byAcc.keys()].sort((x, y) => x - y), rng);
      const line = roundRobin(keys.map((k) => shuffle(byAcc.get(k) ?? [], rng)));
      if (line.length === 0) throw new Error(`${m.id}: ${intervalName(d, floorDef(d, f).quality)}으로 낼 수 있는 문제가 없습니다`);
      lines.set(`${d}:${f}`, line);
    }
  }
  const queues = new Map<string, Candidate[]>();
  for (const [k, v] of lines) queues.set(k, v.slice());
  const used = new Map<string, number>();
  const usage = (c: Candidate) => used.get(noteKey(c.base)) ?? 0;
  const picked: Candidate[] = [];
  for (let k = 0; picked.length < m.count; k++) {
    const d = degreeOrder[k % degreeOrder.length] as Degree;
    const order = floorOrder.get(d) ?? [];
    const f = order[Math.floor(k / degreeOrder.length) % order.length] as number;
    const key = `${d}:${f}`;
    let q = queues.get(key) ?? [];
    if (q.length === 0) {
      q = (lines.get(key) ?? []).slice();
      queues.set(key, q);
    }
    let i = 0;
    for (let j = 1; j < q.length; j++) if (usage(q[j] as Candidate) < usage(q[i] as Candidate)) i = j;
    const c = q.splice(i, 1)[0] as Candidate;
    picked.push(c);
    used.set(noteKey(c.base), (used.get(noteKey(c.base)) ?? 0) + 1);
  }
  const same = (a: Candidate, b: Candidate) => a.degree === b.degree && a.floor === b.floor && sameNote(a.base, b.base);
  const distinct = picked.filter((c, i) => picked.findIndex((x) => same(x, c)) === i).length;
  const shuffled = shuffle(picked, rng);
  return (distinct >= 3 ? separateRepeats(shuffled, same) : shuffled).map((c, i) => makeIdentify(m, c, i, 'main', rng));
}

/** 손님 모시기: 정해진 종류를 차례로 쓰고, 기준음은 주머니에서 뽑는다. 순서는 섞은 뒤 이동 층수가 적은 것부터 */
function genTravel(m: MissionDef, rng: Rng): TravelProblem[] {
  const specs = m.travel ?? [];
  if (specs.length === 0) throw new Error(`${m.id}: 손님 모시기 종류가 없습니다`);
  const bag = makeBag(m.bases, rng);
  const made: { sp: TravelSpec; base: Note }[] = [];
  for (let i = 0; i < m.count; i++) {
    const sp = specs[i % specs.length] as TravelSpec;
    made.push({ sp, base: bag((b) => travelOk(b, sp)) });
  }
  const dist = (x: { sp: TravelSpec }) => Math.abs(floorOf(x.sp.degree, x.sp.to) - floorOf(x.sp.degree, x.sp.from));
  return shuffle(made, rng)
    .sort((a, b) => dist(a) - dist(b))
    .map((x, i) => makeTravel(m, x.sp, x.base, i, 'main', null));
}

/** 두 건물 비교: 짝마다 같은 기준음으로 3도 문제 → 5도 문제. 짝 순서는 고정 */
function genPairs(m: MissionDef, rng: Rng): TravelProblem[] {
  const pairs = m.pairs ?? [];
  if (pairs.length * 2 !== m.count) throw new Error(`${m.id}: 짝 수와 문제 수가 맞지 않습니다`);
  const bag = makeBag(m.bases, rng);
  const out: TravelProblem[] = [];
  pairs.forEach((pair, p) => {
    const base = bag((b) => travelOk(b, pair[0]) && travelOk(b, pair[1]));
    out.push(makeTravel(m, pair[0], base, out.length, 'main', { id: p, pos: 0 }));
    out.push(makeTravel(m, pair[1], base, out.length, 'main', { id: p, pos: 1 }));
  });
  return out;
}

/** 미션의 본 문제를 만든다. 같은 미션·같은 시드면 언제나 같은 문제 */
export function generateProblems(missionId: string, seed: number): Problem[] {
  const m = missionById(missionId);
  const rng = mulberry32(seed);
  if (m.kind === 'identify') return genIdentify(m, rng);
  if (m.kind === 'travel') return genTravel(m, rng);
  if (m.kind === 'pairs') return genPairs(m, rng);
  throw new Error(`${m.id}는 문제를 만들지 않는 안내 미션입니다`);
}

/** 다시 풀기: 첫 시도에 틀린 문제와 같은 종류를, 가능하면 다른 기준음으로 다시 만든다 */
export function makeRetryProblems(missionId: string, wrong: readonly Problem[], seed: number): Problem[] {
  const m = missionById(missionId);
  const rng = mulberry32(deriveSeed(seed, 0x5245));
  return wrong.map((p, i) => {
    if (p.kind === 'identify') {
      const others = m.bases.filter((b) => !sameNote(b, p.base) && isDisplayable(b, p.degree, p.floor));
      const base = others.length > 0 ? (others[Math.floor(rng() * others.length)] as Note) : p.base;
      return makeIdentify(m, { degree: p.degree, base, floor: p.floor }, i, 'retry', rng);
    }
    const sp: TravelSpec = { degree: p.degree, from: floorDef(p.degree, p.start).quality, to: floorDef(p.degree, p.target).quality };
    const others = m.bases.filter((b) => !sameNote(b, p.base) && travelOk(b, sp));
    const base = others.length > 0 ? (others[Math.floor(rng() * others.length)] as Note) : p.base;
    return makeTravel(m, sp, base, i, 'retry', null);
  });
}

// ─────────────────────────────────────────────────────────────
// 6. 미션 진행 (상태 기계)
// ─────────────────────────────────────────────────────────────

export type RunStatus = 'asking' | 'solved' | 'revealed';
/** 0 힌트 없음 · 1 도수(층 맞히기) / 층 순서(손님 모시기) · 2 반음 세기 · 3 정답 공개 */
export type HintLevel = 0 | 1 | 2 | 3;
/** degree 도수를 틀림(같은 소리 다른 도수) · quality 같은 건물의 다른 층 · family 그 건물에 없는 이름 */
export type ErrorType = 'degree' | 'quality' | 'family';

export interface IdentifyRun {
  kind: 'identify';
  status: RunStatus;
  wrong: number;
  hint: HintLevel;
  /** 이미 틀려서 지운 선택지 id */
  eliminated: string[];
  lastChoice: string | null;
  errors: ErrorType[];
}

export interface TravelRun {
  kind: 'travel';
  status: RunStatus;
  wrong: number;
  hint: HintLevel;
  /** 엘리베이터가 있는 층 */
  floor: number;
  /** 지금까지 움직인 횟수 (틀린 뒤의 이동도 센다) */
  moves: number;
  /** 처음 '도착'을 눌렀을 때까지 움직인 횟수 */
  movesAtFirstArrive: number | null;
  /** 마지막으로 '도착'을 눌렀을 때의 이동 횟수 (그 뒤로 움직이지 않았으면 '도착'을 다시 받지 않는다) */
  movesAtLastArrive: number | null;
  /** 마지막으로 '도착'을 누른 층 */
  lastArrive: number | null;
}

export type Run = IdentifyRun | TravelRun;

export interface ProblemResult {
  problemId: string;
  typeKey: string;
  kind: 'identify' | 'travel';
  /** 힌트 없이 첫 시도에 맞혔나 */
  firstTry: boolean;
  wrong: number;
  revealed: boolean;
  hint: HintLevel;
  errors: ErrorType[];
  /** 손님 모시기만: 전체 이동 수, 가장 짧은 이동 수, 첫 시도 정답이면서 가장 짧게 왔나 */
  moves: number | null;
  minimal: number | null;
  efficient: boolean | null;
}

export type Phase = 'question' | 'feedback' | 'summary' | 'done';

export interface Session {
  missionId: string;
  seed: number;
  round: Round;
  main: Problem[];
  retry: Problem[];
  index: number;
  run: Run;
  /** 본 라운드 결과 (별은 이것으로만 계산) */
  results: ProblemResult[];
  retryResults: ProblemResult[];
  phase: Phase;
  /** 본 라운드가 끝났고 첫 시도에 틀린 문제가 있어 다시 풀기를 해야 함 */
  canRetry: boolean;
}

export type Action =
  | { type: 'answer'; optionId: string }
  | { type: 'move'; dir: 1 | -1 }
  | { type: 'arrive' }
  | { type: 'next' }
  | { type: 'retry' }
  | { type: 'finish' };

export function newRun(p: Problem): Run {
  if (p.kind === 'identify') return { kind: 'identify', status: 'asking', wrong: 0, hint: 0, eliminated: [], lastChoice: null, errors: [] };
  return { kind: 'travel', status: 'asking', wrong: 0, hint: 0, floor: p.start, moves: 0, movesAtFirstArrive: null, movesAtLastArrive: null, lastArrive: null };
}

export function roundProblems(s: Session): Problem[] {
  return s.round === 'main' ? s.main : s.retry;
}

export function currentProblem(s: Session): Problem {
  const p = roundProblems(s)[s.index];
  if (!p) throw new RangeError('현재 문제가 없습니다');
  return p;
}

/** 미션 시작. 안내 미션은 세션을 쓰지 않는다 */
export function startSession(missionId: string, seed: number): Session {
  const main = generateProblems(missionId, seed);
  const first = main[0];
  if (!first) throw new Error('문제가 없습니다');
  return { missionId, seed, round: 'main', main, retry: [], index: 0, run: newRun(first), results: [], retryResults: [], phase: 'question', canRetry: false };
}

function errorOf(o: AnswerOption): ErrorType {
  if (o.role === 'enharmonic') return 'degree';
  if (o.role === 'family') return 'family';
  return 'quality';
}

function resultOf(p: Problem, run: Run): ProblemResult {
  const base = { problemId: p.id, typeKey: p.typeKey, firstTry: run.status === 'solved' && run.wrong === 0, wrong: run.wrong, revealed: run.status === 'revealed', hint: run.hint };
  if (p.kind === 'identify' && run.kind === 'identify') {
    return { ...base, kind: 'identify', errors: run.errors.slice(), moves: null, minimal: null, efficient: null };
  }
  if (p.kind === 'travel' && run.kind === 'travel') {
    const minimal = Math.abs(p.target - p.start);
    return { ...base, kind: 'travel', errors: [], moves: run.moves, minimal, efficient: base.firstTry && run.movesAtFirstArrive === minimal };
  }
  throw new Error('문제와 진행 상태의 종류가 다릅니다');
}

/**
 * 진행 규칙
 * - 층 맞히기: 틀린 선택지는 지운다. 첫 오답 → 힌트 1(도수), 두 번째 → 힌트 2(반음),
 *   세 번째 오답이거나 남은 선택지가 하나뿐이면 정답 공개(힌트 3).
 * - 손님 모시기: 한 번도 움직이지 않았거나 지난 '도착' 뒤로 움직이지 않았으면 '도착'은 무시(두 번 누름 방지).
 *   목적층이 아니면 오답 → 힌트 1(층 순서), 2(반음), 세 번째 오답이면 정답 공개(엘리베이터가 목적층으로 간다).
 * - 본 라운드가 끝나면 요약. 첫 시도에 틀린 문제가 있으면 다시 풀기를 해야 완료할 수 있다.
 * - 허용되지 않는 동작은 상태를 바꾸지 않는다.
 */
export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case 'answer': {
      if (s.phase !== 'question') return s;
      const p = currentProblem(s);
      const run = s.run;
      if (p.kind !== 'identify' || run.kind !== 'identify') return s;
      const opt = p.options.find((o) => o.id === a.optionId);
      if (!opt || run.eliminated.includes(opt.id)) return s;
      if (opt.role === 'correct') return { ...s, phase: 'feedback', run: { ...run, status: 'solved', lastChoice: opt.id } };
      const wrong = run.wrong + 1;
      const eliminated = [...run.eliminated, opt.id];
      const errors = [...run.errors, errorOf(opt)];
      const remaining = p.options.length - eliminated.length;
      if (remaining <= 1 || wrong >= 3) {
        return { ...s, phase: 'feedback', run: { ...run, status: 'revealed', wrong, hint: 3, eliminated, lastChoice: opt.id, errors } };
      }
      return { ...s, run: { ...run, wrong, hint: wrong >= 2 ? 2 : 1, eliminated, lastChoice: opt.id, errors } };
    }
    case 'move': {
      if (s.phase !== 'question') return s;
      const p = currentProblem(s);
      const run = s.run;
      if (p.kind !== 'travel' || run.kind !== 'travel') return s;
      const floor = run.floor + a.dir;
      if (floor < p.open[0] || floor > p.open[1]) return s;
      return { ...s, run: { ...run, floor, moves: run.moves + 1 } };
    }
    case 'arrive': {
      if (s.phase !== 'question') return s;
      const p = currentProblem(s);
      const run = s.run;
      if (p.kind !== 'travel' || run.kind !== 'travel' || run.moves === 0 || run.moves === run.movesAtLastArrive) return s;
      const first = run.movesAtFirstArrive ?? run.moves;
      const mark = { movesAtFirstArrive: first, movesAtLastArrive: run.moves, lastArrive: run.floor };
      if (run.floor === p.target) {
        return { ...s, phase: 'feedback', run: { ...run, ...mark, status: 'solved' } };
      }
      const wrong = run.wrong + 1;
      if (wrong >= 3) {
        return { ...s, phase: 'feedback', run: { ...run, ...mark, status: 'revealed', wrong, hint: 3, floor: p.target } };
      }
      return { ...s, run: { ...run, ...mark, wrong, hint: wrong >= 2 ? 2 : 1 } };
    }
    case 'next': {
      if (s.phase !== 'feedback') return s;
      const result = resultOf(currentProblem(s), s.run);
      const results = s.round === 'main' ? [...s.results, result] : s.results;
      const retryResults = s.round === 'retry' ? [...s.retryResults, result] : s.retryResults;
      const list = roundProblems(s);
      const nextProblem = list[s.index + 1];
      if (nextProblem) return { ...s, results, retryResults, index: s.index + 1, run: newRun(nextProblem), phase: 'question' };
      const canRetry = s.round === 'main' && results.some((r) => !r.firstTry);
      return { ...s, results, retryResults, phase: 'summary', canRetry };
    }
    case 'retry': {
      if (s.phase !== 'summary' || !s.canRetry) return s;
      const wrongProblems = s.main.filter((_, i) => s.results[i]?.firstTry === false);
      const retry = makeRetryProblems(s.missionId, wrongProblems, s.seed);
      const first = retry[0];
      if (!first) return s;
      return { ...s, round: 'retry', retry, index: 0, run: newRun(first), phase: 'question', canRetry: false };
    }
    case 'finish': {
      if (s.phase !== 'summary' || s.canRetry) return s;
      return { ...s, phase: 'done' };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 7. 결과와 별
// ─────────────────────────────────────────────────────────────

export interface MissionSummary {
  missionId: string;
  n: number;
  firstTry: number;
  /** 첫 시도 정답률 (%) */
  accuracy: number;
  /** ★1 완료 · ★2 첫 시도 정답이 2/3 이상 · ★3 모두 첫 시도 정답 (손님 모시기는 모두 가장 짧은 이동까지) */
  stars: 1 | 2 | 3;
  moves: number;
  minimal: number;
  /** 첫 시도에 틀린 문제의 종류 */
  mistakes: string[];
}

export function starsFor(results: readonly ProblemResult[]): 1 | 2 | 3 {
  const n = results.length;
  if (n === 0) return 1;
  const ft = results.filter((r) => r.firstTry).length;
  const allEfficient = results.every((r) => r.efficient !== false);
  if (ft === n && allEfficient) return 3;
  if (ft >= Math.ceil((2 * n) / 3)) return 2;
  return 1;
}

export function summarize(s: Session): MissionSummary {
  const r = s.results;
  const ft = r.filter((x) => x.firstTry).length;
  return {
    missionId: s.missionId,
    n: r.length,
    firstTry: ft,
    accuracy: r.length === 0 ? 0 : Math.round((100 * ft) / r.length),
    stars: starsFor(r),
    moves: r.reduce((t, x) => t + (x.moves ?? 0), 0),
    minimal: r.reduce((t, x) => t + (x.minimal ?? 0), 0),
    mistakes: r.filter((x) => !x.firstTry).map((x) => x.typeKey),
  };
}

/** 문제 종류의 이름: 'id:3m' → '단3도 (층 맞히기)', 'tr:3M>d' → '장3도 → 감3도 (손님 모시기)' */
export function typeLabel(typeKey: string): string {
  const id = /^id:(\d)(dd|d|m|M|P|A|AA)$/.exec(typeKey);
  if (id) return `${intervalName(Number(id[1]) as Degree, id[2] as QualityKey)} (층 맞히기)`;
  const t = /^tr:(\d)(dd|d|m|M|P|A|AA)>(dd|d|m|M|P|A|AA)$/.exec(typeKey);
  if (t) {
    const d = Number(t[1]) as Degree;
    return `${intervalName(d, t[2] as QualityKey)} → ${intervalName(d, t[3] as QualityKey)} (손님 모시기)`;
  }
  return typeKey;
}

// ─────────────────────────────────────────────────────────────
// 8. 보이기 규칙 (무엇을 가리고 언제 보여 주나)
// ─────────────────────────────────────────────────────────────

export interface Visibility {
  /** 왼쪽 칸: 건물 또는 층 버튼판(층 맞히기 선택지) */
  leftPanel: 'building' | 'options';
  buildingName: boolean;
  /** 건물 층 목록의 성질 이름 */
  floorNames: boolean;
  /** 건물 층 목록의 반음 수 */
  floorSemitones: boolean;
  /** 엘리베이터 위치 */
  car: boolean;
  /** 층 표시판 4칸 */
  plateBuilding: boolean;
  plateFloor: boolean;
  plateName: boolean;
  plateSemitones: boolean;
  /** 악보 아래 도수 세기 칸 (C·D·E) */
  degreeCount: boolean;
  /** 건반의 반음 번호 (1, 2, 3 …) */
  keyboardSteps: boolean;
}

/** 둘러보기·안내·답을 낸 뒤: 모두 보인다 */
export const ALL_VISIBLE: Visibility = {
  leftPanel: 'building',
  buildingName: true,
  floorNames: true,
  floorSemitones: true,
  car: true,
  plateBuilding: true,
  plateFloor: true,
  plateName: true,
  plateSemitones: true,
  degreeCount: true,
  keyboardSteps: true,
};

export function visibilityOf(s: Session): Visibility {
  const p = currentProblem(s);
  const run = s.run;
  if (run.status !== 'asking') return ALL_VISIBLE;
  if (p.kind === 'identify') {
    const showBuilding = !p.hideBuilding;
    return {
      leftPanel: 'options',
      buildingName: showBuilding,
      floorNames: false,
      floorSemitones: false,
      car: false,
      plateBuilding: showBuilding,
      plateFloor: false,
      plateName: false,
      plateSemitones: false,
      degreeCount: run.hint >= 1,
      keyboardSteps: run.hint >= 2,
    };
  }
  return {
    leftPanel: 'building',
    buildingName: true,
    floorNames: run.hint >= 1,
    floorSemitones: run.hint >= 2,
    car: true,
    plateBuilding: true,
    plateFloor: true,
    plateName: run.hint >= 1,
    plateSemitones: run.hint >= 2,
    degreeCount: true,
    keyboardSteps: run.hint >= 2,
  };
}

// ─────────────────────────────────────────────────────────────
// 9. 안내 문장 (악보 옆 안내 칸에 들어가는 말)
// ─────────────────────────────────────────────────────────────

/** 문장 조각. 음은 { note }로 넘겨 화면이 임시표를 악보 글리프로 그리게 한다 */
export type Seg = string | { note: Note };
export type Line = Seg[];

export interface Message {
  tone: 'ask' | 'hint' | 'correct' | 'reveal';
  title: Line;
  lines: Line[];
}

/** 글자로 이어 붙인다 (테스트·화면 읽기 프로그램용) */
export function lineText(line: Line, style: SpellStyle = 'symbol'): string {
  return line.map((x) => (typeof x === 'string' ? x : spell(x.note, style))).join('');
}

function countLine(base: Note, degree: Degree): string {
  return `${degreeLetters(base, degree).join('·')} ${countWord(degree)} 칸 → ${degree}도`;
}

function moveWords(k: number): string {
  return `${countWord(Math.abs(k))} 층 ${k > 0 ? '위로' : '아래로'}`;
}

function relationToReference(degree: Degree, floor: number): string {
  const ref = referenceFloor(degree);
  const refName = intervalName(degree, floorDef(degree, ref).quality);
  const k = floor - ref;
  if (k === 0) return `기준층 ${refName} 그대로예요.`;
  return `기준층 ${refName}(${semitonesOf(degree, ref)}반음)보다 ${countWord(Math.abs(k))} 층 ${k > 0 ? '위' : '아래'}예요.`;
}

function openOrder(degree: Degree, open: [number, number]): string {
  return range(open[0], open[1])
    .map((f) => QUALITY_NAME[floorDef(degree, f).quality])
    .join(' → ');
}

function pairComparison(s: Session, p: TravelProblem): Line[] {
  if (!p.pair || p.pair.pos !== 1) return [];
  const partner = roundProblems(s)[s.index - 1];
  if (!partner || partner.kind !== 'travel') return [];
  const k3 = partner.target - partner.start;
  const k5 = p.target - p.start;
  const n3 = `${intervalName(partner.degree, floorDef(partner.degree, partner.start).quality)}→${intervalName(partner.degree, floorDef(partner.degree, partner.target).quality)}`;
  const n5 = `${intervalName(p.degree, floorDef(p.degree, p.start).quality)}→${intervalName(p.degree, floorDef(p.degree, p.target).quality)}`;
  if (Math.abs(k3) !== Math.abs(k5)) {
    return [
      [`${partner.degree}도 건물 ${n3}는 ${countWord(Math.abs(k3))} 층, ${p.degree}도 건물 ${n5}는 ${countWord(Math.abs(k5))} 층이에요.`],
      [`${p.degree}도 건물에는 장·단 층이 없기 때문이에요.`],
    ];
  }
  const lines: Line[] = [[`두 건물 모두 ${countWord(Math.abs(k5))} 층이에요.`]];
  const to = floorDef(p.degree, p.target).quality;
  if (to === 'A' && p.start === referenceFloor(p.degree)) lines.push(['기준층에서 한 층 위는 어느 건물이든 증이에요.']);
  return lines;
}

/** 지금 상태에 맞는 안내 문장. 화면은 이 결과를 그대로 그린다 */
export function messageOf(s: Session): Message {
  const p = currentProblem(s);
  const run = s.run;
  if (p.kind === 'identify' && run.kind === 'identify') {
    const v = describe(p.degree, p.base, p.floor);
    const refF = referenceFloor(p.degree);
    const refName = intervalName(p.degree, floorDef(p.degree, refF).quality);
    if (run.status === 'solved') {
      return {
        tone: 'correct',
        title: [run.wrong === 0 ? '정답이에요' : '맞았어요'],
        lines: [[{ note: p.base }, '–', { note: v.upper }, ` = ${v.name}`], [`${countLine(p.base, p.degree)}, ${v.semitones}반음`]],
      };
    }
    if (run.status === 'revealed') {
      return {
        tone: 'reveal',
        title: [`정답은 ${v.name}`],
        lines: [[{ note: p.base }, '–', { note: v.upper }, `: ${countLine(p.base, p.degree)}, ${v.semitones}반음`], [relationToReference(p.degree, p.floor)]],
      };
    }
    if (run.hint === 0) {
      return {
        tone: 'ask',
        title: ['악보를 보고 몇 층인지 골라 보세요'],
        lines: p.hideBuilding ? [['어느 건물인지도 악보에서 세어 봐요.']] : [],
      };
    }
    if (run.hint === 1) {
      const chosen = p.options.find((o) => o.id === run.lastChoice);
      const err = run.errors[run.errors.length - 1];
      if (chosen && err === 'degree') {
        const letter = degreeLetters(p.base, chosen.degree)[chosen.degree - 1] as Letter;
        return {
          tone: 'hint',
          title: ['도수부터 세어 봐요'],
          lines: [[countLine(p.base, p.degree)], [`${chosen.label}라면 위 음이 ${letter} 자리에 있어야 해요. 건반 소리는 같아도 악보 자리가 달라요.`]],
        };
      }
      if (chosen && err === 'family') {
        return {
          tone: 'hint',
          title: [`${p.degree}도 건물에는 ${QUALITY_NAME[chosen.quality]} 층이 없어요`],
          lines: [[`${p.degree}도는 완전 계열이라 감·완전·증만 있어요.`], [countLine(p.base, p.degree)]],
        };
      }
      return { tone: 'hint', title: ['도수는 맞았어요'], lines: [[countLine(p.base, p.degree)], ['이제 성질을 다시 골라 보세요.']] };
    }
    return {
      tone: 'hint',
      title: ['반음을 세어 봐요'],
      lines: [
        ['건반에서 ', { note: p.base }, '부터 ', { note: v.upper }, `까지 ${v.semitones}반음이에요.`],
        [`${p.degree}도 건물의 기준층 ${floorDef(p.degree, refF).label} ${refName}는 ${semitonesOf(p.degree, refF)}반음이에요.`],
      ],
    };
  }
  if (p.kind === 'travel' && run.kind === 'travel') {
    const start = describe(p.degree, p.base, p.start);
    const target = describe(p.degree, p.base, p.target);
    const k = p.target - p.start;
    if (run.status === 'solved') {
      const lines: Line[] = [[`${start.name} → ${target.name}: ${moveWords(k)}`], ['위 음 ', { note: start.upper }, ' → ', { note: target.upper }]];
      const minimal = Math.abs(k);
      if (run.wrong === 0 && run.moves > minimal) lines.push([`${run.moves}번 움직였어요. 가장 짧게는 ${minimal}번이에요.`]);
      return { tone: 'correct', title: [run.wrong === 0 ? '도착!' : '도착했어요'], lines: [...lines, ...pairComparison(s, p)] };
    }
    if (run.status === 'revealed') {
      return {
        tone: 'reveal',
        title: [`${target.name}는 ${target.floorLabel}이에요`],
        lines: [[`${start.name}에서 ${moveWords(k)} 가면 돼요.`], ['위 음 ', { note: start.upper }, ' → ', { note: target.upper }], ...pairComparison(s, p)],
      };
    }
    if (run.hint === 0) {
      return { tone: 'ask', title: [`손님: "${target.name}로 가 주세요"`], lines: [[`출발 ${start.floorLabel} ${start.name}`]] };
    }
    const here = describe(p.degree, p.base, run.floor);
    if (run.hint === 1) {
      return {
        tone: 'hint',
        title: [`여기는 ${here.name}예요`],
        lines: [[`${p.degree}도 건물은 아래부터 ${openOrder(p.degree, p.open)}`], [`목적지: ${target.name}`]],
      };
    }
    return { tone: 'hint', title: ['반음을 세어 봐요'], lines: [[`${target.name}는 ${target.semitones}반음이에요.`], [`지금은 ${here.semitones}반음이에요.`]] };
  }
  throw new Error('문제와 진행 상태의 종류가 다릅니다');
}

// ─────────────────────────────────────────────────────────────
// 10. 안내(튜토리얼) 대본
// ─────────────────────────────────────────────────────────────

export type TutorialId = 'first-day' | 'new-bases' | 'new-floors' | 'fifth-building';
/** next 다음 버튼 · up/down 한 층 이동 · listen 듣기 버튼(소리가 꺼져 있으면 다음 버튼으로 넘어감) · base 기준음 바꾸기 · reach 정해진 층에 도착 */
export type TutorialWait = 'next' | 'up' | 'down' | 'listen' | 'base' | 'reach';
export type TutorialFocus = 'plate' | 'building' | 'staff' | 'count' | 'keyboard' | 'moves' | 'listen' | 'bases';

export interface TutorialStep {
  text: string;
  wait: TutorialWait;
  /** wait가 reach일 때 도착해야 하는 층 색인 */
  reach?: number;
  /** 이 단계를 시작할 때 화면을 맞춘다 */
  set?: { degree?: Degree; base?: Letter; floor?: number; open?: [number, number] };
  /** 강조할 화면 부분 */
  focus?: TutorialFocus;
}

export const TUTORIALS: Readonly<Record<TutorialId, readonly TutorialStep[]>> = {
  'first-day': [
    { text: '새로 온 안내원이군요! 여기는 음정 거리예요. 건물마다 도수가 하나씩 정해져 있어요.', wait: 'next', set: { degree: 3, base: 'C', floor: 2, open: [2, 3] }, focus: 'building' },
    { text: '악보에서 아래 음 C부터 위 음 E까지 C·D·E 세 칸이에요. 그래서 3도, 여기는 3도 건물이에요.', wait: 'next', focus: 'count' },
    { text: '지금은 1층 단3도, 3반음이에요. "한 층 위로"를 눌러 보세요.', wait: 'up', focus: 'moves' },
    { text: '2층 장3도, 4반음이 됐어요. E의 자리는 그대로이고 플랫만 사라졌어요. 한 층은 반음 하나예요.', wait: 'next', focus: 'staff' },
    { text: '이번엔 "한 층 아래로"를 눌러 1층으로 돌아가요.', wait: 'down', focus: 'moves' },
    { text: '"차례로"와 "함께"를 눌러 소리를 들어 보세요.', wait: 'listen', focus: 'listen' },
    { text: '준비 끝! 이제 손님을 맞으러 가요.', wait: 'next' },
  ],
  'new-bases': [
    { text: '지금은 C–E, 2층 장3도예요. 위 음에 임시표가 없죠?', wait: 'next', set: { degree: 3, base: 'C', floor: 3, open: [2, 3] }, focus: 'staff' },
    { text: '기준음을 D로 바꿨어요. D·E·F 세 칸이라 위 음은 F 자리예요. 임시표 없는 D–F는 1층 단3도예요.', wait: 'next', set: { base: 'D', floor: 2 }, focus: 'building' },
    { text: 'D에서 장3도를 만들려면? "한 층 위로"를 눌러 보세요.', wait: 'up', focus: 'moves' },
    { text: 'D–F♯, 장3도예요. 같은 2층이어도 기준음이 D면 샵이 붙어요. 성질은 임시표 모양이 아니라 반음 수로 정해요.', wait: 'next', focus: 'staff' },
    { text: '다른 기준음도 눌러 보세요.', wait: 'base', focus: 'bases' },
    { text: '기준음이 바뀌어도 규칙은 같아요. 단3도는 3반음, 장3도는 4반음!', wait: 'next', focus: 'plate' },
  ],
  'new-floors': [
    { text: '오늘부터 지하 1층과 3층이 열려요.', wait: 'next', set: { degree: 3, base: 'C', floor: 2, open: [1, 4] }, focus: 'building' },
    { text: '1층 단3도에서 "한 층 아래로"를 눌러 보세요.', wait: 'down', focus: 'moves' },
    { text: '지하 1층 감3도, 2반음이에요. E에 플랫이 두 개 붙었어요(더블 플랫). 1층과 지하 1층 사이도 한 층, 반음 하나예요.', wait: 'next', focus: 'staff' },
    { text: '건반에서는 D 자리지만 악보에서는 E 자리예요. 3도 건물에서 위 음은 늘 E 자리에 있어요.', wait: 'next', focus: 'keyboard' },
    { text: '이제 3층까지 올라가 보세요.', wait: 'reach', reach: 4, focus: 'moves' },
    { text: '3층 증3도, 5반음이에요. 장3도에서 감3도까지는 두 층, 증3도까지는 한 층이에요.', wait: 'next', focus: 'building' },
  ],
  'fifth-building': [
    { text: '길 건너 5도 건물이에요. C·D·E·F·G 다섯 칸, 5도예요.', wait: 'next', set: { degree: 5, base: 'C', floor: 2, open: [1, 3] }, focus: 'count' },
    { text: '5도 건물은 완전 계열이에요. 1층이 완전5도, 7반음이에요. 장·단 층이 없어요.', wait: 'next', focus: 'building' },
    { text: '"한 층 위로"를 눌러 보세요.', wait: 'up', focus: 'moves' },
    { text: '2층 증5도, 8반음이에요. 3도 건물의 2층은 장3도였죠? 같은 2층이어도 건물마다 이름이 달라요.', wait: 'next', focus: 'plate' },
    { text: '이제 지하 1층까지 내려가 보세요.', wait: 'reach', reach: 1, focus: 'moves' },
    { text: '지하 1층 감5도, 6반음이에요. 완전5도에서 한 층만 내려왔는데 감5도예요. 3도 건물에서 장3도 → 감3도는 두 층이었어요.', wait: 'next', focus: 'building' },
  ],
};

// ─────────────────────────────────────────────────────────────
// 11. 진행 기록과 잠금 (기기 안에 저장, 계정 없음)
// ─────────────────────────────────────────────────────────────

export const PROGRESS_KEY = 'interval-elevator:v1';

export interface MissionRecord {
  done: boolean;
  best: 0 | 1 | 2 | 3;
  plays: number;
  last: { firstTry: number; n: number; moves: number; minimal: number } | null;
}

export interface Progress {
  v: 1;
  missions: Record<string, MissionRecord>;
  /** 문제 종류별 첫 시도 오답 횟수 */
  mistakes: Record<string, number>;
  /** 수업 링크로 열린 단계 (0 = 없음) */
  teacherOpen: number;
}

export function emptyProgress(): Progress {
  return { v: 1, missions: {}, mistakes: {}, teacherOpen: 0 };
}

/** 저장된 글자를 읽는다. 읽을 수 없으면 빈 기록 */
export function parseProgress(raw: string | null | undefined): Progress {
  if (!raw) return emptyProgress();
  try {
    const x: unknown = JSON.parse(raw);
    if (typeof x !== 'object' || x === null) return emptyProgress();
    const o = x as Partial<Progress>;
    if (o.v !== 1 || typeof o.missions !== 'object' || o.missions === null) return emptyProgress();
    const missions: Record<string, MissionRecord> = {};
    for (const m of MISSIONS) {
      const r = (o.missions as Record<string, Partial<MissionRecord>>)[m.id];
      if (!r) continue;
      const best = r.best === 1 || r.best === 2 || r.best === 3 ? r.best : 0;
      missions[m.id] = { done: r.done === true, best, plays: typeof r.plays === 'number' ? r.plays : 0, last: r.last ?? null };
    }
    const mistakes: Record<string, number> = {};
    if (typeof o.mistakes === 'object' && o.mistakes !== null) {
      for (const [k, v] of Object.entries(o.mistakes)) if (typeof v === 'number' && v > 0) mistakes[k] = v;
    }
    const teacherOpen = typeof o.teacherOpen === 'number' && o.teacherOpen >= 0 && o.teacherOpen <= STAGES.length ? Math.floor(o.teacherOpen) : 0;
    return { v: 1, missions, mistakes, teacherOpen };
  } catch {
    return emptyProgress();
  }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p);
}

function recordOf(p: Progress, id: string): MissionRecord {
  return p.missions[id] ?? { done: false, best: 0, plays: 0, last: null };
}

/** 미션을 끝까지 마쳤을 때 (요약 화면에서 '완료') */
export function recordMission(p: Progress, sm: MissionSummary): Progress {
  const r = recordOf(p, sm.missionId);
  const mistakes = { ...p.mistakes };
  for (const k of sm.mistakes) mistakes[k] = (mistakes[k] ?? 0) + 1;
  const best = Math.max(r.best, sm.stars) as 0 | 1 | 2 | 3;
  return {
    ...p,
    missions: { ...p.missions, [sm.missionId]: { done: true, best, plays: r.plays + 1, last: { firstTry: sm.firstTry, n: sm.n, moves: sm.moves, minimal: sm.minimal } } },
    mistakes,
  };
}

/** 안내 미션을 마쳤을 때 */
export function recordTutorial(p: Progress, missionId: string): Progress {
  const r = recordOf(p, missionId);
  return { ...p, missions: { ...p.missions, [missionId]: { done: true, best: r.best, plays: r.plays + 1, last: null } } };
}

export function isStageUnlocked(p: Progress, stageId: number): boolean {
  if (stageId <= 1) return true;
  if (p.teacherOpen >= stageId) return true;
  const prev = STAGES.find((s) => s.id === stageId - 1);
  return prev ? prev.missions.every((m) => recordOf(p, m.id).done) : false;
}

/** 단계가 열려 있고, 단계 안에서는 앞 미션을 마쳐야 다음 미션이 열린다 */
export function isMissionUnlocked(p: Progress, missionId: string): boolean {
  const m = missionById(missionId);
  if (!isStageUnlocked(p, m.stageId)) return false;
  const list = stageById(m.stageId).missions;
  const i = list.findIndex((x) => x.id === missionId);
  const prev = list[i - 1];
  return i <= 0 || (prev !== undefined && recordOf(p, prev.id).done);
}

/** 단계의 별 (안내 미션은 별이 없다) */
export function stageStars(p: Progress, stageId: number): { earned: number; max: number } {
  const scored = stageById(stageId).missions.filter((m) => m.kind !== 'tutorial');
  return { earned: scored.reduce((t, m) => t + recordOf(p, m.id).best, 0), max: scored.length * 3 };
}

export function topMistakes(p: Progress, limit = 3): { typeKey: string; count: number; label: string }[] {
  return Object.entries(p.mistakes)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, limit)
    .map(([typeKey, count]) => ({ typeKey, count, label: typeLabel(typeKey) }));
}

/** 자유 둘러보기에서 쓸 수 있는 건물·기준음·층 (안내를 마친 만큼 열린다) */
export function exploreAccess(p: Progress): { degree: Degree; bases: Note[]; open: [number, number] }[] {
  const done = (id: string) => recordOf(p, id).done;
  const out: { degree: Degree; bases: Note[]; open: [number, number] }[] = [];
  if (done('1-0')) out.push({ degree: 3, bases: done('2-0') ? [...WHITE_BASES] : [C4], open: done('3-0') ? ALL_3 : CORE_3 });
  if (done('4-0')) out.push({ degree: 5, bases: [...WHITE_BASES], open: ALL_5 });
  return out;
}

// ─────────────────────────────────────────────────────────────
// 12. 수업 링크 (예: https://주소/?open=3&sound=off)
// ─────────────────────────────────────────────────────────────

export interface ClassLink {
  /** 열어 줄 단계 (1~4) */
  open: number | null;
  /** false면 소리를 끈 채 시작 */
  sound: boolean | null;
}

export function parseClassLink(query: string): ClassLink {
  const q = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const raw = q.get('open');
  const n = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN;
  const open = Number.isInteger(n) && n >= 1 && n <= STAGES.length ? n : null;
  const s = q.get('sound');
  return { open, sound: s === 'off' ? false : s === 'on' ? true : null };
}

export function applyClassLink(p: Progress, link: ClassLink): Progress {
  if (link.open === null || link.open <= p.teacherOpen) return p;
  return { ...p, teacherOpen: link.open };
}

export function classLinkQuery(open: number, soundOff: boolean): string {
  return `?open=${open}${soundOff ? '&sound=off' : ''}`;
}

// ─────────────────────────────────────────────────────────────
// 13. 화면 도우미
// ─────────────────────────────────────────────────────────────

/** 건반 범위 [가장 낮은 건반, 가장 높은 건반] (MIDI). 도수가 여럿이면 합쳐서 (총정리에서 건반 폭으로 건물을 알 수 없게) */
export function keyboardRange(degrees: readonly Degree[]): [number, number] {
  let hi = 60;
  for (const d of degrees) {
    const [lo, top] = buildingFloors(d);
    for (const b of WHITE_BASES) for (let f = lo; f <= top; f++) hi = Math.max(hi, midiOf(upperNote(b, d, f)));
  }
  if ([1, 3, 6, 8, 10].includes(hi % 12)) hi += 1;
  return [60, hi];
}

/** 문제의 두 음 */
export function notesOf(p: Problem, run: Run): { base: Note; upper: Note; view: IntervalView } {
  const floor = p.kind === 'identify' ? p.floor : run.kind === 'travel' ? run.floor : p.start;
  const view = describe(p.degree, p.base, floor);
  return { base: p.base, upper: view.upper, view };
}
