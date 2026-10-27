# #290 CodeQL 중앙 리포 알림 정리

## 알림과 처리

| 알림 | 위치 | 처리 |
|---|---|---|
| `js/incomplete-sanitization` (high) | `scripts/lib/compliance.mjs` `cell()` | 고침. 표 칸에서 `\`를 먼저 이스케이프한 뒤 `|`를 이스케이프한다. 값이 `\`로 끝나면 다음 칸 구분자 `|`가 이스케이프되어 표가 깨질 수 있었다 |
| `js/incomplete-url-substring-sanitization` (high) | `scripts/test/deploy-templates.test.mjs` (PR #293에서 새로 생김) | 고침. "출력에 신호 주소가 없다"를 URL 문자열 포함 여부로 검사해서 URL 검증으로 읽혔다. 주소의 UUID로 검사한다 |
| `js/shell-command-injection-from-environment` (medium) | `scripts/test/tools.test.mjs` | 닫음 ("used in tests"). Windows 전용 테스트가 직접 만든 임시 경로를 `cmd.exe`에 넘긴다. 사용자 입력이 들어갈 길이 없다 |

`js/missing-rate-limiting`(스캐폴드 health 라우트)은 앱 API 전체 문제라 #291에서 다룬다.

## 경위

PR #293은 CodeQL 검사가 새 알림 1개로 실패했는데, 검사 결과를 확인하기 전에 병합 명령이 실행되어 병합됐다. 중앙 리포에 브랜치 보호가 없어서 막히지 않았다. 앞으로 에이전트는 `pr checks --watch`가 모두 통과(종료 코드 0)했을 때만 병합한다.

## 검증

- `node --test scripts/test/compliance.test.mjs scripts/test/deploy-templates.test.mjs`: 29개 중 28개 통과, 1개 건너뜀(python3 없음, 기존 테스트)
- `npm run check`: 테스트 461개 중 460개 통과, 1개 건너뜀, 실패 0
