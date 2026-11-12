/* eslint-disable @next/next/no-page-custom-font -- The supplied prototype fonts are linked from the shared App Router layout. */
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Providers } from '@/components/Providers';
import './globals.css';
export const metadata: Metadata = { title: '음정 엘리베이터 · 한 층은 반음 하나', description: '도수는 건물, 성질은 층. 악보와 건반, 소리를 연결해 배우는 음정 학습 게임이에요.', manifest: '/manifest.webmanifest', icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1B2A4A' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@600;800&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet" />
  </head><body><Providers>
    <a href="#main" className="skip-link">본문으로 건너뛰기</a>
    <header className="site-header"><Link href="/" className="brand" aria-label="음정 엘리베이터 홈"><span className="brand-icon" aria-hidden="true">↕</span><span>음정 엘리베이터<small>INTERVAL ELEVATOR</small></span></Link><nav aria-label="주 메뉴"><Link href="/explore/">둘러보기</Link><Link href="/records/">내 기록</Link><Link href="/settings/">설정</Link></nav></header>
    {children}<footer className="site-footer"><span>음정 거리 · 한 층은 반음 하나</span><span>한국생활음악강사협회 × ST Planet</span></footer>
  </Providers></body></html>;
}
