"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, isMissionUnlocked, isStageUnlocked, parseClassLink, stageStars } from "@/engine/engine";
import { useProgress } from "@/store/useProgress";
import { useSettings } from "@/store/useSettings";
import { playSequence } from "@/lib/audio";

function StreetBuilding({ degree, locked = false, future = false }: { degree: number; locked?: boolean; future?: boolean }) {
  const color = future ? "var(--ink-soft)" : degree === 3 ? "var(--teal)" : "var(--fifth)";
  const drawing = (
    <svg viewBox="0 0 180 224" role="img" aria-label={`${degree}도 건물${future ? ", 준비 중" : locked ? ", 잠겨 있어요" : ", 둘러보기로 가요"}`}>
      <defs>
        <pattern id={`bricks-${degree}`} width="34" height="18" patternUnits="userSpaceOnUse"><path d="M0 18H34M17 0V9M0 9H34M0 9V18M34 9V18" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".17" /></pattern>
        <linearGradient id={`door-${degree}`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#EDBB55"/><stop offset=".48" stopColor="#F6D98B"/><stop offset=".5" stopColor="#A67520"/><stop offset=".54" stopColor="#E7B74C"/><stop offset="1" stopColor="#D39A2C"/></linearGradient>
      </defs>
      <g style={{ color }}>
        <path d="M13 210V56H29V42H42V29H138V42H151V56H167V210Z" fill="var(--surface)" stroke="currentColor" strokeWidth="2"/>
        <path d="M18 209V59H162V209Z" fill="currentColor" opacity=".12"/>
        <path d="M18 209V59H162V209Z" fill={`url(#bricks-${degree})`}/>
        <path d="M8 56H172V64H8Z M24 40H156V47H24Z" fill="var(--stone)" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M37 43V31Q90 1 143 31V43Z" fill="currentColor"/>
        <text x="90" y="34" textAnchor="middle" fill="var(--surface)" fontSize="21" fontWeight="800" fontFamily="var(--font-display)">{degree}도 건물</text>
        {[38, 142].map(x => <g key={x}><rect x={x-10} y="78" width="20" height="35" rx="10" fill="var(--surface)" stroke="currentColor" strokeWidth="2"/><path d={`M${x} 79V112M${x-9} 96H${x+9}`} stroke="currentColor" strokeWidth="1.2"/><rect x={x-15} y="110" width="30" height="6" rx="2" fill="var(--stone)" stroke="currentColor"/><path d={`M${x-12} 109l3-7 7 5 4-6 9 8`} fill="var(--teal)" opacity=".8"/></g>)}
        <rect x="61" y="67" width="58" height="143" fill="var(--shaft-bg)" stroke="currentColor" strokeWidth="2"/>
        <path d="M90 69V210M63 106H117M63 144H117M63 182H117" stroke="currentColor" strokeWidth="1" opacity=".45"/>
        <rect x="65" y={degree === 3 ? 145 : 110} width="50" height="39" rx="2" fill={future ? "var(--stone-deep)" : `url(#door-${degree})`} stroke="var(--car-edge)" strokeWidth="1.5"/>
        <path d={`M90 ${degree === 3 ? 148 : 113}v33`} stroke="var(--car-edge)" opacity=".65"/>
        <rect x="17" y="203" width="146" height="7" fill="var(--stone)" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 211H170M5 217H175" stroke="currentColor" strokeWidth="2"/>
        {[25, 154].map(x=><g key={x}><rect x={x} y="186" width="5" height="18" fill="var(--teal)"/><circle cx={x+2} cy="182" r="12" fill="var(--teal)" opacity=".75"/><circle cx={x-3} cy="175" r="8" fill="var(--teal)" opacity=".7"/></g>)}
      </g>
      {(locked || future) && <g><rect x="45" y="144" width="90" height="31" rx="15" fill="var(--panel)"/><text x="90" y="164" textAnchor="middle" fill="var(--panel-ink)" fontSize="12" fontWeight="600">{future ? "준비 중" : "4단계에 열려요"}</text></g>}
    </svg>
  );
  if (future || locked) return <div className={`street-building ${future ? "future" : "locked"}`}>{drawing}</div>;
  return <Link className="street-building" href={`/explore/?degree=${degree}`} aria-label={`${degree}도 건물 둘러보기`}>{drawing}</Link>;
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
        <div className="street" aria-label="음정 거리"><StreetBuilding degree={3}/><StreetBuilding degree={5} locked={!isStageUnlocked(progress, 4)}/><StreetBuilding degree={7} future/></div>
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
