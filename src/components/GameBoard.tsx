'use client';
import type { ReactNode } from 'react';
import { ALL_VISIBLE, degreeLetters, describe, keyboardRange, type Degree, type Note, type Visibility, type Message, type TutorialFocus } from '@/engine/engine';
import { Building } from './Building';
import { Plate } from './Plate';
import { Staff } from './Staff';
import { Keyboard } from './Keyboard';
import { SayBox } from './SayBox';
import { useSettings } from '@/store/useSettings';
export function GameBoard({ degree, base, floor, open, visibility = ALL_VISIBLE, message, options, focus, onListen, messageAction, children, degrees }: { degree: Degree; base: Note; floor: number; open: [number, number]; visibility?: Visibility; message: Message; options?: ReactNode; focus?: TutorialFocus; onListen?: (kind: 'sequence' | 'together') => void; messageAction?: ReactNode; children?: ReactNode; degrees?: Degree[] }) {
  const view = describe(degree, base, floor);
  const sound = useSettings(s => s.sound);
  const focusClass = (part: TutorialFocus) => focus === part ? ' tutorial-focus' : '';
  const letters = degreeLetters(base, degree);
  return <div className="board-stack" data-testid="game-board">
    <div className={focusClass('plate')}><Plate view={view} visibility={visibility} /></div>
    <div className="stage">{visibility.leftPanel === 'options' ? options : <Building degree={degree} base={base} floor={floor} open={open} visibility={visibility} focus={focus} />}<div className="score">
      <div className={focusClass('staff')}><Staff base={base} upper={view.upper} /></div>
      <div className={`count${focusClass('count')}`} aria-label={visibility.degreeCount ? `도수 세기 ${letters.join(', ')}` : '도수는 직접 세어 보세요'}>{visibility.degreeCount ? <>{letters.map((letter, i) => <span className={`step${i === 0 ? ' b' : i === letters.length - 1 ? ' u' : ''}`} key={i}>{letter}<i>{i + 1}</i></span>)}<span className="eq">{degree}도</span></> : <span className="count-hidden">아래 음부터 세어 봐요</span>}</div>
      <SayBox message={message}>{messageAction}</SayBox>
      <div className={`listen${focusClass('listen')}`}><button type="button" className="btn" aria-label="두 음을 차례로 듣기" disabled={!sound} onClick={() => onListen?.('sequence')}><span aria-hidden="true">▶</span> 차례로</button><button type="button" className="btn" aria-label="두 음을 함께 듣기" disabled={!sound} onClick={() => onListen?.('together')}><span aria-hidden="true">▶</span> 함께</button></div>
    </div></div>
    <div className={focusClass('keyboard')}><Keyboard base={base} upper={view.upper} range={keyboardRange(degrees || [degree])} showSteps={visibility.keyboardSteps} /></div>
    <div className={focusClass('moves')}>{children}</div>
  </div>;
}
export default GameBoard;
