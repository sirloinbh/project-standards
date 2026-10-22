# #165 로컬 에이전트 워커를 tools/agents로 옮기고 리포 고정값 분리하기

## 변경

| 파일 | 내용 |
|---|---|
| `tools/agents/*.mjs` | workout-memo `scripts/agents/` 9개를 옮겼다. 상태 전이·잠금·해시 보호·가림 처리·모델 배정·npm 경로 선택·출력 요약은 그대로 두었다 |
| `tools/agents/config.mjs` (새 파일) | `origin` 주소 해석, 레지스트리 허용 목록, 리포 설정 `.agents.json` 검사 |
| `tools/agents/cli.mjs` | `--root <폴더>`로 대상 리포를 받는다. 리포 이름은 `origin`에서 읽고, `gh-project.ps1`은 설치 폴더의 것을 쓴다. 검사 스크립트·DB 사전검사·브라우저 검증 인자·자동 병합을 `.agents.json`에서 읽는다 |
| `tools/agents/workflow.mjs` | 이슈 URL을 대상 리포 기준으로 검사한다. 브랜치를 `<type>/<번호>-<영문-요약>`, 변경 기록을 `docs/changes/<번호>-<영문-요약>.md`로 만든다 |
| `tools/agents/optimization.mjs` | DB 사전검사의 테이블·컬럼 5개 하드코딩을 설정값으로 바꿨다. 설정이 없으면 스키마 검사를 건너뛴다 |
| `scripts/test/agent-*.test.mjs` | workout-memo 테스트 10개를 옮기고 경로·픽스처를 고쳤다 |
| `scripts/test/agent-repos.test.mjs` (새 파일) | 설정이 다른 가짜 리포 2개로 큐 등록부터 호스트 검사까지, 미등록 리포 거부, 설정 오류, 소스에 리포 값이 없음 |
| `package.json`, `.github/workflows/agents.yml` | `test:agents` 추가. Windows CI에서 실행한다(Linux는 `ci.yml`의 `npm run check`가 같은 테스트를 포함) |
| `docs/tools.md`, `docs/design.md` | 실행 방법·`.agents.json` 형식, "중앙 도구는 하위 리포에 복사하지 않는다" 분류 |

## 결정

- **리포 설정 파일:** 리포 루트의 `.agents.json`(커밋)으로 정했다. 자동 병합 허용 여부는 기록으로 남아야 하기 때문이다(#38 권장안). PC별 값(`codexExecutable`, `npmCli`, `browserExecutable`)은 지금처럼 `.local/agent-workflow/config.json`에 둔다.
- **자동 병합 기본값:** `false`. `autoMerge`가 정확히 `true`일 때만 병합한다. 꺼져 있으면 CI 통과 후 PR을 ready로 바꾸고 작업을 끝낸다.
- **모르는 키는 실패:** `automerge`처럼 잘못 쓴 키가 조용히 무시되면 정책이 의도와 다르게 적용되므로, 설정 오류면 어떤 명령도 실행하지 않는다.
- **검사 명령:** 셸 명령 대신 npm 스크립트 이름(`checkScript`)만 받는다. 워커는 셸을 거치지 않고 실행하는 원칙을 지킨다.
- **브랜치 종류:** `--task-kind documentation`이면 `docs`, 아니면 `feat`. 영문 요약은 `--slug`로 주고, 없으면 제목의 영문 단어로 만든다. 한글 제목만 있으면 `agent-task`가 된다.
- **이전 작업 호환:** 이미 큐에 있는 작업은 저장된 브랜치와 `docs/changes/<번호>-agent-task.md`를 그대로 쓴다.
- **CI 검사 이름 `verify`:** 중앙 reusable CI의 작업 이름이라 그대로 두었다.
- **옮기지 않은 것:** `scripts/agents.ps1`과 그 PowerShell 경계 테스트 2개는 실행기 이슈(#166)에서 다시 만든다. workout-memo 쪽 사본은 #167에서 지운다.
- **레지스트리 위치:** `tools/agents/` 기준 `../../registry/`(이 리포) 또는 `../registry/`(설치본). 설치본에 레지스트리를 함께 넣는 일은 #166에서 한다.

## 검증

- `npm run test:agents`(Windows): 185개 모두 통과. Linux에서는 Windows 전용 npm 경로 검사 1개를 건너뛴다.
- `npm run check`: 통과(결과는 PR 본문).
- `grep -rn "workout-memo\|brands" tools/agents`: 0건.
