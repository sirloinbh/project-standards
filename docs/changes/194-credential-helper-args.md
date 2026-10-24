# #194 인증 경로 변경 명령 고치기 (경로, 배열 인자, ToolsDir 기본값)

## 변경

| 파일 | 내용 |
|---|---|
| `tools/set-credential-helper.ps1` | 리포를 쉼표로 이어 한 문자열(`-Repository a,b`)로 받는다. `-ToolsDir` 기본값을 본문에서 정한다. Windows PowerShell 5.1에서 헬퍼 문자열의 큰따옴표를 이스케이프하고, 헬퍼의 `gh-project.ps1` 경로를 따옴표로 감싼다. `git config`가 실패하면 멈춘다 |
| `docs/tools.md` | 옮기는 절차를 리포 상위 폴더 변수 `$base` 하나로 바꿨다. 특정 사용자 이름이 들어간 경로를 지웠다. 1단계의 `git switch main; git pull`은 Fork에서 하도록 바꿨다. 2단계와 되돌리기는 `-Repository ($repos -join ',')`를 쓴다. 3단계에 공개 리포의 `fetch`는 인증 확인이 되지 않는다는 점을 적었다 |
| `scripts/test/tools.test.mjs` | 설치 폴더(공백 포함)에 복사한 스크립트를 `-File`로, `-ToolsDir` 없이, 리포 2개를 쉼표로 넘겨 실행하는 검사를 추가했다. 이 검사는 고치기 전 스크립트에서 실패한다. ASCII 검사 목록에 `set-credential-helper.ps1`을 넣었다 |

## 원인 (#21 진행 중 재현)

- **배열 인자:** `powershell -File script.ps1 -Repository $repos`는 배열을 공백으로 나뉜 인자 여러 개로 넘긴다. 두 번째 경로부터는 위치 인자로 처리되어 실패한다. `ValueFromRemainingArguments`는 이름 붙은 매개변수 뒤의 값을 모으지 않아서(5.1에서 확인) 쉼표 구분 방식을 택했다.
- **`-ToolsDir` 기본값:** `[Parameter()]` 속성이 있는 스크립트를 5.1에서 `-File`로 실행하면, 매개변수 기본값의 `$PSScriptRoot`가 빈 문자열이다. 본문에서는 정상 값이 나온다. 기존 테스트는 항상 `-ToolsDir`를 넘겨서 이 경우를 잡지 못했다.
- **따옴표:** 경로를 따옴표로 감싸려고 하니 5.1이 인자 안의 큰따옴표를 이스케이프하지 않았다. 그래서 `git config`가 `wrong number of arguments`로 실패했다. 그런데도 스크립트는 종료 코드를 보지 않고 `after:`를 출력했다. 이스케이프와 종료 코드 확인을 함께 넣었다.
- `install.ps1`, `agents.ps1`, `project-terminal.ps1`은 `$PSScriptRoot`를 본문에서만 써서 이 문제가 없다.

## 정한 것

- 경로를 따옴표로 감싸는 것은 이슈 할 일에는 없었다. 새 검사가 공백이 있는 설치 폴더를 쓰면서 드러나 함께 고쳤다. 이미 바꾼 10개 리포의 헬퍼(따옴표 없음, 공백 없는 경로)는 그대로 동작하므로 다시 실행하지 않아도 된다.
- 쉼표가 들어간 리포 폴더 경로는 지원하지 않는다.

## 검증

- `node --test scripts/test/tools.test.mjs`: 14개 통과. 새 검사는 `origin/main`의 스크립트로 바꾸면 실패한다.
- `npm run check` 통과(테스트 393개 중 392개 통과·1개 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows).
- 이 PC에서 직접 확인: 공백이 있는 임시 설치 폴더의 스크립트로 임시 리포 2개를 바꿨다. 이어서 `GIT_TRACE=1 git credential fill`로 Git이 따옴표로 감싼 경로를 한 인자로 실행하고 자격 증명을 받는 것을 확인했다. 토큰 값은 기록하지 않았다.
