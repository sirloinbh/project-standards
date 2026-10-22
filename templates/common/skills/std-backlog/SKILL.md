---
name: std-backlog
description: Register requirements as small GitHub issue cards with priority and characteristic labels, and choose the next issue to implement after the previous PR is merged. Use when the user gives one or more requirements to register or plan, when a requirement is added mid-work, and when deciding what to start next. Applies to every sirloinbh project repository. Leave all PR merging to the user.
---

<!-- 중앙 관리 파일. 수정은 sirloinbh/project-standards의 templates/common/skills/std-backlog/에서 -->

# 이슈 세분화·우선순위·다음 작업 선택

요구사항을 GitHub Issue(이슈카드)로 등록하고, 다음에 구현할 이슈를 고르는 절차다. 구현 자체는 각 리포의 구현 스킬과 `AGENTS.md` 작업 절차를 따른다. GitHub 작업은 `ghp` 또는 `gh-project.ps1` 래퍼로 하고, 계정은 `sirloinbh`인지 먼저 확인한다.

## 규칙

1. 요구사항을 이슈카드로 등록할 때는 작은 단위로 세분화한다.
2. 각 이슈의 우선순위를 정하고 라벨(뱃지)로 단다.
3. 각 이슈의 특성을 정하고 라벨(뱃지)로 단다.
4. 이전 요구사항의 구현과 PR 병합이 끝나면, 추가 요구사항이 있으면 그 우선순위를 올려 먼저 진행한다. 없으면 다음 우선순위 이슈의 구현에 착수한다.

## 1. 세분화 기준

다음 조건을 모두 만족할 때까지 나눈다.

- PR 하나로 끝난다. 한 이슈가 여러 리포를 바꿔야 하면 리포별로 나눈다.
- 완료 조건을 테스트, 명령 결과, 파일 존재처럼 확인할 수 있는 문장으로 쓸 수 있다.
- 조사와 구현을 섞지 않는다. 결론이 정해지지 않은 일은 `type/research` 이슈로 먼저 등록한다.
- 사용자가 직접 해야 하는 단계(App 생성, secret 등록, 계정 설정, state 이동, 패키지 설치 승인)는 별도 이슈로 빼고 `needs-user`를 단다.
- 문서 규칙을 정하는 일과 그 규칙을 검사·자동화하는 일을 나눈다.

등록하기 전에 같은 리포의 열린 이슈를 검색해서 중복을 만들지 않는다. 사용자가 지정한 기존 이슈가 있으면 재사용한다.

## 2. 우선순위 라벨 (하나만)

| 라벨 | 기준 |
|---|---|
| `priority/P0` | 작업 중 사용자가 추가한 요구사항(규칙 4로 승격된 것), 또는 운영·보안상 즉시 막아야 하는 문제 |
| `priority/P1` | 다른 이슈의 선행 조건이거나, 이미 여러 리포에 중복된 것을 정리하는 일 |
| `priority/P2` | 보안·운영 기준을 세우는 일 |
| `priority/P3` | 곧 필요해질 공통화, 지금 한 리포에만 있는 기능의 확산 |
| `priority/P4` | 문서·규칙 정리, 하면 좋은 개선 |

우선순위를 판단할 근거가 부족하면 P3로 등록하고, 이슈 본문에 판단 근거가 부족하다고 적는다.

## 3. 특성 라벨

- `type/*` (하나만): `feature`(새 기능·새 관리 대상), `docs`(문서·규칙), `security`(보안 기준·차단·점검), `chore`(이전·정리·설정 변경), `research`(조사, 코드 변경 없음)
- `area/*` (하나 이상): `templates`, `tooling`, `compliance`, `registry`, `scaffold`, `ci`, `deploy`, `agent`
- 해당되면 추가로: `needs-user`(사용자 직접 단계 포함), `origin/added`(작업 중 추가된 요구사항)

리포에 라벨이 없으면 sirloinbh/project-standards와 같은 이름·색·설명으로 만든다(`label create ... --force`). 새 라벨 종류가 필요하면 먼저 중앙 리포에 이슈를 연다.

## 4. 이슈 본문 형식

본문은 UTF-8 임시 파일로 쓰고 `--body-file`로 등록한다. 토큰과 비밀값은 넣지 않는다.

```
## 배경
왜 필요한지. 근거 파일·문서 경로.

## 할 일
- 바꿀 파일과 내용

## 완료 조건
- 확인할 수 있는 문장 (테스트, 명령 결과, 파일 존재)

## 선행 조건
- #번호 또는 "없음". 사용자 단계면 무엇을 해야 하는지
```

## 5. 다음 작업 선택

PR을 만든 뒤에는 사용자가 병합할 때까지 기다린다. 다음 작업을 고를 때는 다음 순서를 따른다.

1. 이전 PR이 병합됐는지 확인한다(`pr view <번호> --json state,mergedAt`). 병합되지 않았으면 다음 이슈 구현을 시작하지 않는다. 사용자가 병렬 진행을 지시한 경우는 예외다.
2. 작업 중 사용자가 추가한 요구사항이 있는지 확인한다.
   - 대화에서 받았지만 아직 등록하지 않은 요구사항은, 이 스킬의 세분화 규칙대로 등록하고 `origin/added`를 단다.
   - 열린 `origin/added` 이슈 중 `priority/P0`이 아닌 것은 P0로 올린다. 기존 우선순위 라벨을 지우고 P0을 단다. 이슈에 승격 사유를 댓글로 남긴다.
3. 착수할 이슈를 고른다.
   - 열린 이슈 중 선행 조건이 모두 끝났고(선행 이슈가 닫힘), 사용자 단계가 남아 있지 않은 이슈만 후보로 삼는다.
   - 후보 중 우선순위 숫자가 가장 작은 것을 고르고, 같으면 번호가 작은(먼저 등록된) 것을 고른다.
   - `needs-user` 이슈가 가장 앞이면, 사용자에게 할 일을 안내한다. 기다리는 동안에는 그 이슈에 묶이지 않은 다음 후보를 진행한다.
4. 고른 이슈와 그 이유(우선순위, 선행 조건 상태)를 사용자에게 한 줄로 알리고, 구현 스킬의 절차로 착수한다.
5. 후보가 없으면 남은 이슈가 무엇에 막혀 있는지 정리해서 보고하고 멈춘다.

PR 병합, 자동 병합, 승인으로 병합을 대신하는 일은 하지 않는다.
