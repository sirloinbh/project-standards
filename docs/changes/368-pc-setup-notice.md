# #368 전역 지침이 옛 규칙인 PC에서 세션 시작 때 적용 안내 띄우기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/hooks/pc-setup-notice.mjs`와 복제본 | 전역 지침의 Fork 규칙 절을 찾아 안내하는 `SessionStart` 훅 추가 |
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | 훅 등록 |
| `scripts/test/pc-setup-notice.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | 훅 테스트, 동기화 파일 목록 |
| `docs/user-steps.md`, `docs/agent-guardrails.md` | 안내가 뜨는 조건과 한계 기록 |

## 정한 것

- 이미 적용한 PC에서는 아무것도 출력하지 않는다. 날짜나 PC 이름이 아니라 전역 지침의 실제 내용으로 판단한다.
- 제목(`## `)에 `Fork`가 있는 절만 찾는다. 본문에서 Fork를 언급한 것은 안내 대상이 아니다.
- 앱 리포에서 작업을 시작해도 뜨도록 중앙 공통 템플릿에 넣는다.
- 안내는 사용자 화면(`systemMessage`)과 에이전트 맥락(`additionalContext`)에 모두 넣는다.
- 알림만 하는 훅이라 `onFailure: "block"`을 쓰지 않는다.

## 한계

- 훅은 리포에 들어 있으므로, 그 PC의 클론이 이 변경을 받은 세션부터 뜬다. 리포 밖 파일을 다른 PC에서 고칠 방법은 없다.
- Codex 세션에서는 뜨지 않는다.
