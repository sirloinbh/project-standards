# #76 보안 점검 스크립트 (금지 패키지, IOC)

## 변경

| 파일 | 내용 |
|---|---|
| `security/blocked-packages.json` | 점검 기준. 침해 보고 패키지 3개와 스코프 1개, 외부 유출 의심 주소 7개, 의심 워크플로 이름, 설치 스크립트가 실행하는 의심 파일 이름. 출처는 사용자 글로벌 규칙(2026-10-22)이며 계속 갱신한다 |
| `scripts/ioc-scan.mjs` | 리포 전체의 `package-lock.json`(중첩 설치 포함), `package.json`의 설치 스크립트, 설치된 `node_modules`의 설치 스크립트, `.github/workflows`를 읽어서 점검한다. 패키지 코드는 실행하지 않는다 |
| `templates/index.json` | `.standards/ioc-scan.mjs`와 `.standards/blocked-packages.json`을 하위 리포에 복사 |
| `scripts/test/ioc-scan.test.mjs`, `fixtures/sync-snapshot.json` | 테스트 6개, 하위 리포가 받는 파일 목록에 2개 추가 |

## 판정

- **실패(종료 코드 1):**
  - 침해 보고 패키지나 스코프가 lockfile에 있다. 버전 정보가 없는 항목은 어떤 버전이든 사람이 확인한다.
  - `preinstall`·`install`·`postinstall`·`prepare` 스크립트가 외부 유출 의심 주소를 호출하거나 `bundle.js`·`processor.js`를 실행한다.
  - 워크플로 이름에 `shai-hulud`가 들어 있거나, 워크플로 내용에 외부 유출 의심 주소가 있다.
- **경고:** 설치 스크립트가 있는 의존성 목록. `.npmrc`의 `ignore-scripts=true`로 실행되지 않는 대상이다.
- 사용자 PC의 `~/.bashrc` 같은 셸 설정 점검은 리포 밖이라 범위에서 뺐다.

## 실제 점검 결과 (2026-10-22, 로컬 클론)

| 리포 | 결과 | 설치 스크립트가 있는 의존성(경고) |
|---|---|---|
| project-standards | 의심 항목 없음 | 없음 |
| workout-memo | 의심 항목 없음 | esbuild, fsevents, tesseract.js |
| 나머지 앱 7개 | 의심 항목 없음 | esbuild, fsevents |

`esbuild`와 `tesseract.js`는 설치 스크립트가 꺼져 있어도(`ignore-scripts=true`) 빌드와 실행이 되는지, workout-memo 첫 동기화(#97)에서 Docker 빌드로 확인해야 한다. #97에 메모를 남겼다.

## 검증

- `npm run check`: 테스트 79개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 복사본 단독 실행: 임시 리포의 `.standards/ioc-scan.mjs`가 옆의 `blocked-packages.json`을 찾아 종료 코드 1로 실패하는 것을 확인했다.
