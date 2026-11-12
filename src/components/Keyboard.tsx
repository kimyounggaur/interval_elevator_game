import { midiOf, spell, type Note } from "@/engine/engine";
import NoteName from "./NoteName";

interface PianoKey {
  midi: number;
  black: boolean;
  x: number;
}

const BLACK_PITCHES = [1, 3, 6, 8, 10];
const WHITE_POSITION: Readonly<Record<number, string>> = {
  0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B",
};
const WHITE_WIDTH = 30;
const HEIGHT = 64;
const BLACK_WIDTH = 18;
const BLACK_HEIGHT = 40;

export function Keyboard({
  base,
  upper,
  range,
  showSteps,
}: {
  base: Note;
  upper: Note;
  range: readonly [number, number];
  showSteps: boolean;
}) {
  const baseMidi = midiOf(base);
  const upperMidi = midiOf(upper);
  const keys: PianoKey[] = [];
  let whiteCount = 0;
  for (let midi = range[0]; midi <= range[1]; midi++) {
    const black = BLACK_PITCHES.includes(midi % 12);
    keys.push({ midi, black, x: whiteCount * WHITE_WIDTH - (black ? BLACK_WIDTH / 2 : 0) });
    if (!black) whiteCount++;
  }
  const total = whiteCount * WHITE_WIDTH;
  const center = (key: PianoKey) => key.x + (key.black ? BLACK_WIDTH : WHITE_WIDTH) / 2;
  const at = (midi: number) => {
    const key = keys.find((entry) => entry.midi === midi);
    return key ? Math.min(88, Math.max(12, (center(key) / total) * 100)) : 50;
  };
  const mark = (key: PianoKey) => `${key.midi === baseMidi ? " kb-b" : ""}${key.midi === upperMidi ? " kb-u" : ""}`;
  const whitePosition = upper.acc ? WHITE_POSITION[upperMidi % 12] : undefined;

  return (
    <div className="keys" data-testid="keyboard">
      <div className="kb">
        <span className="tag u" style={{ left: `${at(upperMidi)}%` }}>
          <small>위 음</small><NoteName note={upper} />
        </span>
        <svg
          viewBox={`0 0 ${total} ${HEIGHT}`}
          role="img"
          aria-label={`건반. 기준음 ${spell(base, "word")}에서 위 음 ${spell(upper, "word")}까지${showSteps ? ` ${upperMidi - baseMidi}반음` : ""}`}
          focusable="false"
        >
          {keys.filter((key) => !key.black).map((key) => (
            <rect
              key={key.midi}
              className={`wk${mark(key)}`}
              x={key.x + 0.5} y={0.5} width={WHITE_WIDTH - 1} height={HEIGHT - 1} rx={3}
            />
          ))}
          {keys.filter((key) => key.black).map((key) => (
            <rect
              key={key.midi}
              className={`bk${mark(key)}`}
              x={key.x} y={0} width={BLACK_WIDTH} height={BLACK_HEIGHT} rx={2}
            />
          ))}
          {keys.map((key) => {
            const difference = key.midi - baseMidi;
            const y = key.black ? BLACK_HEIGHT - 11 : HEIGHT - 12;
            const x = center(key);
            if (difference === 0) return <circle key={key.midi} className="pip-b" cx={x} cy={y} r={5} />;
            if (!showSteps || difference < 0 || key.midi > upperMidi) return null;
            const classes = `${key.midi === upperMidi ? " last" : ""}${key.black ? " onb" : ""}`;
            return (
              <g key={key.midi}>
                <circle className={`pip${classes}`} cx={x} cy={y} r={7.5} />
                <text className={`pipt${classes}`} x={x} y={y} dy=".35em">{difference}</text>
              </g>
            );
          })}
        </svg>
        <span className="tag b" style={{ left: `${at(baseMidi)}%` }}>
          <small>기준음</small><NoteName note={base} />
        </span>
        {whitePosition && <span className="kbnote">건반은 {whitePosition} 자리</span>}
      </div>
    </div>
  );
}

export default Keyboard;
