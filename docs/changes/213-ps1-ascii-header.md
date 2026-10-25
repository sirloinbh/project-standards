# .ps1 관리 파일의 머리 주석을 ASCII로 바꾸기 (#213)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/render.mjs` | `.ps1`은 ASCII 머리 주석(`HEADER_TEXT_ASCII`)을 쓴다. `hasHeader`가 두 형식을 모두 인식해 머리 주석을 두 번 붙이지 않는다 |
| `scripts/test/render.test.mjs`, `scripts/test/scripts-templates.test.mjs`, `scripts/test/templates.test.mjs` | 기대값을 고치고, 렌더된 `.ps1`이 모두 ASCII인지 검사 추가 |
| `docs/design.md` | 헤더 문구 규칙에 `.ps1` 예외 추가 |

## 이유

- workout-memo 동기화 PR(sirloinbh/workout-memo#143)의 `verify`가 `backup.ps1 is ASCII only` 테스트로 실패했다.
- 템플릿 본문은 ASCII인데, 동기화가 붙이는 머리 주석이 한글이었다. Windows PowerShell 5.1은 BOM 없는 `.ps1`을 시스템 ANSI 코드 페이지로 읽어서 한글이 깨질 수 있다(workout-memo #55).
- BOM을 붙이는 방법도 있지만, 렌더러가 LF·BOM 없는 텍스트를 기준으로 비교하고 템플릿이 이미 ASCII라서 머리 주석만 바꾸는 쪽이 작다.

## 확인

- `npm run check`: 통과.
- `npm test`: 테스트 411개 중 408개 통과, 3개 건너뜀, 실패 0.
