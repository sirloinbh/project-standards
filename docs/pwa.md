# 웹 앱 설치 (PWA)

8개 앱을 휴대폰 홈 화면에 설치해서 앱처럼 열 수 있게 하는 기본 설정이다(#125). 외부 패키지(vite-plugin-pwa 등)는 쓰지 않는다. 플러그인을 도입하려면 [의존성 정책](dependency-policy.md)의 절차와 사용자 확인을 거친다.

## 구성

| 파일 (앱 리포) | 관리 | 내용 |
|---|---|---|
| `frontend/public/manifest.webmanifest` | 중앙 (전체 관리) | 이름은 레지스트리 `displayName`, 짧은 이름은 `title`. `display: standalone`, 시작 주소 `/`, 색은 라이트 배경 `#ffffff`(ADR-0008). `features.darkOnly` 앱은 다크 배경 `#0a0a0a`(ADR-0011) |
| `frontend/public/sw.js` | 중앙 (전체 관리) | 서비스 워커. 아래 캐시 규칙 |
| `frontend/public/offline.html` | 중앙 (전체 관리) | 오프라인 안내 화면. 라이트·다크 모드 |
| `frontend/nginx.conf` | 중앙 (전체 관리) | 캐시 헤더 |
| `frontend/public/icons/*.png` | 앱 | 아이콘. 처음에는 공통 임시 아이콘 |
| `frontend/index.html` | 앱 | manifest·아이콘 링크, `theme-color`, `viewport-fit=cover` |
| `frontend/src/main.tsx` | 앱 | 서비스 워커 등록(운영 빌드에서만) |

## 캐시 규칙 (sw.js)

- **화면(페이지 이동):** 항상 네트워크에서 받는다. 연결이 없으면 `offline.html`을 보여 준다. 페이지를 캐시하지 않으므로 오래된 데이터를 보여 주는 일이 없다.
- **`/assets/`(빌드 파일, 이름에 내용 해시가 붙음):** 캐시를 먼저 쓴다.
- **`/api/`, GET이 아닌 요청, 다른 출처:** 서비스 워커가 관여하지 않는다.
- **갱신:** nginx가 `sw.js`를 `no-cache`로 보내므로 브라우저가 매번 새 버전을 확인한다. 새 버전은 다음 방문 때 설치되고 바로 교체되며(`skipWaiting`, `clients.claim`), 이전 버전의 캐시를 지운다. 캐시 형식을 바꿀 때는 `sw.js`의 `VERSION`을 올린다.

## nginx 캐시 헤더

| 경로 | `Cache-Control` |
|---|---|
| `/assets/` | `public, max-age=31536000, immutable` |
| `/sw.js`, `/manifest.webmanifest` | `no-cache` |
| 그 밖의 화면(`/`, `index.html` 등) | `no-cache` |
| `/api/` | API가 정한 대로 |

`add_header`가 있는 `location`은 server 단계의 `add_header`를 물려받지 않는다. 그래서 그런 `location`마다 보안 헤더 2개(`X-Content-Type-Options`, `Referrer-Policy`)를 다시 적는다. 테스트(`scripts/test/pwa.test.mjs`)가 이를 확인한다.

## 아이콘

| 파일 | 크기 | 용도 |
|---|---|---|
| `icons/icon-192.png` | 192×192 | manifest `any`, 파비콘 |
| `icons/icon-512.png` | 512×512 | manifest `any`, 설치 화면 |
| `icons/maskable-512.png` | 512×512 | manifest `maskable`. Android가 원·둥근 사각형으로 잘라 쓴다. 중요한 그림은 가운데 지름 80% 원 안에 둔다 |
| `icons/apple-touch-icon.png` | 180×180 | iOS 홈 화면 |

- 처음에는 모든 앱이 같은 임시 아이콘(검은 바탕의 흰 고리)을 쓴다. 스캐폴드가 만들고, 기존 앱은 `node scripts/pwa-icons.mjs --out <앱>/frontend/public`로 만든다(이미 있는 파일은 `--force` 없이는 덮어쓰지 않는다).
- 앱 아이콘을 바꾸려면 같은 이름·크기의 PNG로 바꾼다. 배경은 투명하지 않게 꽉 채운다(iOS가 투명 부분을 검게 칠한다).

## 앱에 적용하기

새 앱은 스캐폴드가 모두 만든다. 기존 앱은 디자인 시스템 적용(#126) 때 다음을 추가한다.

1. 아이콘: `node scripts/pwa-icons.mjs --out ../<앱>/frontend/public`
2. `frontend/index.html`의 `<head>`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
   <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
   <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
   <link rel="manifest" href="/manifest.webmanifest" />
   <link rel="icon" href="/icons/icon-192.png" type="image/png" />
   <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
   ```
3. `frontend/src/main.tsx`의 끝:
   ```ts
   if (import.meta.env.PROD && 'serviceWorker' in navigator) {
     window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
   }
   ```
   `import.meta.env`를 쓰려면 `frontend/src/vite-env.d.ts`에 `/// <reference types="vite/client" />`가 있어야 한다.

## 확인 방법

- **Chrome DevTools:** 운영 빌드(`npm run build -w frontend` 후 `docker compose up --build`)를 열고 Application → Manifest에서 오류가 없는지, 주소창에 설치 아이콘이 보이는지 확인한다. 개발 서버(`vite`)에서는 서비스 워커를 등록하지 않는다.
- **실기기 [사용자]:** Android Chrome은 메뉴 → "홈 화면에 추가"(또는 "앱 설치"), iOS Safari는 공유 → "홈 화면에 추가". 홈 화면에서 열었을 때 주소창 없이 열리는지 확인한다.
- 설치 조건은 HTTPS 또는 `localhost`다. 도메인 없이 HTTP로 운영하는 동안(배포 runbook 참고)은 서버 IP로 접속하면 설치가 되지 않는다. SSH 터널(`http://localhost:<웹 포트>`)로 열면 확인할 수 있다.
