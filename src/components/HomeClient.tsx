"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, isMissionUnlocked, isStageUnlocked, parseClassLink, stageStars } from "@/engine/engine";
import { useProgress } from "@/store/useProgress";
import { useSettings } from "@/store/useSettings";
import { playSequence } from "@/lib/audio";

function StreetBuilding({ degree, locked = false, future = false }: { degree: number; locked?: boolean; future?: boolean }) {
  const label = future ? "준비 중" : locked ? "4단계에 열려요" : "건물 둘러보기";
  const content = <><span className="street-building-degree">{degree}도 건물</span><span className="street-building-label">{label}</span></>;
  if (future || locked) return <div className={`street-building ${future ? "future" : "locked"}`} aria-label={`${degree}도 건물, ${label}`}>{content}</div>;
  return <Link className="street-building" href={`/explore/?degree=${degree}`} aria-label={`${degree}도 건물 둘러보기`}>{content}<span className="street-building-arrow" aria-hidden="true">↗</span></Link>;
}

export function HomeClient() {
  const { hydrated, progress, storageError, applyClassLink } = useProgress();
  const { hydrated: settingsHydrated, sound, setSound } = useSettings();
  const router = useRouter();
  const handledLink = useRef(false);
  const [soundChecked, setSoundChecked] = useState(false);

  useEffect(() => {
    if (!hydrated || !settingsHydrated || handledLink.current) return;
    handledLink.current = true;
    const query = window.location.search;
    if (!query.includes("open=") && !query.includes("sound=")) return;
    const link = parseClassLink(query);
    applyClassLink(link);
    if (link.sound !== null) setSound(link.sound);
    if (link.open !== null) router.replace(`/stage/${link.open}/`);
  }, [hydrated, settingsHydrated, applyClassLink, setSound, router]);

  if (!hydrated || !settingsHydrated) return <main id="main" className="page-shell" aria-busy="true"><p className="loading">음정 거리를 열고 있어요…</p></main>;
  const nextMission = STAGES.flatMap(s => s.missions).find(m => isMissionUnlocked(progress, m.id) && !progress.missions[m.id]?.done);
  const empty = Object.keys(progress.missions).length === 0;
  const earned = STAGES.reduce((sum, stage) => sum + stageStars(progress, stage.id).earned, 0);

  return (
    <main id="main" className="page-shell home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="eyebrow">어서 와요, 음정 거리의 새 안내원님</p>
        <h1 id="home-title">음정 엘리베이터</h1>
        <p className="hero-description">도수는 건물, 성질은 층.<br className="mobile-break"/> 한 층은 반음 하나예요.</p>
        <div className="street" role="group" aria-label="음정 거리의 건물"><div className="street-sign" aria-hidden="true">♪ INTERVAL STREET</div><div className="street-choices"><StreetBuilding degree={3}/><StreetBuilding degree={5} locked={!isStageUnlocked(progress, 4)}/><StreetBuilding degree={7} future/></div></div>
        <div className="street-caption"><span>악보 · 건반 · 소리가 함께 바뀌어요</span><span className="star-total" aria-label={`모은 별 ${earned}개`}>★ {earned}</span></div>
      </section>
      <section className="journey-section" aria-labelledby="journey-title">
        <div className="section-heading"><div><p className="eyebrow">안내원 수첩</p><h2 id="journey-title">오늘은 어느 층으로 갈까요?</h2></div><span className="small-note">4단계 학습 여정</span></div>
        <div className="stage-grid">
          {STAGES.map(stage => {
            const unlocked = isStageUnlocked(progress, stage.id);
            const stars = stageStars(progress, stage.id);
            const continuing = nextMission?.stageId === stage.id;
            const contents = <><div className="stage-card-top"><span className="stage-number">{String(stage.id).padStart(2, "0")}</span><span className={unlocked ? "stage-star" : "stage-lock"}>{unlocked ? `★ ${stars.earned}/${stars.max}` : "잠김"}</span></div><h3>{stage.title}</h3><p>{stage.subtitle}</p><div className="stage-card-bottom"><span>{!unlocked ? "앞 단계를 마치면 열려요" : continuing ? empty ? "첫 출근 시작하기" : "이어서 하기" : "다시 둘러보기"}</span><span aria-hidden="true">{unlocked ? "↗" : "—"}</span></div></>;
            return unlocked ? <Link key={stage.id} href={`/stage/${stage.id}/`} className={`stage-card ${continuing ? "current" : ""}`}>{contents}</Link> : <article key={stage.id} className="stage-card locked" aria-label={`${stage.id}단계 ${stage.title}. 앞 단계를 마치면 열려요`}>{contents}</article>;
          })}
        </div>
      </section>
      <Link href="/explore/" className="explore-banner"><span className="explore-icon" aria-hidden="true">↕</span><span><strong>자유 둘러보기</strong><small>배운 층을 자유롭게 오르내려 봐요</small></span><span aria-hidden="true">→</span></Link>
      {empty && <section className="panel sound-check" aria-labelledby="sound-check-title"><div><h2 id="sound-check-title">소리가 들리나요?</h2><p>소리 없이도 끝까지 할 수 있어요.</p></div><button className="button" onClick={() => { if (sound) { void playSequence({letter:"C",acc:0,octave:4}, {letter:"E",acc:0,octave:4}); setSoundChecked(true); } else { setSound(true); void playSequence({letter:"C",acc:0,octave:4}, {letter:"E",acc:0,octave:4}); setSoundChecked(true); } }}>▶ 소리 확인</button><p className="small-note">아이폰 iOS 16 이하는 무음 스위치를 끄면 소리가 나요.</p>{soundChecked && <p role="status" className="small-note">두 음을 재생했어요. 소리 설정은 설정에서 바꿀 수 있어요.</p>}</section>}
      {storageError && <p className="storage-warning" role="status">{storageError}</p>}
    </main>
  );
}

export default HomeClient;
