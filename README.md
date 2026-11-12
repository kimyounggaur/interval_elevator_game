# 음정 엘리베이터

도수는 건물, 성질은 층, 한 층은 반음 하나예요. 악보·건반·소리를 연결하는 한국어 모바일 음정 학습 게임입니다.

4단계·14개 미션으로 단3도/장3도, 기준음 바꾸기, 감3도/증3도, 5도 건물과 두 건물 비교를 배웁니다. 층 맞히기, 손님 모시기, 오답 힌트, 틀린 유형 다시 풀기, 별과 진행 기록, 선생님용 수업 링크·QR 코드를 제공합니다. 로그인과 외부 API는 필요 없으며 학습 기록은 해당 브라우저에 저장됩니다. 저장이 차단된 환경에서는 현재 방문 동안 이용할 수 있습니다.

## 실행

Node.js 20.19 이상을 권장합니다.

```sh
npm install
npm run dev
npm test
npm run build
```

개발 주소는 터미널에 표시됩니다. `npm run build`는 `out/` 폴더에 정적 웹사이트를 만듭니다. `npm start`는 정적 내보내기에서 사용하지 않습니다. 정적 서버에서 `out/`을 제공하세요.

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 음정 거리, 단계별 잠금과 별, 이어서 하기 |
| `/stage/1/` ~ `/stage/4/` | 단계별 미션 |
| `/play/1-0/` 등 | 안내와 문제 풀이 |
| `/explore/` | 완료한 안내만큼 열린 자유 둘러보기 |
| `/records/` | 별, 첫 시도 정답, 이동 수, 자주 틀린 유형 |
| `/settings/` | 소리, 수업 링크·QR, 기록 초기화 |
| `/lab/` | 악보·건반의 7가지 표기 검수 예제 |
| `/lab/responsive/` | 360/390px, 밝은/어두운 모바일 화면 검수 |

수업 링크 예: `/?open=3&sound=off`. 단계는 열리지만 각 단계 안에서는 안내부터 진행합니다. QR을 다른 기기에서 열려면 배포 주소의 설정 화면에서 만드세요.

키보드: ↑↓ 이동, Enter 도착/다음, 1~4 선택지. 소리 없이도 안내와 모든 미션을 완료할 수 있습니다. iOS 16 이하는 무음 스위치를 꺼야 소리가 날 수 있습니다.

## 폴더

```text
src/app/         화면 경로와 디자인
src/components/  건물·악보·건반·미션 화면
src/engine/      변경하지 않은 참조 엔진과 정답표
src/store/       브라우저 저장과 설정
src/lib/         Web Audio 합성음
src/assets/      Bravura 악보 기호 외곽선과 라이선스
docs/            받은 기획서·프롬프트·시안·검수 기록
public/          학습 그림, 앱 아이콘, 웹 앱 매니페스트
```

`src/engine/engine.ts`, `src/engine/golden/`, `src/engine/engine.golden.test.ts`, `scripts/make-golden.ts`는 원본 그대로 유지했습니다. 이론·정답·힌트·잠금·별은 엔진을 사용합니다. 음 이름은 문자·임시표·옥타브를 보존하여 C–G♯를 C–A♭으로 바꾸지 않습니다.

## 배포

정적 배포: 빌드 명령 `npm run build`, 출력 폴더 `out`. 각 주소의 `index.html`을 제공할 수 있는 호스팅을 사용하세요. 새로고침 시 `/stage/1/` 같은 주소가 열리는지 확인하세요.

현재 배포는 본인 전용 비공개입니다. 학생용 수업 링크·QR도 같은 접근 범위를 따릅니다.

GitHub → Vercel로 옮기는 경우 저장소를 GitHub에 올린 뒤 Vercel에서 **Add New → Project → 해당 저장소 Import**를 선택합니다. 프레임워크 **Next.js**, 빌드 **npm run build**, 정적 출력 **out**을 확인하여 배포합니다. 배포 후 설정 화면에서 만들어지는 수업 링크는 현재 배포 주소를 자동으로 사용합니다.

홈 화면 추가용 192/512px 아이콘과 Apple 아이콘을 포함했습니다. 서비스 워커와 오프라인 캐시는 사용하지 않습니다.

## 확인한 범위

엔진 golden 검사 20개, 저장·설정 검사 11개와 표기/숨김 렌더링 검사를 제공합니다. 자세한 결과와 실제 기기 확인 항목은 [검수 기록](docs/ACCEPTANCE.md)을 보세요. 실제 iPhone 무음 모드, 기기별 음질과 손가락 터치감은 실기기 확인이 필요합니다.

악보 기호: Bravura, © Steinberg Media Technologies GmbH, SIL Open Font License 1.1. 전문은 `src/assets/OFL-Bravura.txt`에 있습니다.

## 기준 자료

- [프롬프트 설계서](https://drive.google.com/file/d/12N_YwSGF_do-94oOpAiJ289u-50e5fhQ/view)
- [기획서](https://drive.google.com/file/d/12-nVZw2m17eEwdu5Gay4c6cYOucIVy5g/view)
- [화면 시안](https://drive.google.com/file/d/1bdCb-rhYMRnByWk_fvuXaZjvGSXhOpoc/view)
- [참조 엔진과 정답표](https://drive.google.com/file/d/1TKCvL7mCwVTCcKJyvcqkxlYHNu9nXfwu/view)
