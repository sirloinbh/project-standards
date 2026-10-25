# #97 앱 package.json에 공유 패키지 devDependencies 필드 추가

workout-memo 첫 동기화(#97)의 할 일 "`@sirloinbh/*` devDependencies를 `versions.json` 패키지 버전으로 관리하는 필드 추가"(#65에서 넘김)를 `maxRollout`을 올리기 전에 따로 했다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/index.json` | 앱 프로필 `fields`에 `devDependencies` 추가. 루트 `package.json`은 `@sirloinbh/eslint-config`·`@sirloinbh/prettier-config`, `frontend/`·`backend/package.json`은 `@sirloinbh/tsconfig` |
| `scripts/lib/render.mjs` | 템플릿 변수 이름에 `@`와 `/`를 허용해 `{{versions.packages.@sirloinbh/tsconfig}}`처럼 패키지 이름으로 버전을 찾는다 |
| `scripts/test/sync.test.mjs`, `scripts/test/render.test.mjs` | 패키지별 devDependencies 위치·버전, 미배포(`null`) 패키지면 계획이 멈추는지, 패키지 이름 변수 |
| `scripts/test/standards-check.test.mjs`, `scripts/test/templates.test.mjs` | 표준을 지킨 리포 예시의 `package.json`에 새 관리 필드를 넣음 |

## 정한 것

- **패키지를 쓰는 `package.json`에만 넣는다.** 템플릿이 실제로 참조하는 곳 기준이다: `eslint.config.mjs`·`.prettierrc.json`은 루트, `tsconfig.json`의 `extends`는 `frontend/`·`backend/`. `frontend/`·`backend/`는 Docker 빌드에서 각 폴더의 `npm ci`로 설치하므로(design.md D3) 루트에만 넣으면 빌드가 실패한다.
- **`@sirloinbh/design-tokens`는 넣지 않았다.** 지금 어느 템플릿도 쓰지 않는다. 앱에 디자인 시스템을 적용하는 #126에서 넣는다. 매니페스트의 `packages`에는 지금처럼 4개 모두 기록된다.
- **버전은 `^` 없이 정확한 버전이다**(`versions.json`의 값 그대로). 버전을 올리면 동기화 PR이 세 파일을 함께 바꾼다.
- 패키지 버전이 `null`(미배포)이면 렌더링이 "undefined template variable"로 실패한다. 빈 값을 쓰는 대신 동기화를 멈춘다.
- 하위 리포의 `package-lock.json`은 동기화가 바꾸지 않는다. 동기화 PR을 받은 뒤 lockfile 갱신은 사용자 단계(#98, #114)다.

## 검증

- `node --test scripts/test/sync.test.mjs scripts/test/render.test.mjs`: 21개 통과.
- `npm run check`: 테스트 403개 중 401개 통과, 2개 건너뜀(기존과 같은 Windows 조건).
- 하위 리포에 받을 파일 목록은 바뀌지 않아 스냅샷은 그대로다(필드만 바뀜).
