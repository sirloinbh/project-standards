# #404 이슈카드를 분야별 상위 이슈와 하위 이슈로 묶는 규칙 넣기

사용자가 2026-11-05에 요청했다. sirloinbh/file-control에서 열린 작업 이슈 35개를 분야 7개의 상위 이슈 아래 GitHub 하위 이슈로 묶은 방식을 모든 리포에 적용한다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/skills/std-backlog/SKILL.md` | 규칙 5번과 6장 추가. 6장은 상위·하위 이슈 규칙과 연결 명령이다. 3장에 `epic` 라벨, 4장에 "상위 이슈" 줄, 5장에 "상위 이슈는 후보가 아니다"와 "연결되지 않은 이슈는 착수 전에 연결"을 넣었다 |
| `templates/common/skills/std-git-writing/SKILL.md` | 상위 이슈 제목 규칙, 본문 "참고"에 상위 이슈 |
| `templates/common/.github/ISSUE_TEMPLATE/task.md` | "참고"에 `상위 이슈:` 줄 |
| `templates/common/labels.json` | `epic` 라벨(동기화가 하위 리포에 만든다) |
| `.claude/skills/std-backlog/`, `.claude/skills/std-git-writing/`, `.github/ISSUE_TEMPLATE/task.md` | 이 리포의 복제본 |

## 정한 것

- 분야는 기능 영역·명령·모듈 단위다. 우선순위·종류·시점으로는 묶지 않는다(라벨이 맡는다).
- 깊이는 2단계(상위 → 작업). 작업 이슈의 상위는 하나다.
- 상위 이슈의 우선순위는 열린 하위 이슈 중 가장 높은 등급이다.
- 상위 이슈는 다음 작업 후보가 아니다.
- 닫힌 기능 이슈는 목표 밖의 후속 작업 때문에 다시 열지 않는다. 그 분야의 열린 상위 이슈에 연결한다.
- 중앙 리포의 여러 리포 추적 이슈(체크박스)는 상위 이슈가 아니다.
- 기존 열린 이슈는 각 리포에서 이 규칙을 처음 쓸 때 한 번 묶는다. 이 PR은 하위 리포의 기존 이슈를 직접 바꾸지 않는다.
- 연결 명령(`sub_issues` POST, `replace_parent`, `sub_issue` DELETE, `parent` 확인)은 file-control#120에서 실제로 옮기고, 떼고, 다시 붙여 확인했다.

## 검증

- `npm run check`: 결과는 PR 본문에 적는다.
