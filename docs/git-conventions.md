# Git 컨벤션

이슈·브랜치·커밋·PR을 쓰는 방법은 [std-git-writing](../templates/common/skills/std-git-writing/SKILL.md) 스킬이 원본이다. 이 문서는 그 요약과, 리포 설정·병합 정책을 다룬다.

## 요약

| 대상 | 규칙 | 예 |
|---|---|---|
| 이슈 제목 | 접두어 없이 "무엇을 하는지" 한 문장 | `레지스트리 원본 파일과 충돌 검사 만들기` |
| 이슈 본문 | 템플릿 6개 절: 한 줄 요약, 왜 필요한가요, 할 일, 완료 기준, 먼저 끝나야 하는 것, 참고 | `.github/ISSUE_TEMPLATE/task.md` |
| 라벨 | 우선순위 1개, `type` 1개, `area` 1개 이상 | [std-backlog](../templates/common/skills/std-backlog/SKILL.md) |
| 브랜치 | `<type>/<이슈번호>-<영문-요약>` | `feat/44-registry-files` |
| 커밋 | Conventional Commits, 한국어 설명, 이슈 번호 | `feat: 레지스트리 충돌 검사 추가 (#44)` |
| PR 제목 | 커밋 제목과 같은 형식 | |
| PR 본문 | 템플릿 6개 절 + `Closes #번호` | `.github/pull_request_template.md` |
| 작업 기록 | `docs/changes/<이슈번호>-<slug>.md`를 구현·테스트와 같은 커밋에 | |

`type`: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

## 병합 정책

| 리포 | 병합하는 사람 | 이유 |
|---|---|---|
| project-standards | 에이전트 (CI 통과 후 merge commit) | 사용자 결정(2026-10-22, #128). 문서·텍스트·스크립트 작업이다 |
| 앱 리포 8개 | 사용자만 | main 병합이 곧 운영 배포다 |
| shared-aws-infrastructure | 사용자만 | 인프라 변경은 plan 확인이 필요하다 |

- 동기화 PR(`chore/standards-sync-*`)도 앱·인프라 리포에서는 사용자가 병합한다.
- 에이전트는 자신의 PR을 승인해서 리뷰를 대신하지 않는다.

## 브랜치 보호 체크리스트

각 리포 main에 다음을 설정한다. 설정은 사용자가 하고, 준수 현황(#22)이 확인한다.

- [ ] main에 직접 push 금지: Require a pull request before merging
- [ ] CI 통과 필수: Require status checks to pass (`ci`)
- [ ] force push 금지, 브랜치 삭제 금지
- [ ] 병합 방식: merge commit 허용(지금까지의 이력과 같게)
- [ ] 병합 후 브랜치 자동 삭제: Automatically delete head branches
