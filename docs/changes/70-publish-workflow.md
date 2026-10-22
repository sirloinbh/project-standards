# #70 패키지 배포 워크플로 (태그 → GitHub Packages)

## 변경

| 파일 | 내용 |
|---|---|
| `.github/workflows/publish.yml` | 태그 `<패키지>/v<버전>`을 push하면 순서대로 실행한다: 중앙 검사(`npm run check`) → 태그와 버전 일치 확인(`package-guard --tag`) → `npm publish --ignore-scripts` → GitHub Release 생성. Release 본문에 CHANGELOG, 커밋 SHA, 배포 실행 URL이 들어간다 |
| `scripts/changelog-section.mjs` | CHANGELOG에서 한 버전의 내용만 꺼낸다. Release 본문과 동기화 PR 본문(#63)에 쓴다 |
| `scripts/check-workflows.mjs` | 외부 도구 없이 워크플로 파일을 검사한다. 모든 `uses:`가 `versions.json`의 커밋 SHA와 버전 주석으로 고정됐는지, 최상위 `permissions`가 있는지 본다. 템플릿 폴더의 워크플로도 포함한다 |
| `package.json` | `workflows:check`를 `npm run check`에 포함 |
| `scripts/test/workflows.test.mjs` | 테스트 4개 |

## 정한 규칙

- 권한은 이 워크플로에 필요한 것만 준다: `contents: write`(Release), `packages: write`(배포).
- 같은 태그를 동시에 배포하지 않도록 `concurrency`로 막는다.
- 태그 push는 사용자가 한다(#88). 이 워크플로가 병합돼도 태그가 없으면 실행되지 않는다.
- Release 본문의 배포 실행 URL은 동기화가 자체 패키지의 출처를 확인하는 근거다(ADR-0004).

## 검증

- `npm run check`: 테스트 96개 통과, `package-guard: ok`, `check-workflows: ok`
- 실제 실행은 첫 태그를 push할 때(#88) 확인한다. actionlint 같은 워크플로 문법 검사 도구는 설치되어 있지 않아, 위 검사 스크립트로 Action 고정과 권한만 확인했다.
