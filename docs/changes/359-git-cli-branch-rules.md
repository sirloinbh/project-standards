# #359, #360 Fork 앱 규칙을 없애고 git CLI 브랜치 규칙으로 바꾸기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/skills/std-git-writing/SKILL.md`, `.claude/skills/std-git-writing/SKILL.md` | "로컬 브랜치 관리 (Fork 앱)" 절을 "로컬 브랜치 관리 (git CLI)"로 교체. 작업 시작, 병합 후 정리, 멈추는 조건, 쓰지 않는 명령을 적었다 |
| `AGENTS.md` | `--delete-branch`를 쓰지 않는 이유를 git CLI 정리 절차로 변경 |
| `docs/tools.md`, `docs/user-steps.md` | Fork 안내를 git 명령으로 변경 |
| `docs/research/multi-repo-tools.md`, `tools/repos.mjs` | Fork 언급 제거. `repos.mjs`는 주석만 바뀌고 동작은 같다 |

## 정한 것

- 사용자가 2026-10-31에 Fork 앱 규칙(#192)을 취소하고 git CLI로 바꾸기로 했다.
- 에이전트가 병합 후 정리까지 직접 한다: `git switch main`, `git pull --ff-only`, `git branch -d <브랜치>`, `git fetch --prune origin`.
- 사용자가 따로 정하지 않은 항목은 지금 규칙을 유지했다.
  - `git stash`, `git rebase`, `git reset --hard`, `git clean`, `git branch -D`는 사용자가 요청하고 승인한 경우에만 쓴다.
  - `pr merge --delete-branch`는 쓰지 않는다. 원격 브랜치는 리포 설정이 지운다.
- `git branch -d`가 거부하면 `-D`로 바꾸지 않는다. merge commit으로 병합한 브랜치는 최신 main 기준으로 `-d`가 통과한다.
- OneDrive 폴더 잠금(#192에서 Fork를 택한 이유 중 하나)은 재시도 질문에 `n`으로 끝내고 결과를 보고한다.
- `docs/changes/`는 당시 기록이라 고치지 않았다.

## 검증

- `npm run check` 결과는 PR 본문에 적는다.
- `git grep -n -i fork -- . ':!docs/changes'`로 브랜치 규칙이나 안내가 남지 않았는지 확인한다.
