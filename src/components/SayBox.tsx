import type { ReactNode } from 'react';
import type { Line, Message } from '@/engine/engine';
import { NoteName } from './NoteName';

export function MessageLine({ line }: { line: Line }) {
  return <>{line.map((segment, index) => typeof segment === 'string'
    ? <span key={index}>{segment}</span>
    : <NoteName key={index} note={segment.note} />)}</>;
}

export interface SayBoxProps {
  message: Message;
  children?: ReactNode;
}

export function SayBox({ message, children }: SayBoxProps) {
  return (
    <section className={`say say-${message.tone}`} aria-live="polite" aria-atomic="true">
      <div className="say-content">
      {message.tone === 'hint' && <span className="say-label">힌트</span>}
      {message.tone === 'reveal' && <span className="say-label">정답 확인</span>}
      <strong className="say-title">{message.tone === 'correct' && <span aria-hidden="true">✓ </span>}<MessageLine line={message.title} /></strong>
      {message.lines.map((line, index) => <p key={index}><MessageLine line={line} /></p>)}
      </div>
      {children}
    </section>
  );
}

export default SayBox;
