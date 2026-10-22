# 0005. shared-aws-infrastructure의 독립 원본 승격과 예외 범위

- 상태: 제안 (이슈 #1)
- 날짜: 2026-10-22

## 맥락

- `shared-aws-infrastructure`는 Node 앱이 아니라 Terraform 리포다. 앱용 패키지, Node 버전 파일, 앱 CI는 맞지 않는다.
- 현재 원본은 `workout-memo/infrastructure/`이고, subtree push로 `shared-aws-infrastructure`에 내보낸다. 이 상태에서 중앙이 `shared-aws-infrastructure`에 동기화 PR을 직접 병합하면, 다음 subtree push 때 이력이 갈라진다.
- 이름부터 공유 인프라인데 한 앱 리포 안에 있어서, 다른 앱 7개가 이 인프라를 쓰기 시작하면 소유 관계가 어색해진다.
- Terraform state는 로컬 파일이고 remote backend가 없다.

## 결정

- `shared-aws-infrastructure`를 독립 원본으로 승격한다. workout-memo에서는 `infrastructure/`, terraform CI job, `infrastructure` remote 절차를 제거한다(design.md 9.1).
- 로컬 state 이동은 사용자가 수행한다. 이동 전에 리포 밖에 백업을 만든다. remote backend 도입은 별도 작업으로 남긴다.
- 동기화에서는 `infra` 프로필로 구분한다.
  - 적용: Git 컨벤션, 이슈·PR 템플릿, `.editorconfig`, `.gitattributes`, `.gitignore` 공통부, `AGENTS.md` 공통부, 인프라 관련 공통 스킬, 보안 기준선, `standards-check`
  - 제외: A안 패키지, Node·npm 버전 파일, 디렉토리·라우터 규칙, 앱용 CI
  - 전용 검사: `terraform fmt -check`, `terraform validate`, `bash -n`
- 동기화 PR은 `.tf`, `.tfvars`, `.sh`, `.terraform.lock.hcl`을 건드리지 않는다. PR 본문에 apply를 일으키지 않는다고 명시한다.

## 결과

- 인프라 변경 이력이 한 리포에 모인다. workout-memo의 CI와 의존성에서 Terraform이 빠진다.
- 승격 작업 중 state 파일을 잃으면 Lightsail 리소스 추적이 끊긴다. 그래서 subtree split 결과와 원격 main이 같은지 먼저 확인하고, state 백업을 만든 다음에 진행한다.
- 레지스트리의 AWS 접두어가 아직 `null`이라서, 앱과 인프라 사이의 교차 검사는 값이 생길 때부터 동작한다.
