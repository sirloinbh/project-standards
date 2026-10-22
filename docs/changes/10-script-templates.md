# #10 PowerShell 스크립트 템플릿 (gh-project, backup, push-repositories)

## 차이 분석 (origin/main 기준, 2026-10-22)

| 스크립트 | 8개 앱 비교 | 처리 |
|---|---|---|
| `scripts/gh-project.ps1` | 8개 동일 | 그대로 템플릿 |
| `scripts/claude-skills.mjs` | 8개 동일 | 그대로 템플릿 (design.md 분류표의 관리 대상) |
| `scripts/backup.ps1` | 7개 동일, workout-memo만 다름 | **workout-memo 버전을 기준으로 함** (아래) |
| `scripts/push-repositories.ps1` | 7개 동일, workout-memo는 `infrastructure` 한 줄 더 | 7개 앱 버전 기준. 인프라 원본을 옮긴 뒤(#93, #94)에는 workout-memo도 같아진다 |

## backup.ps1: 한국어 깨짐 버그 수정

workout-memo는 #55에서 백업이 한국어를 깨뜨리는 문제를 이미 고쳤다. `pg_dump` 출력을 Windows PowerShell에서 받으면 콘솔 코드 페이지(CP949)로 해석되어 한국어가 깨진다. 그래서 컨테이너 안에 파일로 쓴 뒤 `docker compose cp`로 그대로 복사하는 방식으로 바꿨다.

나머지 7개 앱은 아직 출력을 받는 예전 방식이라 같은 버그가 있다. 템플릿을 workout-memo 버전으로 만들었으므로, 첫 동기화 때 7개 앱도 이 수정을 받는다. 백업 파일 이름 앞부분은 프로젝트 이름(`{{project.name}}-`)이다. workout-memo는 `workout-…`에서 `workout-memo-…`로 바뀐다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/scripts/gh-project.ps1`, `claude-skills.mjs` | 원본 그대로, 관리 헤더만 추가 |
| `templates/app/scripts/backup.ps1` | 프로젝트 이름 주입 |
| `templates/app/scripts/push-repositories.ps1` | subtree 리포 이름 3개를 레지스트리에서 주입 |
| `scripts/test/scripts-templates.test.mjs`, 스냅샷 | 테스트 3개, 하위 리포 파일 목록에 앱마다 4개 추가 |

## 검증

- `npm run check`: 테스트 126개 통과
- 백업 파일 위치(`backups/`)는 공통 `.gitignore`에 있어 커밋되지 않음을 테스트로 확인했다.

## CI에서 발견한 문제

첫 PR CI에서 테스트 1개가 실패했다. `.gitattributes`가 `*.ps1`을 CRLF로 체크아웃하는데, 렌더링 결과는 LF로 만들기 때문에 원문과 그대로 비교하면 달랐다. 동기화와 해시 비교는 원래 줄바꿈을 무시하므로 기능 문제는 아니고, 테스트만 LF로 맞춰 비교하도록 고쳤다. 로컬에서 CRLF 체크아웃을 재현해 고친 테스트가 통과하는 것을 확인했다.
