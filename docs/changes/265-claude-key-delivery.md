# #265 공용 Claude API 키를 서버·로컬에 전달하는 도구

## 결정 (ADR-0010)

- 원본은 AWS SSM `/sirloinbh/anthropic-api-key` 하나다.
- 서버는 배포할 때마다 SSM에서 읽어 compose에 환경변수로 넘긴다. 서버 `.env`에는 값을 두지 않는다.
- PC는 중앙 명령이 개인 AWS 프로필로 읽어 앱 `.env`에 넣는다.
- CI에는 키를 두지 않는다.

## 변경

| 파일 | 내용 |
|---|---|
| `registry/projects.schema.json`, `registry/projects.json` | `features.claude` 추가 (study-log만 `true`) |
| `templates/app/deploy/ssm-get.sh.tmpl` | `curl --aws-sigv4`로 SSM `GetParameter` 호출, 값만 표준 출력. 키 쌍은 표준 입력으로, 이름 형식 검사 |
| `templates/app/deploy/remote-deploy.sh.tmpl` | `features.claude` 앱이고 서버 `.env`에 `SECRETS_AWS_ACCESS_KEY_ID`가 있으면 SSM에서 `ANTHROPIC_API_KEY`를 읽어 export. 실패하면 경고만 남기고 `.env` 값 사용 |
| `tools/app-secrets.mjs` | `set`(표준 입력 → 임시 파일 → `put-parameter`), `check`(있음/없음만), `pull`(앱 `.env`에 넣기) |
| `scripts/test/app-secrets.test.mjs`, `scripts/test/deploy-templates.test.mjs` | 가짜 AWS CLI·curl로 동작과 값 비노출 확인 |
| `docs/tools.md`, `docs/runbooks/deploy.md`, `docs/user-steps.md` | 사용법, 서버 `.env` 키, 사용자 단계 10 |

SSM 파라미터와 읽기 전용 IAM 사용자는 sirloinbh/shared-aws-infrastructure#8에서 만든다.

study-log `backend/src/translation.ts`가 모델 이름을 코드에 두고 있다(`claude-sonnet-5-5`). 공통 규칙(`CLAUDE_MODEL`)으로 바꾸는 일은 study-log 리포 작업이라 이 PR에 넣지 않았다.

## 검증

- `node --test scripts/test/app-secrets.test.mjs`: 7개 통과
- `node --test scripts/test/deploy-templates.test.mjs`: 16개 중 15개 통과, 1개 건너뜀(python3 없음, 기존 테스트)
- `npm run check`: 테스트 439개 중 438개 통과, 1개 건너뜀, 실패 0
