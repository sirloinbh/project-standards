# #307 zod 4 이전 조사

## 변경

| 파일 | 내용 |
|---|---|
| `docs/research/zod4.md` | 보안 권고, 앱의 실제 노출, zod 4에서 바뀌는 API 수, 후보 A~D |

## 정한 것

- 조사만 했다. 코드는 바꾸지 않았다.
- #240의 "zod 3 유지" 권장은 zod 4 PR이 보안 업데이트라는 점을 빠뜨렸다. 이 문서가 그 판단을 다시 한다(#306은 보류 중).

## 검증

- 앱 8개 `origin/main`을 `git show`로 읽어 셌다. 배열 스키마는 여러 줄에 걸친 체인까지 괄호를 따라가며 확인했다.
- 패키지 정보는 `npm view zod@<버전> exports`, `npm view zod time`(읽기 전용)으로 확인했다.
- Dependabot 알림 내용은 GitHub API(`dependabot/alerts`)로 읽었다.
- zod 묶음 PR의 CI 실패 원인은 health-log 작업 로그에서 확인했다.
