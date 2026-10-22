# Project Standards 에이전트 지침

이 리포지토리는 `sirloinbh` 개인 앱 포트폴리오의 공통 표준(설정·컨벤션·스킬·프로젝트 고정값)을 관리하는 중앙 리포다.

## 현재 단계: 설계 전

- 요구사항 원본은 [docs/bootstrap-prompt.md](docs/bootstrap-prompt.md)다. 작업을 시작하면 이 문서를 먼저 읽고 따른다.
- 첫 작업은 설계안(`docs/design.md` 초안)과 남은 질문 목록을 사용자에게 제시하고 승인받는 것이다. 승인 전에는 골격 파일을 만들지 않는다.
- 설계가 승인되면 이 문서를 실제 운영 지침으로 갱신한다.

## 작업 절차

- 요구사항을 이슈로 등록하거나 다음 작업을 고를 때는 [std-backlog](templates/common/skills/std-backlog/SKILL.md) 스킬을 따른다.
- 이슈·브랜치·커밋·PR을 쓸 때는 [std-git-writing](templates/common/skills/std-git-writing/SKILL.md) 스킬과 `.github/`의 이슈·PR 템플릿을 따른다.
- 스킬과 템플릿의 원본은 `templates/common/`이다. `.claude/skills/`와 루트 `.github/`의 템플릿은 복제본이므로 직접 고치지 않는다. 동기화 스크립트가 생기기 전까지는 원본을 고친 뒤 복제본에 그대로 복사한다.

1. `sirloinbh/project-standards`에 이슈를 등록한다. 사용자가 지정한 기존 이슈가 있으면 재사용한다.
2. 이슈 번호를 포함한 브랜치를 만든다: `<type>/<issue-number>-<slug>`.
3. 구현·테스트·`docs/changes/<issue-number>-<slug>.md` 기록을 함께 커밋한다.
4. 커밋 전과 PR 생성·갱신 전에 관련 테스트를 실행하고 결과를 docs와 PR에 기록한다.
5. **이 리포의 PR은 에이전트가 병합한다.** `npm run check`가 통과하고 PR 본문을 템플릿대로 쓴 뒤 merge commit으로 병합하고(`pr merge --merge --delete-branch`), std-backlog 순서에 따라 다음 이슈를 진행한다. 사용자가 2026-10-22에 정한 규칙이다(#128).
   - 다음은 계속 사용자에게 먼저 확인한다: 하위 리포 PR(앱 리포 main 병합은 곧 운영 배포), `[직접]`·`needs-user` 이슈, 사전 승인 범위 밖의 패키지 설치, 이슈에 "사용자 확인"으로 적힌 결정.
   - 병합 전에 확인해 달라고 PR 본문에 적은 항목이 있으면 병합하지 않고 사용자에게 묻는다.

질문 답변·추천·읽기 전용 조사는 이슈나 브랜치를 만들지 않는다.

## 계정과 보안

- GitHub 작업은 개인 계정 `sirloinbh`로 한다. `ghp` 함수 또는 `%LOCALAPPDATA%/gh-workout-memo/gh-project.ps1`을 사용하고, 기본 `gh`(회사 계정)로 원격 변경을 하지 않는다.
- Git 인증은 리포 로컬 credential helper(`gh-project.ps1 auth git-credential`)가 담당한다. 커밋 작성자는 `~/.gitconfig-personal`이 원격 URL 기준으로 자동 적용한다.
- npm 패키지 설치·삭제·`npx` 실행은 사용자의 명시적 재확인 없이 하지 않는다. 자세한 조건은 bootstrap-prompt의 "보안 제약"을 따른다.
- `.env` 값, 토큰, GitHub App 개인키, Terraform state, 백업은 커밋하거나 docs·PR·로그에 기록하지 않는다.
- 하위 프로젝트 리포에 직접 push하지 않는다. 하위 리포 변경은 각 리포의 이슈·PR 절차를 따른다.
- 사용자 변경을 덮어쓰지 않는다. 필요한 파일만 명시해서 stage한다.

## 응답

- 사용자에게 하는 설명과 문서는 한국어로 쓴다.
