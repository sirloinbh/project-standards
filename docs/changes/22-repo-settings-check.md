# #22 리포 설정·secret 이름 점검

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/repo-settings.mjs` | 리포 설정, 브랜치 보호, Dependabot, Actions 권한, secret·variable **이름**을 읽고 기준과 비교. 비공개 리포의 Free 요금제 제한(403)은 "요금제"로 구분 |
| `scripts/compliance.mjs`, `scripts/lib/compliance.mjs` | 준수 현황에 "리포 설정" 열과 리포별 다른 항목 표 |
| `sync.config.schema.json` | 대상별 `secrets`·`variables` 이름 목록(선택, 기본 빈 목록) |
| `docs/repo-settings.md` | 항목, 기준, 수준, 이유, 2026-10-22 결과, 맞추는 명령 |
| `docs/user-steps.md` | 5단계: 리포 설정 맞추기 |
| `scripts/test/repo-settings.test.mjs` | 기준 충족·요금제 제한·보호 없음·이름 누락·읽기 실패, 값이 보고서에 나오지 않음 |

## 결정

- secret·variable 목록은 레지스트리 프로젝트가 아니라 `sync.config.json` 대상에 둔다. 인프라 리포처럼 프로젝트가 아닌 대상도 있기 때문이다.
- 비공개 리포의 브랜치 보호와 secret scanning은 GitHub Free에서 쓸 수 없어 실패로 세지 않는다.
- squash·rebase 끄기와 브랜치 자동 삭제는 권장(△)으로 둔다.

## 검증

- `npm run check` 통과.
- 개인 계정 읽기 API로 9개 리포에 미리 실행: 결과는 `docs/repo-settings.md` "2026-10-22 확인 결과".
