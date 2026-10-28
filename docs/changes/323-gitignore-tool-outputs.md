# #323 공통 .gitignore에 테스트 산출물과 개인 설정 파일 추가

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.gitignore.tmpl` | 중앙 구간에 7개 추가: `.claude/settings.local.json`, `*.tfvars`, `test-results/`, `playwright-report/`, `blob-report/`, `coverage/`, `*.tsbuildinfo` |
| `scripts/test/templates.test.mjs` | study-log 기준 차이에 7개를 의도한 차이로 추가 |

## 정한 것

- 공통 템플릿이라 앱 8개와 shared-aws-infrastructure가 모두 받는다. 확인한 리포 가운데 이 패턴에 맞는 파일을 커밋한 곳은 없다. 인프라 리포의 `terraform.tfvars.example`은 `*.tfvars`에 걸리지 않는다.
- workout-memo와 shared-aws-infrastructure는 같은 줄을 `# --- project ---` 아래에 이미 적어 두었다. 겹쳐도 동작은 같으므로 동기화가 들어간 뒤 앱 리포에서 지우면 된다(필수 아님).
  - workout-memo: `test-results/`, `playwright-report/`, `blob-report/`, `coverage/`, `*.tsbuildinfo`, `*.tfvars`, `.claude/settings.local.json`
  - shared-aws-infrastructure: `*.tfvars`

## 검증

- `npm test`: 491개 중 490개 통과, 1개 건너뜀, 실패 0
- `npm run sync:preview`: 9개 리포 `.gitignore` 중앙 구간에 7개가 들어감
