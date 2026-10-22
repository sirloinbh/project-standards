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
| `versions.json`, `versions.schema.json`, `scripts/check-workflows.mjs` | 고정 Windows 러너 `windowsRunner: windows-2025`를 추가하고, 워크플로 검사가 `runner`와 함께 이것도 허용한다(#143의 러너 고정 규칙) |
| `docs/tools.md`, `docs/design.md` | 실행 방법·`.agents.json` 형식, "중앙 도구는 하위 리포에 복사하지 않는다" 분류 |

## 사용자 결정 (2026-10-22)

PR #177 검토에서 사용자가 정했다. 남은 확인 항목은 없다.

- **리포 설정 파일:** 리포 루트에 커밋하는 `.agents.json`. PC별 값(`codexExecutable`, `npmCli`, `browserExecutable`)은 지금처럼 `.local/agent-workflow/config.json`에 둔다.
- **자동 병합 기본값:** `true`. CI 통과 후 병합하고, `.agents.json`에 `"autoMerge": false`가 있을 때만 PR을 ready로 바꾸고 병합은 사용자에게 맡긴다. main 병합이 곧 운영 배포인 리포는 `false`로 끌 수 있다.
- **브랜치 종류:** `feat`, `fix`, `docs`, `chore` 네 가지. `--branch-type`으로 고르고, 없으면 `--task-kind documentation`일 때 `docs`, 그 밖에는 `feat`이다. 영문 요약은 `--slug`로 주고, 없으면 제목의 영문 단어로 만든다. 한글 제목만 있으면 `agent-task`가 된다.
- **검사 명령:** 셸 명령 대신 npm 스크립트 이름(`checkScript`)만 받는다. 워커는 셸을 거치지 않고 실행하는 원칙을 지킨다.
- **Windows 러너:** `versions.json`의 `windowsRunner`(`windows-2025`)로 고정한다.
- **실행기:** `scripts/agents.ps1`과 그 PowerShell 경계 테스트 2개는 #166에서 다시 만든다. 설치본에 레지스트리를 넣는 일도 #166에서 하고, workout-memo 쪽 사본은 #167에서 지운다.

## 구현 메모

- **모르는 키는 실패:** `automerge`처럼 잘못 쓴 키가 조용히 무시되면 정책이 의도와 다르게 적용된다. 그래서 설정 오류가 있으면 어떤 명령도 실행하지 않는다.
- **이전 작업 호환:** 이미 큐에 있는 작업은 저장된 브랜치와 `docs/changes/<번호>-agent-task.md`를 그대로 쓴다.
- **CI 검사 이름 `verify`:** 중앙 reusable CI의 작업 이름이라 그대로 두었다.
- **레지스트리 위치:** `tools/agents/` 기준 `../../registry/`(이 리포) 또는 `../registry/`(설치본).

## 검증

- `npm run test:agents`(Windows): 190개 모두 통과. Linux에서는 Windows 전용 npm 경로 검사 1개를 건너뛴다.
- `npm run check`(#175·#176이 들어간 main 병합 후, Windows): 테스트 383개 중 382개 통과, 1개 건너뜀(기존 OS 전용 검사). 나머지 검사 모두 통과.
- PR CI: 첫 실행은 main의 러너·Action 고정(#143)과 setup-node 자동 캐시(lockfile 없음) 때문에 실패했다. 고친 뒤 Linux `check`, Windows `windows` 모두 통과했다.
- `grep -rn "workout-memo\|brands" tools/agents`: 0건.
