# #260 리포 설정 기준에 CodeQL 코드 스캔과 secret scanning 넣기

## 결정

- 리포 11개가 모두 공개(2026-10-27)라 secret scanning·push protection과 CodeQL을 모든 리포 필수로 본다.
- CodeQL은 **기본 설정**(default setup)을 쓴다. 고급 설정은 `codeql.yml`을 관리 파일로 두고 언어·빌드를 맞춰야 하는데, 지금 앱은 모두 JavaScript/TypeScript라 기본 설정으로 충분하고 동기화할 파일이 늘지 않는다.
- 준수 현황은 `GET repos/<리포>/code-scanning/default-setup`의 `state`가 `configured`인지 본다. 동기화 App에 Code scanning alerts 읽기 권한이 필요하다. 권한을 더하기 전에는 "확인 못 함"으로 나온다.

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/repo-settings.mjs` | CodeQL 기본 설정 수집·판정(`configured` 통과, 그 밖 실패, 비공개는 요금제, 못 읽으면 확인 못 함) |
| `scripts/test/repo-settings.test.mjs` | 통과·비공개·꺼짐·권한 없음 경우 |
| `docs/repo-settings.md` | 공개 여부 갱신, CodeQL 기준 행, 맞추는 법을 모든 리포 기준으로 |
| `docs/github-app.md`, `docs/adr/0002-github-app-for-sync.md` | App 권한에 Code scanning alerts 읽기 추가 |
| `docs/user-steps.md` | 9. 리포 보안 설정 켜기와 App 권한 추가 (#261) |

## 검증

- `node --test scripts/test/repo-settings.test.mjs`: 6개 통과
- `npm run check`: PR 본문 참고
