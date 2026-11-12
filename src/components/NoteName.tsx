import { spell, type Note } from "@/engine/engine";
import MusicGlyph, { accidentalGlyphName } from "./MusicGlyph";

export function NoteName({ note, className = "" }: { note: Note; className?: string }) {
  const glyphName = accidentalGlyphName(note.acc);
  return (
    <span className={`nt ${className}`.trim()}>
      <span className="sr">{spell(note, "word")}</span>
      <span aria-hidden="true">
        {note.letter}
        {glyphName && <MusicGlyph name={glyphName} />}
      </span>
    </span>
  );
}

export default NoteName;
