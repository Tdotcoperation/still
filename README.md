# STILL

**잠시, 아무것도 하지 않아도 괜찮아.**

32개의 드림코어 풍경과 소리를 조합해 쉬어가는 한국어 웹사이트입니다. 로그인·광고·분석 추적을 사용하지 않습니다.

## 실행

Node.js 22.12 이상을 사용합니다.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## 기능

- 별도 AI 생성 가로/세로 풍경, 분류·즐겨찾기·무작위·현지 시간 추천·자동 변경·밝기·데이터 절약
- 파도·비·바람·모닥불·피아노·밤 소리를 동시에 재생하는 Web Audio 믹서, 개별 음소거·볼륨·마스터·페이드·프리셋 CRUD
- **메뉴에서만 접근하는** 호흡 가이드: 4/6, 4/2/6, 직접 설정, 일시정지와 재개, 선택 진동
- 500자 고민 흘려보내기: 내용은 메모리에서만 처리하고 닫기/취소/흘려보내기에 삭제
- 실제 종료 시각을 저장하는 휴식 타이머: 새로고침 복원·정지·재개·종료 동작
- 설정 가져오기/내보내기, 고대비·동작 줄이기·키보드, 반응형 유리 패널
- PWA, 오프라인 앱 셸, 선택 미디어 저장(최대 100 MiB), 업데이트 안내

처음 재생은 사용자 조작이 필요합니다. 오프라인에서는 저장한 음원만 활성화해 주세요. 앱이 완전히 종료되거나 운영체제가 중단하면 타이머 종료 동작은 복귀 시 처리됩니다. iOS 진동/전체화면 및 백그라운드 오디오는 브라우저 정책에 따라 제한될 수 있습니다.

## 자산

- `assets/originals/`: built-in image_gen으로 개별 생성한 AI PNG. 모바일은 가로 이미지 크롭이 아닙니다.
- `public/media/`: WebP와 썸네일. 원본 해상도·해시·생성 프롬프트는 `ASSET_MANIFEST.json`에 기록합니다.
- `public/audio/`: 48초 오리지널 합성 스테레오 MP3 6개, **CC0-1.0**. 자연 현장 녹음이 아닌 합성 사운드입니다. 재생성 소스는 `scripts/generate-audio.py`입니다. Python NumPy와 ffmpeg가 필요합니다.
- Wanted Sans: SIL Open Font License, `public/fonts/OFL.txt`.
- Lucide: ISC, 설치 패키지의 LICENSE.

```sh
npm run assets:optimize
```

이미지 최적화는 원본을 변경하지 않습니다. 이미지 제작·오디오 제작 도구는 일반 설치/빌드에 필요하지 않습니다.

## 배포

기본 배포는 미디어를 포함한 Workers 정적 자산입니다. R2는 원본 백업 또는 별도 미디어 경로로 선택 사용할 수 있습니다. 미인증 환경에서 실제 배포했다고 표시하지 않습니다.

```sh
npx wrangler login
npm run deploy:check
npm run deploy
```

R2 사용 시:

```sh
npx wrangler r2 bucket create still-media
npm run media:upload
npm run build
npx wrangler deploy --env r2
```

R2 원본 주소는 `/r2/originals/01-desktop.png` 형식입니다. 런타임에서는 가벼운 WebP를 사용하며 원본 전체를 다운로드하지 않습니다. 자세한 구성은 [DEPLOYMENT.md](DEPLOYMENT.md)를 보세요.

## 검증과 유지보수

```sh
npm test
npm run lint
npx playwright install chromium
npm run build
npm run test:e2e
```

`PROJECT_SPEC.md`: 요구사항, `ARCHITECTURE.md`: 설계, `PROGRESS.md`: 재개 지점, `TEST_REPORT.md`: 실제 검증 및 한계. 코드 라이선스는 기존 MIT `LICENSE`를 유지합니다. API 키나 토큰은 커밋하지 않습니다.

추가 브라우저 기본 검사: `npx playwright install webkit firefox` 후 별도 터미널에서 `npm run preview -- --host 127.0.0.1 --port 4175`를 실행하고 `node scripts/browser-smoke.mjs`를 실행합니다. 실제 기기 검증과는 구분합니다.
