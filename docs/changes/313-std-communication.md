# #313 중앙 스킬 std-communication과 앱 스킬 정리

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/skills/std-communication/SKILL.md` | 새 공통 스킬: 사용자에게 하는 설명은 한국어, 명령·경로·식별자·오류 원문은 그대로 |
| `.claude/skills/std-communication/SKILL.md` | 이 리포의 복제본 |
| `templates/app/AGENTS.md.tmpl`, `AGENTS.md` | 스킬 안내에 추가 |
| `scripts/test/agents.test.mjs`, 스냅샷 | 앱 8개와 인프라 리포가 받는지, `.claude/skills/` 복제가 같은지 |

## 정한 것

- 바탕은 workout-memo의 `workout-communication`이다. 앱 이름을 빼고, "보고 쓰는 법"(결과 먼저, 사용자 할 일 따로, 실행 결과는 사실대로)을 더했다.
- 템플릿 변수를 쓰지 않았다. 이 리포의 `.claude/skills/` 복제본을 원본과 똑같이 두기 위해서다.
- `templates/common/`에 두어 인프라 리포도 받는다.

## 앱 스킬 정리

앱 리포 PR로 한다(병합은 사용자). 동기화 PR로 `std-communication`이 들어간 뒤 병합한다.

- workout-memo: `workout-communication` 삭제(중앙 스킬로 대체)
- study-log·plan-routine: `*-testing`의 "아직 도입하지 않은 Vitest·Playwright", `*-foundation`의 `frontend/src/style.css` 토큰 설명 고치기
- 세 앱의 `*-implementation`: 중앙 `std-implementation`·`std-git-writing`과 같은 줄 지우기

## 검증

- `npm test`: 489개 중 488개 통과, 1개 건너뜀, 실패 0
