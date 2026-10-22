# #147 앱 AGENTS.md 템플릿의 병합 규칙을 AGENTS.project.md에 맡기기

## 변경

- `templates/app/AGENTS.md.tmpl` 절차 5번: PR 리뷰와 병합 규칙은 각 리포의 `AGENTS.project.md`를 따른다. 거기에 정해져 있지 않으면 사용자만 병합한다.
- `scripts/test/agents.test.mjs`: 8개 앱 모두 렌더링된 AGENTS.md에 이 문장이 있는지 확인한다.

## 이유

workout-memo의 현재 규칙(origin/main)은 "필수 CI가 통과하면 에이전트가 사용자 확인 없이 병합"이고, 자동 코드 리뷰를 최대 2회 받는다. 그런데 중앙 템플릿이 "사용자만 병합"으로 고정돼 있어서, 첫 동기화(#97)가 이 규칙을 덮어쓰게 된다. workout-memo#136에서 그 규칙을 `AGENTS.project.md`로 옮겼으므로, 템플릿은 그 파일에 결정을 맡긴다.

## 검증

- `npm run check` 통과 (결과는 PR 본문)
