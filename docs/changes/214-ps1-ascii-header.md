# #214 PowerShell 관리 헤더를 ASCII로 바꾸기

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/render.mjs` | `.ps1`에는 ASCII 헤더 `# Managed by sirloinbh/project-standards. Edit in <템플릿 폴더>/`를 붙인다. 다른 파일은 기존 한국어 헤더 그대로다. `isHeaderLine()`이 두 문장을 모두 인식해 헤더를 두 번 붙이지 않는다 |
| `scripts/test/scripts-templates.test.mjs` | 모든 앱 대상의 렌더된 `.ps1`에 비ASCII 문자가 없는지 검사 |
| `scripts/test/render.test.mjs` | `.ps1` 렌더 결과의 기대값을 ASCII 헤더로 바꾸고, 두 번째 헤더가 붙지 않는지 확인 |
| `templates/app/AGENTS.md.tmpl` | "중앙 관리 파일" 안내에 `.ps1`의 영어 헤더를 함께 적음 |

## 정한 것

- 원인: Windows PowerShell 5.1은 BOM 없는 `.ps1`을 시스템 ANSI 코드 페이지로 읽는다. 렌더러는 `.ps1`의 BOM을 지우고 한국어 헤더를 붙였다. workout-memo#143의 `verify`가 workout-memo 테스트 `backup.ps1 is ASCII only`에서 실패했다.
- BOM을 붙이는 방법은 쓰지 않았다. BOM도 비ASCII 문자라 앱 테스트가 막고, 렌더러는 줄 끝과 BOM을 정규화하는 방식을 유지한다.
- 템플릿 `.ps1` 3개의 본문은 이미 ASCII다. 앞으로 본문에 한국어가 들어가면 새 테스트가 막는다.

## 검증

- `npm run check` 통과(테스트 410개 중 407 통과·3 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
- 실제 결과는 병합 뒤 갱신되는 workout-memo#143의 `verify`에서 확인한다
