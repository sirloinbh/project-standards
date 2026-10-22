# #166 에이전트 워커 설치와 리포 지정 실행기 만들기 (install.ps1, agents.ps1)

## 변경

| 파일 | 내용 |
|---|---|
| `tools/agents.ps1` (새 파일) | workout-memo `scripts/agents.ps1`의 명령 12개를 그대로 받고 `-Root <리포 폴더>`를 더했다. 리포가 아니면 아무것도 만들지 않고 멈춘다. #165에서 생긴 `-BranchType`, `-Slug`도 넘긴다 |
| `tools/install.ps1` | `agents.ps1`, `agents/*.mjs`, `registry/projects.json`, `versions.json`도 설치한다. 바뀐 파일만 `.bak-<시각>`으로 백업하는 방식은 그대로다 |
| `scripts/test/agent-repos.test.mjs` | 임시 폴더에 설치한 실행기로 가짜 리포 두 곳의 `status`가 각자의 큐만 보여 주는지, 리포가 아닌 폴더 거부, `-Root`·`-BranchType`·`-Slug` 전달 (Windows 전용) |
| `scripts/test/agent-runtime.test.mjs` | #165에서 미뤄 둔 PowerShell→Node 경계 테스트 2개(`enqueue -TaskKind`, `diagnose`)를 다시 넣었다 |
| `scripts/test/tools.test.mjs` | 설치 대상에 워커·레지스트리·`versions.json`이 들어가는지, 바뀐 워커 파일을 백업하는지, `.ps1` 2개가 ASCII만 쓰는지 |
| `docs/tools.md` | 설치 폴더 구성, 실행 명령, `.agents.json` 예시(DB 사전검사 없음/있음), 되돌리기 |

## 구현 메모

- **Node 선택:** 대상 리포의 `.local\node-v<versions.json의 node>-win-x64\node.exe`, 없으면 PATH의 `node.exe`. 버전이 다르면 경고만 하고 계속한다. 경고는 표준 오류로 보내서 `status`의 JSON 출력을 깨지 않는다.
- **versions.json과 레지스트리 위치:** 설치본은 실행기 옆, 이 리포에서는 `tools/` 한 단계 위. 워커의 레지스트리 탐색(#165)과 같은 규칙이다.
- **`CODEX_HOME`:** 비어 있으면 `project-terminal.ps1`과 같은 `%LOCALAPPDATA%\Codex-Account-B`.
- **종료 코드:** Node CLI의 종료 코드를 그대로 돌려준다. 오류 메시지는 CLI가 이미 표준 오류에 쓴다.
- **ASCII 전용:** Windows PowerShell 5.1은 BOM 없는 `.ps1`을 ANSI 코드 페이지로 읽으므로 실행기와 설치 스크립트에 한글을 쓰지 않는다.
- **지운 파일:** 원본에서 지운 워커 파일은 설치 폴더에 남는다. 설치본을 지우는 동작은 넣지 않았다(기존 "지우지 않고 백업만" 원칙).

## 이후 할 일

- 실제 PC 설치는 사용자가 한다(#21과 같은 절차, `docs/tools.md`).
- workout-memo의 `scripts/agents.ps1`, `scripts/agents/` 사본 제거와 전환은 #167.

## 검증

- `node --test scripts/test/agent-repos.test.mjs`: 25개 통과(새 Windows 검사 3개 포함).
- `node --test --test-name-pattern=PowerShell scripts/test/agent-runtime.test.mjs`: 경계 테스트 2개 통과.
- `node --test scripts/test/tools.test.mjs`: 13개 통과.
- `npm run check`(Windows): 테스트 390개 중 389개 통과, 1개 건너뜀(기존 OS 전용 검사). 나머지 검사 모두 통과.
