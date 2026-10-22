# 0002. 동기화 인증에 GitHub App 사용

- 상태: 제안 (이슈 #1)
- 날짜: 2026-10-22

## 맥락

중앙 워크플로가 9개 하위 리포에 브랜치를 만들고 PR을 열어야 한다. `GITHUB_TOKEN`은 자기 리포에만 쓸 수 있다. 개인 PAT는 사용자 계정 전체 권한을 오래 가지고 있게 되어, 유출되면 피해 범위가 크다.

## 결정

- GitHub App `project-standards-sync`를 만들고 대상 리포에만 설치한다.
- 권한: Contents write, Pull requests write, Metadata read, **Workflows write**.
  - Workflows 권한은 요구사항(bootstrap-prompt)의 3종에 추가한 것이다. 동기화 대상에 `.github/workflows/ci.yml`이 있고, GitHub는 이 권한이 없는 토큰으로 워크플로 파일을 바꾸는 push를 거부한다.
- 개인키는 중앙 리포 secret에만 둔다. 실행할 때마다 1시간짜리 설치 토큰을 발급한다. JWT 서명은 외부 Action 없이 `node:crypto`로 구현한다.
- App 생성, 설치, 키 교체는 사용자가 직접 수행한다.

## 결과

- 토큰 수명이 짧고, 권한은 설치된 리포로 제한된다.
- PR 작성자가 App 봇으로 표시되므로 사람이 만든 PR과 구분된다.
- Workflows 권한 때문에, App 키가 유출되면 대상 리포의 워크플로를 바꿀 수 있다. 키는 중앙 secret에만 두고 교체 절차를 문서화한다. 하위 리포 main에는 브랜치 보호를 걸어 사용자 병합 없이는 반영되지 않게 한다.
