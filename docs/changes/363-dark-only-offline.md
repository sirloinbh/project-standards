# #363 다크 고정 앱의 오프라인 화면 다크로 만들기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/frontend/public/offline.html.tmpl` | `offline.html`에서 이름을 바꾸고, 색 관련 줄을 변수로 교체 |
| `scripts/lib/vars.mjs` | `theme.offlineMeta`, `theme.offlineStyle` 추가 |
| `scripts/test/dark-only.test.mjs` | 앱별 렌더링 결과 검사 추가 |
| `docs/pwa.md` | 오프라인 화면 설명 갱신 |

## 정한 것

- 렌더러에 조건문이 없고, 조건문을 새로 넣기에는 쓰는 곳이 이 파일뿐이라 두 가지 색 줄을 `vars.mjs`에 둔다.
- `darkOnly` 앱은 `color-scheme: dark`, 다크 색, `theme-color` `#0a0a0a` 하나만 렌더링한다.

## 확인

- 변경 전후의 렌더링 결과를 앱 8개 모두 비교했다. `darkOnly`가 꺼진 앱 7개는 한 글자도 다르지 않고, workout-memo만 달라졌다.
- 앱 8개의 `.standards/manifest.json`에서 이 파일의 원본 경로가 `offline.html.tmpl`로 바뀐다.
