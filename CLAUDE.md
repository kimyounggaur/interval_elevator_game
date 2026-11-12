# 음정 엘리베이터 — 작업 규칙
- 기준 문서는 docs/음정엘리베이터_기획서.md. 화면 모양의 기준은 docs/prototype.html (둘러보기 시안).
- src/engine/engine.ts, src/engine/golden/, src/engine/engine.golden.test.ts, scripts/make-golden.ts는 고치지 않는다.
  규칙을 바꿔야 할 것 같으면 고치지 말고 먼저 나에게 이유를 설명하고 묻는다.
- 음정·정답·선택지·힌트·보이기 규칙·안내 문장·별·잠금은 화면 코드에서 직접 계산하지 않고 엔진 함수만 쓴다.
- 음은 문자·임시표·옥타브로 다룬다. MIDI 번호로 음 이름을 만들지 않는다.
- 임시표는 src/assets/music-glyphs.json의 외곽선(SVG)으로 그린다. 𝄫·𝄪 같은 유니코드 글자를 화면에 쓰지 않는다.
- 화면 글자는 한국어 해요체. 맞음·틀림을 색만으로 알리지 않는다(✓·✗와 글자를 함께).
- 폰 세로(390×844, 360×640)가 먼저다. 가로 스크롤 금지. 누르는 것은 44px 이상.
- 서버·로그인·외부 API를 쓰지 않는다. 저장은 localStorage, 읽기·쓰기는 try/catch.
- 정적 내보내기라서 무작위 값(시드)·localStorage는 화면이 브라우저에 뜬 뒤(useEffect)에 만든다.
- 작업이 끝날 때마다 npm test와 npm run build를 돌리고 결과를 알린다.
- 나는 비개발자다. 결과는 무엇이 바뀌었고 화면 어디서 어떻게 확인하는지로 설명한다.
