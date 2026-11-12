import { spell, staffStepOf, type Note } from "@/engine/engine";
import { accidentalGlyphName, GlyphPath, musicGlyphs } from "./MusicGlyph";

const SCALE = 10 / 250;
const NOTE_WIDTH = musicGlyphs.noteheadWhole.bbox[2] * SCALE;
const NOTE_LEFT = 92 - NOTE_WIDTH / 2;
const yOf = (step: number) => 60 - step * 5;

function ledgerSteps(step: number): number[] {
  const steps: number[] = [];
  for (let at = -2; at >= step; at -= 2) steps.push(at);
  for (let at = 10; at <= step; at += 2) steps.push(at);
  return steps;
}

export function Staff({ base, upper }: { base: Note; upper: Note }) {
  const baseStep = staffStepOf(base);
  const upperStep = staffStepOf(upper);
  const ledgers = [...new Set([...ledgerSteps(baseStep), ...ledgerSteps(upperStep)])];

  function accidental(note: Note, step: number, className: string) {
    const name = accidentalGlyphName(note.acc);
    if (!name) return null;
    const gap = baseStep <= -2 && Math.abs(step - baseStep) <= 2 ? 5 : 3;
    return (
      <GlyphPath
        key={`${note.letter}-${note.acc}-${note.octave}`}
        name={name}
        x={NOTE_LEFT - gap - musicGlyphs[name].bbox[2] * SCALE}
        y={yOf(step)}
        scale={SCALE}
        className={`${className} acc-g`}
      />
    );
  }

  return (
    <div className="staff" data-testid="staff">
      <svg
        viewBox="0 0 124 84"
        role="img"
        aria-label={`악보. 아래 음 ${spell(base, "word")}, 위 음 ${spell(upper, "word")}`}
        focusable="false"
      >
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} className="sl" x1={2} x2={122} y1={60 - line * 10} y2={60 - line * 10} />
        ))}
        <GlyphPath name="gClef" x={7} y={50} scale={SCALE} className="clef" />
        {ledgers.map((step) => (
          <line
            key={step}
            className="ll"
            x1={NOTE_LEFT - 4}
            x2={NOTE_LEFT + NOTE_WIDTH + 4}
            y1={yOf(step)}
            y2={yOf(step)}
          />
        ))}
        <GlyphPath name="noteheadWhole" x={NOTE_LEFT} y={yOf(baseStep)} scale={SCALE} className="nb" />
        <GlyphPath name="noteheadWhole" x={NOTE_LEFT} y={yOf(upperStep)} scale={SCALE} className="nu" />
        {accidental(base, baseStep, "nb")}
        {accidental(upper, upperStep, "nu")}
      </svg>
    </div>
  );
}

export default Staff;
