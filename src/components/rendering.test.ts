import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ALL_VISIBLE,
  describe as interval,
  floorOf,
  keyboardRange,
  type Degree,
  type Letter,
  type QualityKey,
  type Visibility,
} from '@/engine/engine';
import glyphData from '@/assets/music-glyphs.json';
import { Staff } from './Staff';
import { Keyboard } from './Keyboard';
import { NoteName } from './NoteName';
import { Plate } from './Plate';

const note = (letter: Letter) => ({ letter, acc: 0, octave: 4 });
const outlines = glyphData.glyphs;
type Glyph = keyof typeof outlines;

// These seven independent acceptance examples come from the supplied promptbook.
const examples: { degree: Degree; base: Letter; quality: QualityKey; upper: string; glyph: Glyph | null }[] = [
  { degree: 3, base: 'C', quality: 'm', upper: 'E 플랫', glyph: 'accidentalFlat' },
  { degree: 3, base: 'C', quality: 'M', upper: 'E', glyph: null },
  { degree: 3, base: 'C', quality: 'd', upper: 'E 더블 플랫', glyph: 'accidentalDoubleFlat' },
  { degree: 3, base: 'D', quality: 'M', upper: 'F 샵', glyph: 'accidentalSharp' },
  { degree: 3, base: 'B', quality: 'A', upper: 'D 더블 샵', glyph: 'accidentalDoubleSharp' },
  { degree: 5, base: 'F', quality: 'd', upper: 'C 플랫', glyph: 'accidentalFlat' },
  { degree: 5, base: 'B', quality: 'A', upper: 'F 더블 샵', glyph: 'accidentalDoubleSharp' },
];

describe('music rendering acceptance', () => {
  it.each(examples)('$base / $degree / $quality preserves the written upper note $upper', (example) => {
    const view = interval(example.degree, note(example.base), floorOf(example.degree, example.quality));
    const markup = renderToStaticMarkup(createElement(Staff, { base: view.base, upper: view.upper }));
    expect(markup).toContain(`aria-label="악보. 아래 음 ${example.base}, 위 음 ${example.upper}"`);
    expect(markup.split(`d="${outlines.noteheadWhole.d}"`)).toHaveLength(3);
    expect(markup).toContain(`d="${outlines.gClef.d}"`);
    if (example.glyph) expect(markup).toContain(`d="${outlines[example.glyph].d}"`);
    else expect(markup).not.toContain('acc-g');
    expect(markup).not.toMatch(/[\u{1D12A}\u{1D12B}]/u);
    if (example.base === 'C') {
      // C4 is below the staff: a ledger line is needed at y=70.
      expect(markup).toMatch(/<line[^>]*class="ll"[^>]*y1="70"[^>]*y2="70"/);
    }
    const name = renderToStaticMarkup(createElement(NoteName, { note: view.upper }));
    expect(name).toContain(`<span class="sr">${example.upper}</span>`);
    if (example.glyph) expect(name).toContain(`d="${outlines[example.glyph].d}"`);
    expect(name).not.toMatch(/[\u{1D12A}\u{1D12B}]/u);
  });

  it('does not disclose a hidden answer in visible or accessible plate text', () => {
    const view = interval(3, note('C'), floorOf(3, 'M'));
    const hidden: Visibility = { ...ALL_VISIBLE, plateBuilding: false, plateFloor: false, plateName: false, plateSemitones: false };
    const markup = renderToStaticMarkup(createElement(Plate, { view, visibility: hidden }));
    expect(markup).not.toContain('장3도');
    expect(markup).not.toContain('2층');
    expect(markup).not.toContain('4반음');
    expect(markup).not.toContain('3도');
    expect(markup.match(/class="v">\?/g)).toHaveLength(4);
    const visible = renderToStaticMarkup(createElement(Plate, { view, visibility: ALL_VISIBLE }));
    expect(visible).toContain('장3도');
    expect(visible).toContain('2층');
    expect(visible).toContain('4반음');
  });

  it('keeps semitone counts out of keyboard accessibility text before the hint', () => {
    const view = interval(3, note('C'), floorOf(3, 'm'));
    const props = { base: view.base, upper: view.upper, range: keyboardRange([3]) };
    const hidden = renderToStaticMarkup(createElement(Keyboard, { ...props, showSteps: false }));
    expect(hidden).toContain('기준음 C에서 위 음 E 플랫까지');
    expect(hidden).not.toContain('3반음');
    expect(hidden).not.toContain('class="pipt');
    const hint = renderToStaticMarkup(createElement(Keyboard, { ...props, showSteps: true }));
    expect(hint).toContain('3반음');
    expect(hint.match(/class="pipt[^\"]*"/g)).toHaveLength(3);
  });

  it.each([
    { degree: 3 as Degree, base: 'C' as Letter, quality: 'd' as QualityKey, upper: 'E 더블 플랫', key: 'D' },
    { degree: 5 as Degree, base: 'B' as Letter, quality: 'A' as QualityKey, upper: 'F 더블 샵', key: 'G' },
  ])('keeps $upper on the staff while explaining the $key piano position', (example) => {
    const view = interval(example.degree, note(example.base), floorOf(example.degree, example.quality));
    const markup = renderToStaticMarkup(createElement(Keyboard, {
      base: view.base, upper: view.upper, range: keyboardRange([example.degree]), showSteps: true,
    }));
    expect(markup).toContain(example.upper);
    expect(markup).toContain(`건반은 ${example.key} 자리`);
    expect(markup).not.toMatch(/[\u{1D12A}\u{1D12B}]/u);
  });
});
