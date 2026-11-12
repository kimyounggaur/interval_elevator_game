import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
export function GameFrame({ title, backHref = '/', counter, children, aside }: { title: string; backHref?: string; counter?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return <main id="main" className="game-layout"><section className="game-app">
    <header className="game-top"><Link href={backHref} className="back-link" aria-label="이전 화면으로">←</Link><h1>{title}</h1><span className="game-counter">{counter}</span></header>{children}
  </section><aside className="game-aside">{aside || <>
    <p className="eyebrow">GUIDE TO INTERVAL STREET</p><h2>한 층 움직일 때마다,<br />반음 하나를 배워요.</h2>
    <div className="aside-rule"><b>01</b><p><strong>도수는 건물이에요.</strong><br />C부터 E까지 C·D·E, 세 칸이면 3도예요.</p></div>
    <div className="aside-rule"><b>02</b><p><strong>성질은 층이에요.</strong><br />같은 건물에서 위 음의 문자 자리는 그대로예요.</p></div>
    <div className="aside-rule"><b>03</b><p><strong>한 층은 반음 하나예요.</strong><br />B1과 1층 사이도 한 층이에요. 0층은 없어요.</p></div>
    <p className="muted keyboard-tip">키보드 ↑ ↓ 이동 · Enter 도착 / 다음<br />층 맞히기에서는 숫자 1–4로 골라요.</p>
    <details className="reference-guide"><summary>그림으로 원리 살펴보기</summary><Image src="/interval-guide.png" width={1536} height={1024} alt="3도와 5도 건물의 층 비교. 3도 장에서 감까지 두 층, 5도 완전에서 감까지 한 층이에요." /><p>그림의 겹감·겹증은 확장 개념이에요. 이번 놀이에서는 감·단·장·증과 감·완전·증을 배워요.</p></details>
  </>}</aside></main>;
}
export default GameFrame;
