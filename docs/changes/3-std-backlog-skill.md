# #3 공통 스킬 std-backlog

## 변경

- `templates/common/skills/std-backlog/SKILL.md`: 요구사항을 작은 이슈로 나눠 등록하고, 우선순위·특성 라벨을 달고, 이전 PR이 병합된 뒤 다음 작업을 고르는 절차. B안 동기화로 모든 하위 리포에 배포할 원본이다.
- `.claude/skills/std-backlog/SKILL.md`: 중앙 리포에서 Claude Code가 읽는 복제본
- `AGENTS.md`: 작업 절차에 std-backlog 참조 추가 (Codex는 이 참조로 스킬을 찾는다)

## GitHub 설정 (리포 밖 변경)

sirloinbh/project-standards에 라벨 20개를 만들었다.

- 우선순위: `priority/P0`~`P4`
- 특성: `type/feature|docs|security|chore|research`, `area/templates|tooling|compliance|registry|scaffold|ci|deploy|agent`
- 기타: `origin/added`, `needs-user`

이 이슈(#3)는 작업 중 추가된 요구사항이므로 `priority/P0`와 `origin/added`를 달았다. #1에는 `priority/P1`, `type/docs`를 달았다.

## 하위 리포 적용

하위 리포 배포는 동기화 스크립트가 생긴 뒤 `templates/common/skills/` 경로를 통해 이뤄진다. 하위 리포에 직접 push하지 않는다. 라벨을 9개 리포에 맞추는 작업은 별도 백로그 이슈로 등록했다.

## 검증

- 원본과 Claude Code 복제본이 같은지 `diff`로 확인했다(차이 없음).
- 스킬 frontmatter의 `name`이 디렉토리 이름(`std-backlog`)과 같은지 확인했다.
