# #115 maxRollout을 3으로 올리기

사용자가 2026-10-26에 승인했다. 선행 이슈 #114(앱 7개 lockfile 갱신·동기화 PR 병합), #93(인프라 리포 정비), #71(CI 워크플로)이 닫혔다.

## 변경

| 파일 | 내용 |
|---|---|
| `sync.config.json` | `maxRollout` 2 → 3. 이 PR이 main에 병합되면 `sync.yml`이 `shared-aws-infrastructure`에 동기화 PR을 연다 |
| `scripts/test/sync.test.mjs` | 인프라 리포가 계획에 들어가는 것으로 기대값을 바꾸고, 계획에 Terraform·셸 파일(`*.tf`, `*.tfvars`, `*.sh`, `.terraform.lock.hcl`)이 없는지 검사 |
| `AGENTS.md`, `README.md` | 현재 단계 설명을 `maxRollout` 3 기준으로 고침 |

## 정한 것

- 인프라 동기화 PR은 `infra` 프로필(공통·인프라 템플릿, `reusable-infra-ci.yml`)만 반영하고 `neverTouch` 경로는 건드리지 않는다. `terraform apply`는 일어나지 않는다(ADR-0005).
- 인프라 동기화 PR은 사용자가 병합한다. 에이전트는 보호 경로가 바뀌지 않았는지 검토해 #115에 적는다.

## 검증

- `npm run check`: 통과(테스트 413개 중 412개 통과, 1개 건너뜀, 실패 0)
- `node scripts/sync.mjs --dry-run --target sirloinbh/shared-aws-infrastructure`: 파일 24개(`.claude`·`.codex` 훅과 스킬, `.github` 템플릿·`ci.yml`, `.standards/`, 편집기 설정, `skills/std-*`). Terraform·셸 파일 없음
