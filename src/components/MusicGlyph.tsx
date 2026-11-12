import type { CSSProperties } from "react";
import glyphData from "@/assets/music-glyphs.json";

export const musicGlyphs = glyphData.glyphs;
export type MusicGlyphName = keyof typeof musicGlyphs;

const accidentalNames: Readonly<Record<number, MusicGlyphName>> = {
  [-3]: "accidentalTripleFlat",
  [-2]: "accidentalDoubleFlat",
  [-1]: "accidentalFlat",
  1: "accidentalSharp",
  2: "accidentalDoubleSharp",
  3: "accidentalTripleSharp",
};

export function accidentalGlyphName(acc: number): MusicGlyphName | null {
  return accidentalNames[acc] ?? null;
}

export function GlyphPath({
  name,
  x = 0,
  y = 0,
  scale = 0.04,
  className,
}: {
  name: MusicGlyphName;
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
}) {
  return (
    <path
      className={className}
      d={musicGlyphs[name].d}
      transform={`translate(${x} ${y}) scale(${scale} ${-scale})`}
    />
  );
}

/** A Bravura outline in an inline SVG, independent of installed music fonts. */
export function MusicGlyph({
  name,
  className = "acc",
  label,
  style,
}: {
  name: MusicGlyphName;
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  const glyph = musicGlyphs[name];
  const width = glyph.bbox[2] + 30;
  const height = 820;
  return (
    <svg
      className={className}
      viewBox={`-15 -455 ${width} ${height}`}
      style={{ width: `${(width / height) * 1.05}em`, height: "1.05em", ...style }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      fill="currentColor"
    >
      <path d={glyph.d} transform="scale(1 -1)" />
    </svg>
  );
}

export default MusicGlyph;
