# Cloudflare 배포

## 기본 Workers 배포

`wrangler.jsonc`의 `ASSETS` 바인딩이 `dist/`를 제공합니다. `npm run build`는 타입 검사, Vite 빌드, 해시 기반 앱 셸 서비스 워커 생성을 수행합니다. 원본 PNG는 정적 배포에 포함되지 않고 최적화 WebP만 포함됩니다.

`wrangler.jsonc`의 custom build가 `npm ci && npm run build`를 실행하므로, 빌드 명령이 비어 있어도 `npx wrangler deploy`가 먼저 앱을 빌드합니다. npm 배포 스크립트도 이 공통 경로를 사용해 빌드를 중복하지 않습니다.

프로덕션 브랜치는 앱이 병합된 `main`, 루트 디렉터리는 저장소 최상위 `/`, Worker 이름은 `still`을 사용합니다.

Cloudflare 계정 로그인 후 `npm run deploy`를 실행합니다. GitHub 저장소를 Cloudflare Workers Builds에 연결할 때 빌드 명령은 `npm ci && npm run build`, 배포 명령은 `npx wrangler deploy --env=""`입니다. 프로덕션 배포 전 `npm run deploy:check`로 구성을 검증하세요.

로컬 환경에는 Cloudflare 인증이 없어 공개 URL 배포를 검증하지 못했습니다. 임의의 다른 계정이나 임시 계정으로 배포하지 않습니다.

## R2

`still-media` 버킷을 생성하고 `npm run media:upload`로 원본을 업로드한 후 `npx wrangler deploy --env r2`를 실행하면 `MEDIA` 바인딩이 활성화됩니다. 버킷 이름을 바꾸면 `wrangler.jsonc`와 `STILL_R2_BUCKET` 값을 함께 변경하세요. 업로드 스크립트는 자식 프로세스의 인자 배열을 사용하며 셸에 비밀값을 전달하지 않습니다.

R2 경로는 `/r2/originals/<name>.png`입니다. Worker는 GET/HEAD만 허용하며 임의 키 목록이나 업로드 API를 노출하지 않습니다. 같은 출처로 제공해 CORS 설정이 필요 없습니다. 범위 요청은 R2 range로 처리합니다. 최적화 이미지와 음원도 R2로 옮기려면 `media/`, `audio/` 키로 업로드하고 앱의 `file()` 및 오디오 경로, 오프라인 URL 허용 목록을 함께 변경해야 합니다. 기본 구성은 계정 설정 없이도 빌드·테스트 가능한 번들 미디어를 유지합니다.

## 보안 및 개인정보

비밀 환경 변수는 프런트엔드에 필요 없습니다. CI 인증은 Cloudflare의 암호화된 변수 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 사용하세요. `.env*`, `.dev.vars`는 Git에서 제외합니다. 고민을 받는 서버 API가 없습니다. CSP와 기본 보안 헤더는 `public/_headers`에 있습니다. R2 응답은 Worker에서 헤더를 설정합니다.

## 오프라인과 업데이트

앱 셸만 사전 캐시합니다. 사용자가 저장한 이미지·오디오만 `still-media-v1`에 보관하고 IndexedDB에서 용량을 관리합니다. 최대 100 MiB이며 브라우저가 저장소를 회수할 수 있습니다. 최초 온라인 접속이 필요합니다. 새 빌드는 새 캐시 이름을 사용하며 사용자가 업데이트를 선택하면 전환합니다. 열린 고민 내용은 새로고침 시 사라지므로 업데이트 전에 정리해 주세요.

공식 참고: https://developers.cloudflare.com/workers/static-assets/binding/ 및 https://developers.cloudflare.com/workers/wrangler/configuration/
