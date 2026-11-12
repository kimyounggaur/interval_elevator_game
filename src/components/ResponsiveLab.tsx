"use client";

import { useRef, useState } from "react";

const routes = [
  ["/", "홈"],
  ["/explore/", "자유 둘러보기"],
  ["/play/1-0/", "1단계 안내"],
  ["/play/1-1/", "1단계 층 맞히기"],
  ["/play/3-2/", "3단계 손님 모시기"],
  ["/play/4-4/", "4단계 총정리"],
  ["/settings/", "설정"],
  ["/records/", "내 기록"],
] as const;

export function ResponsiveLab() {
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(844);
  const [route, setRoute] = useState("/");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const frame = useRef<HTMLIFrameElement>(null);
  function applyTheme(nextTheme: "light" | "dark") {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    doc.documentElement.dataset.theme = nextTheme;
    // Only the embedded QA document hides development UI.
    if (!doc.getElementById("responsive-lab-dev-ui")) {
      const style = doc.createElement("style");
      style.id = "responsive-lab-dev-ui";
      style.textContent = "nextjs-portal{display:none!important}";
      doc.head.appendChild(style);
    }
  }
  return <main id="main" className="page-shell" style={{maxWidth:720}}>
    <h1>모바일 화면 검수</h1>
    <div className="panel" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
      <label style={{display:"grid",gap:5}}>화면
        <select aria-label="검수 화면" value={route} onChange={event=>setRoute(event.target.value)} style={{minHeight:44,maxWidth:240}}>
          {routes.map(([url,label])=><option key={url} value={url}>{label} · {url}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>너비
        <select aria-label="화면 너비" value={width} onChange={event=>setWidth(Number(event.target.value))} style={{minHeight:44}}><option value={360}>360px</option><option value={390}>390px</option></select>
      </label>
      <label style={{display:"grid",gap:5}}>테마
        <select aria-label="화면 테마" value={theme} onChange={event=>{const next=event.target.value as "light"|"dark";setTheme(next);applyTheme(next);}} style={{minHeight:44}}><option value="light">밝게</option><option value="dark">어둡게</option></select>
      </label>
      <label style={{display:"grid",gap:5}}>높이
        <select aria-label="화면 높이" value={height} onChange={event=>setHeight(Number(event.target.value))} style={{minHeight:44}}><option value={640}>640px</option><option value={844}>844px</option></select>
      </label>
    </div>
    <p className="small-note" style={{marginBottom:12}}>실제 앱의 {width}×{height} 화면이에요. 학습 기록과 잠금은 원래 앱과 같아요.</p>
    <div style={{width:width+2,maxWidth:"none",margin:"0 auto",border:"1px solid var(--line)",borderRadius:8,overflow:"hidden",background:"var(--surface)"}}>
      <iframe ref={frame} name="mobile-preview" title="모바일 검수 화면" src={route} width={width} height={height} onLoad={()=>applyTheme(theme)} style={{display:"block",width,height,border:0}}/>
    </div>
  </main>;
}

export default ResponsiveLab;
