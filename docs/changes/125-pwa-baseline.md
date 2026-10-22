# #125 웹을 앱처럼 설치할 수 있게 PWA 기본 설정

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/frontend/public/manifest.webmanifest` | 레지스트리 이름, `standalone`, 라이트 배경색, 아이콘 3개 |
| `templates/app/frontend/public/sw.js` | 의존성 없는 서비스 워커: 화면은 네트워크(오프라인이면 안내 화면), `/assets/`는 캐시 우선, `/api/`는 관여 안 함, 새 버전은 바로 교체하고 옛 캐시 삭제 |
| `templates/app/frontend/public/offline.html` | 오프라인 안내 화면 (라이트·다크) |
| `templates/app/frontend/nginx.conf` | `/assets/` 1년 immutable, `sw.js`·manifest·화면 `no-cache`. `add_header`가 있는 location마다 보안 헤더를 다시 적었다(nginx는 물려주지 않음) |
| `templates/app/.prettierignore` | 새 관리 파일 3개 추가 (#154 규칙) |
| `scripts/lib/pwa-icons.mjs`, `scripts/pwa-icons.mjs` | Node 내장 모듈만으로 임시 아이콘 PNG 4개를 그리고 쓴다(기존 앱용 CLI는 있는 파일을 덮어쓰지 않음) |
| `scaffold/app/frontend` | `index.html`에 manifest·아이콘·`theme-color`, `main.tsx`에 운영 빌드 서비스 워커 등록, `vite-env.d.ts`. 스캐폴드가 아이콘도 만든다 |
| `docs/pwa.md` | 구성, 캐시 규칙, 아이콘 규격, 기존 앱 적용 방법, 확인 방법 |
| `scripts/test/pwa.test.mjs` | 8개 앱 manifest, 색과 토큰 일치, 서비스 워커 문법·규칙, nginx 헤더, PNG 크기·안전 영역 |

## 검증

- `npm run check` 통과.
- 가상 슬롯 99 스캐폴드를 workout-memo 설치본으로 빌드(`vite build`)하고, 설치된 Chrome에서 확인했다(Playwright, 영구 프로필).
  - CDP `Page.getInstallabilityErrors`: 오류 없음. `Page.getAppManifest`: 오류 없음.
  - 오프라인 전환 후 다른 주소로 이동하면 `offline.html`("인터넷에 연결되어 있지 않습니다")이 나온다.
  - `eslint .`(서비스 워커 전역 `self`, `caches` 선언 추가 후) 통과.
- 실기기(Android Chrome, iOS Safari) 홈 화면 추가는 사용자 확인 사항이다.
