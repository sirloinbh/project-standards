## 로컬 브랜치는 git CLI로 관리

모든 프로젝트의 로컬 Git 브랜치는 git CLI로 관리한다. 원본 규칙은 `sirloinbh/project-standards`의 std-git-writing 스킬 "로컬 브랜치 관리 (git CLI)"이다.

- 작업 시작: `git status`로 현재 브랜치와 작업 트리를 확인한 뒤 `git fetch origin`, `git switch --create <브랜치> origin/main` 순서로 만든다. 로컬 main은 건드리지 않는다.
- 병합 후 정리: PR 병합을 확인한 뒤 `git switch main`, `git pull --ff-only`, `git branch --delete <브랜치>`, `git fetch --prune origin` 순서로 실행한다.
- 커밋하지 않은 변경이 있거나, 지울 브랜치가 병합되지 않았거나, 다른 세션이나 worktree가 쓰고 있거나, `git pull --ff-only`가 실패하면 멈추고 사용자에게 알린다.
- `git branch --delete`가 거부되면 `--force`나 `-D`로 바꾸지 않고 이유를 보고한다.
- 폴더 잠금으로 git이 다시 시도할지 물으면 `n`으로 끝내고, 같은 명령을 반복하지 않는다. `git branch --list <브랜치>`로 결과를 확인해 보고한다.
- `git branch -D`, `git reset --hard`, `git clean`, `git stash`, `git rebase`는 사용자가 요청하고 승인한 경우에만 쓴다. 강제 push와 main 직접 push는 하지 않는다.
- `pr merge`에 `--delete-branch`를 붙이지 않는다.
