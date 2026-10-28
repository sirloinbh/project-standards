# #247 VS Code 저장 시 Prettier 포맷·ESLint 자동 수정

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.vscode/settings.json.tmpl` | `prettier.requireConfig`, 언어별 저장 시 포맷(Prettier), 저장 시 `source.fixAll.eslint` |
| `templates/app/.vscode/extensions.json.tmpl` | 권장 확장 4개 (새 파일, 앱만) |
| `scripts/test/tools.test.mjs` | 포맷 범위, `requireConfig`, 권장 확장 목록 검사 |
| `templates/app/.prettierignore.tmpl` | `.vscode/extensions.json` 추가 |
| `scripts/test/fixtures/sync-snapshot.json` | 앱 8개에 `.vscode/extensions.json` 추가 |
| `docs/tools.md` | "저장할 때 자동 포맷" 절 |

## 정한 것

- `settings.json`은 공통 템플릿이라 shared-aws-infrastructure도 받는다. 인프라 리포에는 Prettier 설정이 없으므로 `prettier.requireConfig: true`를 켜서 Prettier 기본값으로 포맷하지 않게 했다.
- 저장 시 포맷은 Prettier가 다루는 언어에만 켰다. Terraform 파일은 건드리지 않는다.
- 권장 확장 목록은 Prettier·ESLint를 쓰는 앱에만 둔다(`templates/app/`).
- 중앙 리포에는 적용하지 않았다. Prettier·ESLint를 쓰지 않고, `.vscode/settings.json`이 동기화 대상도 아니다.

## 검증

- `node --test scripts/test/tools.test.mjs`: 15개 통과
- `UPDATE_SNAPSHOT=1 npm test`로 스냅샷 갱신. 바뀐 것은 앱 8개의 `.vscode/extensions.json` 추가뿐
- `.vscode/extensions.json`을 앱 `.prettierignore` 관리 구간에 넣었다(관리 파일 해시 유지 검사, #154)
- `npm run sync:preview`: 앱 8개가 `.vscode/extensions.json`과 바뀐 `settings.json`을 받고, shared-aws-infrastructure는 `settings.json`만 받는다
- `npm run check`: 테스트 465개 중 464개 통과, 1개 건너뜀, 실패 0
