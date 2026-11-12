"use client";

import Link from "next/link";
import { STAGES, stageStars, topMistakes } from "@/engine/engine";
import { useProgress } from "@/store/useProgress";

export function RecordsClient() {
  const { hydrated, progress } = useProgress();
  if (!hydrated) return <main id="main" className="page-shell" aria-busy="true"><p className="loading">기록을 읽고 있어요…</p></main>;
  const mistakes = topMistakes(progress);
  const hasRecords = Object.keys(progress.missions).length > 0;
  return <main id="main" className="page-shell records-page"><header className="page-top"><Link href="/" className="back-link">← 홈</Link><span className="eyebrow">안내원 수첩</span><Link href="/settings/" className="back-link">설정</Link></header><div className="page-title"><p className="eyebrow">한 층씩 쌓은 배움</p><h1>내 기록</h1><p>가장 잘한 기록과 다시 연습할 음정을 살펴봐요.</p></div>{!hasRecords && <div className="panel empty-state"><p>아직 기록이 없어요. 첫 안내부터 시작해 볼까요?</p><Link href="/stage/1/" className="button primary">첫 출근 시작하기</Link></div>}<div className="records-grid">{STAGES.map(stage=>{
    const stars=stageStars(progress,stage.id);
    return <section className="panel record-stage" key={stage.id}><div className="section-heading"><h2>{stage.id}. {stage.title}</h2><span className="stage-star">★ {stars.earned}/{stars.max}</span></div><ul className="record-list">{stage.missions.map(m=>{
      const r=progress.missions[m.id];
      return <li key={m.id}><div className="record-heading"><strong>{m.title}</strong><span>{r?.done ? m.kind === "tutorial" ? "✓ 완료" : `★ 별 ${r.best}/3` : "미완료"}</span></div>{r && <p className="small-note">플레이 {r.plays}회{r.last ? ` · 마지막 첫 시도 정답 ${r.last.firstTry}/${r.last.n}` : ""}{r.last && m.kind !== "identify" ? ` · 이동 ${r.last.moves}번 / 가장 짧게 ${r.last.minimal}번` : ""}</p>}</li>;
    })}</ul></section>;
  })}</div><section className="panel mistake-panel"><p className="eyebrow">한 번 더 만나 봐요</p><h2>자주 틀린 음정</h2>{mistakes.length ? <ol className="mistake-list">{mistakes.map(m=><li key={m.typeKey}><span>{m.label}</span><strong>{m.count}회</strong></li>)}</ol> : <p className="small-note">첫 시도에 틀린 음정이 여기에 모여요.</p>}</section></main>;
}

export default RecordsClient;
