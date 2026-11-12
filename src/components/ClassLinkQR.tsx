"use client";

import { useEffect, useRef, useState } from "react";

export function ClassLinkQR({url}:{url:string}) {
  const [svg,setSvg] = useState("");
  const [error,setError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    let cancelled = false;
    setSvg("");
    setError(false);
    if (!url) return ()=>{cancelled=true;};
    void (async()=>{
      try {
        const qrcode = await import("qrcode");
        const result = await qrcode.toString(url, {type:"svg",margin:4,width:240,color:{dark:"#1B2A4A",light:"#FFFFFF"}});
        if (!cancelled) setSvg(result);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return ()=>{cancelled=true;};
  },[url]);

  if (!url) return null;
  if (error) return <p className="small-note" role="status">QR 코드를 만들지 못했어요. 위의 수업 주소를 복사해서 사용해 주세요.</p>;
  return <section className="class-qr" aria-label="수업 링크 QR 코드">
    {svg ? <>
      {/* The SVG is generated solely by the local qrcode library, never supplied as markup by a user or remote service. */}
      <div className="class-qr-image" role="img" aria-label="수업 링크 QR 코드" dangerouslySetInnerHTML={{__html:svg}}/>
      <div className="class-qr-description"><p>휴대폰 카메라로 수업 링크를 열어 보세요.</p><button className="button" onClick={()=>{if(!dialog.current?.open)dialog.current?.showModal();}}>크게 보기</button></div>
    </> : <p className="small-note" role="status">QR 코드를 만들고 있어요…</p>}
    <dialog ref={dialog} className="class-qr-dialog" aria-labelledby="class-qr-dialog-title">
      <div className="class-qr-dialog-head"><h2 id="class-qr-dialog-title">수업 링크 QR 코드</h2><button autoFocus className="button" onClick={()=>dialog.current?.close()}>닫기</button></div>
      {svg && <div className="class-qr-large" role="img" aria-label="수업 링크 QR 코드" dangerouslySetInnerHTML={{__html:svg}}/>}
      <p className="class-qr-url">{url}</p>
      <p className="small-note">휴대폰 카메라로 비추면 수업이 열려요.</p>
    </dialog>
  </section>;
}

export default ClassLinkQR;
