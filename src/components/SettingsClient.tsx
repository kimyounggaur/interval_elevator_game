"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STAGES, classLinkQuery } from "@/engine/engine";
import { useProgress } from "@/store/useProgress";
import { useSettings } from "@/store/useSettings";
import { stopAudio } from "@/lib/audio";
import { ClassLinkQR } from "@/components/ClassLinkQR";

export function SettingsClient() {
  const { hydrated, reset, storageError } = useProgress();
  const { hydrated: settingsHydrated, sound, moveSound, setSound, setMoveSound } = useSettings();
  const [confirmReset,setConfirmReset] = useState(false);
  const [resetDone,setResetDone] = useState(false);
  const [stage,setStage] = useState(1);
  const [soundOff,setSoundOff] = useState(false);
  const [origin,setOrigin] = useState("");
  const [copyStatus,setCopyStatus] = useState("");
  const linkRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>setOrigin(window.location.origin),[]);
  const classUrl = origin ? `${origin}/${classLinkQuery(stage,soundOff)}` : "";
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(classUrl);
      setCopyStatus("✓ 수업 링크를 복사했어요.");
    } catch {
      linkRef.current?.focus(); linkRef.current?.select();
      setCopyStatus("주소를 선택했어요. 직접 복사해 주세요.");
    }
  };
  if (!hydrated || !settingsHydrated) return <main id="main" className="page-shell" aria-busy="true"><p className="loading">설정을 읽고 있어요…</p></main>;
  return <main id="main" className="page-shell settings-page"><header className="page-top"><Link href="/" className="back-link">← 홈</Link><span className="eyebrow">나에게 맞게</span><Link href="/records/" className="back-link">내 기록</Link></header><div className="page-title"><h1>설정</h1><p>소리와 학습 기록을 관리해요.</p></div><section className="panel settings-section"><h2>소리</h2><label className="switch"><span><strong>소리 켜기</strong><small>차례로 듣기와 함께 듣기를 사용할 수 있어요.</small></span><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);if(!e.target.checked)stopAudio();}}/></label><label className="switch"><span><strong>층을 옮길 때 소리 내기</strong><small>한 층 움직일 때마다 두 음이 함께 들려요.</small></span><input type="checkbox" checked={moveSound} onChange={e=>setMoveSound(e.target.checked)}/></label><p className="small-note">소리 없이도 모든 안내와 미션을 마칠 수 있어요.</p></section><section className="panel settings-section"><p className="eyebrow">선생님용</p><h2>수업 링크 만들기</h2><p>원하는 단계의 안내부터 수업을 시작할 수 있어요.</p><label className="field-label" htmlFor="class-stage">시작할 단계</label><select id="class-stage" value={stage} onChange={e=>{setStage(Number(e.target.value));setCopyStatus("");}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.id}단계 · {s.title}</option>)}</select><label className="switch compact"><span>소리를 끈 채 시작해요</span><input type="checkbox" checked={soundOff} onChange={e=>{setSoundOff(e.target.checked);setCopyStatus("");}}/></label><label htmlFor="class-link" className="field-label">수업 주소</label><textarea id="class-link" className="class-link" value={classUrl} ref={linkRef} readOnly rows={2}/><button className="button primary" onClick={()=>void copy()} disabled={!classUrl}>수업 링크 복사</button><p className="copy-status" role="status">{copyStatus || "받은 기기에서 열면 선택한 단계가 열려요."}</p><ClassLinkQR url={classUrl}/></section><section className="panel settings-section reset-section"><h2>진행 기록</h2><p>기록은 지금 사용 중인 브라우저에 저장돼요.</p>{!confirmReset ? <button className="button danger" onClick={()=>{setConfirmReset(true);setResetDone(false);}}>진행 기록 지우기</button> : <div className="reset-confirm"><strong>정말 지울까요?</strong><p>모은 별과 미션 기록이 모두 지워져요.</p><div className="button-row"><button className="button danger" onClick={()=>{reset();setConfirmReset(false);setResetDone(true);}}>지우기</button><button className="button" onClick={()=>setConfirmReset(false)}>취소</button></div></div>}{resetDone && <p role="status">✓ 진행 기록을 지웠어요. 홈에서 다시 시작할 수 있어요.</p>}{storageError && <p className="storage-warning" role="status">{storageError}</p>}</section></main>;
}

export default SettingsClient;
