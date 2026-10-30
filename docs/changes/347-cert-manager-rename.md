# #347 english-study를 cert-manager로 이름 바꾸기

- 이슈: [#347](https://github.com/sirloinbh/project-standards/issues/347)
- 앱 쪽 결정: [sirloinbh/english-study#25](https://github.com/sirloinbh/english-study/issues/25)

## 목적

english-study를 영어 공부에서 모든 자격증을 관리하는 프로젝트로 넓힌다. 영어 공부는 자격증과 별개 영역으로 남긴다. 이름이 바뀌면 동기화 PR이 새 리포로 가야 하므로 레지스트리 값을 바꾸고, 중앙에 없던 이름 바꾸기 절차를 문서로 남긴다.

## 변경 — 2026-10-30

| 파일 | 내용 |
|---|---|
| `registry/projects.json` | 슬롯 06: `name` `cert-manager`, `title`·`displayName` "자격증 관리", `domain` "자격증", `summary`, `repos` 4개, DB `cert`/`cert_test`, `skills` 3개. 포트는 그대로 |
| `sync.config.json` | 동기화 대상 `sirloinbh/cert-manager` |
| `docs/projects.md`, `scripts/test/fixtures/sync-snapshot.json` | 생성 문서와 스냅샷 다시 만들기. 스냅샷은 리포 이름 키만 바뀌고 받는 파일 목록은 같다 |
| `scripts/test/registry.test.mjs` | 퇴역 프로젝트 예시를 `cert-manager`로 |
| `docs/design.md`, `docs/tools.md`, `docs/github-app.md`, `docs/user-steps.md`, `docs/costs.md` | 현재 값을 적은 표·목록만 고쳤다 |
| `docs/project-rename.md` | 앱 이름 바꾸기 순서(새 문서) |

고치지 않은 것: `docs/bootstrap-prompt.md`, `docs/design.md`의 포트 이전 표, `docs/research/`, `docs/user-steps.md`의 지난 동기화 PR 표, `docs/changes/`는 당시 기록이다. `docs/env-matrix.md`는 준수 현황 워크플로가 매일 다시 만든다.

## 병합 시점

동기화는 대상이 `sirloinbh/<repos.umbrella>`인지 검사한다. 그래서 GitHub 리포 이름 바꾸기([sirloinbh/english-study#26](https://github.com/sirloinbh/english-study/issues/26), 사용자 단계)가 끝난 뒤 바로 병합한다.

## 검증

- `npm run check`: PR 본문에 기록
