import { missionById, summarize, typeLabel, type Session } from '@/engine/engine';

export interface ResultCardProps {
  session: Session;
  onRetry: () => void;
  onFinish: () => void;
}

export function ResultCard({ session, onRetry, onFinish }: ResultCardProps) {
  const summary = summarize(session);
  const mission = missionById(session.missionId);
  const mistakes = [...new Set(summary.mistakes)];
  return (
    <section className="result-card" aria-labelledby="result-title">
      <p className="eyebrow">{mission.stageId}단계 · {mission.title}</p>
      <h1 id="result-title">수고했어요!</h1>
      <div className="result-stars" aria-hidden="true">{'★'.repeat(summary.stars)}{'☆'.repeat(3 - summary.stars)}</div>
      <p className="star-count">별 {summary.stars}개</p>
      <p className="result-accuracy">첫 시도 정답 <strong>{summary.firstTry}/{summary.n}</strong></p>
      {mission.kind !== 'identify' && <p>이동 {summary.moves}번 · 가장 짧게 {summary.minimal}번</p>}
      {mistakes.length > 0 && (
        <div className="result-mistakes">
          <h2>다시 살펴볼 음정</h2>
          <ul>{mistakes.map((key) => <li key={key}>{typeLabel(key)}</li>)}</ul>
        </div>
      )}
      {session.round === 'retry' && <p className="muted">다시 풀기를 마쳤어요. 별은 본 문제의 기록으로 정해져요.</p>}
      {session.canRetry
        ? <button type="button" className="move result-action" onClick={onRetry}>틀린 유형 다시 풀기 ({summary.mistakes.length}문제)</button>
        : <button type="button" className="move result-action" onClick={onFinish}>완료</button>}
    </section>
  );
}

export default ResultCard;
