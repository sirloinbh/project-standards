# project-standards

`sirloinbh` 개인 앱 포트폴리오(앱 8개 + `shared-aws-infrastructure`)의 공통 표준을 한곳에서 관리하는 중앙 리포지토리.

- 언어·프레임워크, 도구 버전, 코드·Git 컨벤션, 에이전트 지침·스킬, 디렉토리 구조를 통일한다.
- 중앙 main에 병합되면 하위 리포에 동기화 PR이 열린다.
- 하위 리포에서 중앙 관리 파일을 고치면 CI가 실패하고 이 리포로 PR을 열도록 안내한다.
- 포트·도메인처럼 프로젝트마다 달라야 하는 값은 레지스트리로 따로 모아 한눈에 확인한다.

## 현재 상태

설계 검토 단계다. 요구사항은 [docs/bootstrap-prompt.md](docs/bootstrap-prompt.md), 설계안은 [docs/design.md](docs/design.md)와 [docs/adr/](docs/adr/)에 있다. 설계가 병합되면 골격을 만든다.

## 시작하기

1. 바탕화면의 `VSCode-계정B-project-standards.cmd`로 VS Code를 연다. 개인 계정(`sirloinbh`) 설정으로 열린다.
2. 터미널에서 `ghp auth status`로 `sirloinbh` 로그인을 확인한다.
3. Claude Code 또는 Codex에 "docs/bootstrap-prompt.md를 읽고 설계안을 제시해줘"라고 요청한다.
