# #191 사용자 단계 문서 2장을 state 재구성 결과로 갱신

## 변경

| 파일 | 내용 |
|---|---|
| `docs/user-steps.md` 2장 | "다른 PC에서 state 복사" 절차를 지우고, #92 결과(import로 재구성, provider v6.68.0, plan "No changes")와 다른 PC에서 인프라를 다룰 때의 안내로 바꿨다. 자세한 절차는 shared-aws-infrastructure `docs/operations.md`의 장으로 연결했다 |
| `docs/user-steps.md` 2장 | PowerShell 5.1 주의점을 추가했다: 줄 끊김, 빈 문자열 인수 누락, `<` 리디렉션 없음, BOM 없는 UTF-8, `.ssh` 폴더, AWS CLI의 에이전트 연동 질문 |
| `docs/user-steps.md` 표 | 2번 행을 완료로 바꾸고, 권장 순서와 "에이전트가 이어서 하는 일"을 갱신했다 |
| `docs/user-steps.md` 3-2 | PowerShell에서 동작하지 않는 `<` 리디렉션 명령을 웹 화면 등록 안내로 바꿨다 |
| `docs/user-steps.md` 4-1, 8 | 특정 사용자 경로를 `<project-standards 폴더>`로 바꿨다. 태그는 로컬 main을 바꾸지 않고 `origin/main`에 단다(#192 Fork 앱 규칙) |

## 정한 것

- 인프라 절차의 원본은 shared-aws-infrastructure `docs/operations.md` 하나로 둔다. 이 문서에는 순서와 판단 기준만 남겨 두 곳이 갈라지지 않게 했다.
- 계정 ID, IP, 이메일, state 값은 넣지 않았다.

## 검증

- `grep`으로 사용자 경로, 계정 ID, IP, 이메일이 문서에 없음을 확인
- `npm run check` 통과(테스트 392개 중 391 통과·1 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
