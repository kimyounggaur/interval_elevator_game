"use client";

import Link from "next/link";
import { stageById, stageStars, isStageUnlocked, isMissionUnlocked } from "@/engine/engine";
import { useProgress } from "@/store/useProgress";

export function StageClient({ id }: { id: number }) {
  const { hydrated, progress } = useProgress();
  const stage = stageById(id);
  if (!hydrated) return <main id="main" className="page-shell" aria-busy="true"><p className="loading">안내원 수첩을 열고 있어요…</p></main>;
  const unlocked = isStageUnlocked(progress, id);
  const stars = stageStars(progress, id);
  const next = stage.missions.find(m => isMissionUnlocked(progress,m.id) && !progress.missions[m.id]?.done);
  return <main id="main" className="page-shell stage-page"><header className="page-top"><Link href="/" className="back-link">← 홈</Link><span className="eyebrow">안내원 수첩</span><Link href="/settings/" className="back-link">설정</Link></header><section className="stage-intro"><span className="stage-number">{String(id).padStart(2,"0")}</span><p className="eyebrow">{id}단계</p><h1>{stage.title}</h1><p>{stage.subtitle}</p><p className="stage-star">★ 모은 별 {stars.earned}/{stars.max}</p></section>{!unlocked ? <section className="panel locked-message"><h2>아직 잠겨 있어요</h2><p>앞 단계를 마치면 열려요.</p><Link href="/" className="button primary">음정 거리로 돌아가기</Link></section> : <section className="mission-list" aria-label={`${id}단계 미션 목록`}>{stage.missions.map((m,index) => {
    const open = isMissionUnlocked(progress,m.id);
    const record = progress.missions[m.id];
    return <article className={`mission-card ${!open ? "locked" : ""} ${next?.id === m.id ? "current" : ""}`} key={m.id}><span className="mission-icon" aria-hidden="true">{m.kind === "tutorial" ? "↕" : m.kind === "identify" ? "?" : m.kind === "pairs" ? "⇄" : "↑"}</span><div className="mission-details"><p className="eyebrow">미션 {index+1} · {m.kind === "tutorial" ? "함께 배워요" : `${m.count}문제`}</p><h2>{m.title}</h2><p className="small-note">{!open ? "앞 미션을 마치면 열려요" : m.kind === "tutorial" ? record?.done ? "✓ 안내를 마쳤어요" : "선배 안내원과 함께 시작해요" : `★ 별 ${record?.best ?? 0}/3${record?.done ? " · 완료했어요" : ""}`}</p></div>{open ? <Link href={`/play/${m.id}/`} className={`button ${next?.id === m.id ? "primary" : ""}`}>{record?.done ? "다시 하기" : "시작"}<span className="sr">: {m.title}</span></Link> : <span className="lock-label">잠김</span>}</article>;
  })}</section>}<Link href="/explore/" className="text-link">↕ 자유 둘러보기</Link></main>;
}

export default StageClient;
