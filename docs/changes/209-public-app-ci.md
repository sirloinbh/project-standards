# #209 public 앱 리포에 공통 CI를 펼쳐서 동기화

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/inline-ci.mjs` | 새 파일. 호출용 `ci.yml`의 `with:` 값을 읽어 `reusable-app-ci.yml`에 채운다. `on: workflow_call` 블록은 `on: [push, pull_request]`로, `${{ inputs.x }}`는 값으로, 조건 안의 `inputs.x`는 `true`·`false`·문자열 상수로 바꾼다. 선언되지 않은 입력, 값이 없는 필수 입력은 오류로 멈춘다 |
| `scripts/lib/sync-plan.mjs` | 레지스트리 `public`이 `true`인 앱은 `.github/workflows/ci.yml`을 펼친 내용으로 바꾼다. 매니페스트의 원본은 `.github/workflows/reusable-app-ci.yml`이다 |
| `registry/projects.json`, `registry/projects.schema.json` | 필수 필드 `public` 추가. workout-memo만 `true`다(2026-10-25 기준 GitHub 공개 설정과 같음) |
| `scripts/test/inline-ci.test.mjs` | 입력 읽기, 펼치기, 오류, public·private 앱 차이, 펼친 결과의 워크플로 규칙 검사 |
| `scripts/test/scaffold.test.mjs`, `docs/design.md` | fixture와 CI 설명 |

## 정한 것

- 원인: GitHub는 public 리포가 private 리포의 재사용 워크플로를 부르지 못하게 막는다. workout-memo#143의 `ci.yml`이 job 없이 0초 만에 실패했다.
- workout-memo를 private으로 바꾸지 않는다. 서버 자동 배포가 공개 리포와 API를 인증 없이 읽는다.
- project-standards도 공개하지 않는다(사용자 결정, 2026-10-25).
- 펼친 파일도 중앙 관리 파일이라 해시 검사로 중앙 내용과 같게 유지된다. 중앙 공통 CI가 바뀌면 다음 동기화 PR에 그대로 들어간다. private 앱처럼 커밋 SHA로 고정하는 효과는 동기화 PR 단위로 얻는다.

## 검증

- `npm run check` 통과(테스트 409개 중 406 통과·3 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
- workout-memo 미리보기의 `ci.yml`을 눈으로 확인: 중앙 SHA 고정 Action, `ubuntu-24.04`, `e2e-visual` 조건 `true && true`, 이미지 digest
- 실제 실행은 병합 뒤 갱신되는 workout-memo#143의 CI에서 확인한다
