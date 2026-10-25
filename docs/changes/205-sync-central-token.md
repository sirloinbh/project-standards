# #205 동기화의 패키지 배포 확인 403 오류 고치기

## 문제

`maxRollout` 1(PR #204) 뒤 첫 `sync` 실행이 workout-memo에서 `GET /repos/sirloinbh/project-standards/actions/runs/40088716697 failed: 403 Resource not accessible by integration`로 실패했다. `verifyPackages`(ADR-0004)는 공유 패키지 Release에 적힌 `publish.yml` 실행을 읽는데, 이 요청에 App 설치 토큰을 썼다. App 권한 표에는 Actions 권한이 없다. 패키지 버전이 처음 `null`이 아니게 된 것은 #88(PR #200)이라, 그 전에는 이 코드가 실행되지 않았다.

## 변경

| 파일 | 내용 |
|---|---|
| `.github/workflows/sync.yml` | 워크플로 권한에 `actions: read` 추가, 동기화 단계에 `GITHUB_TOKEN` 전달 |
| `scripts/sync.mjs` | 중앙 리포 읽기(Release, 배포 실행)는 `centralToken`(`GITHUB_TOKEN`)으로 한다. App 토큰은 하위 리포에만 발급한다. `GITHUB_TOKEN`이 없으면 바로 실패한다 |
| `scripts/test/sync-pr.test.mjs` | 중앙 읽기에 `centralToken`을 쓰고 App 토큰은 대상 리포에만 발급하는지 |
| `docs/github-app.md` | Actions 권한을 주지 않는 이유 |

## 정한 것

- App 권한에 Actions 읽기를 더하지 않았다. 사용자 단계(권한 변경과 Accept)가 생기고, 하위 리포 9개의 실행 기록까지 읽을 수 있게 된다. 중앙 리포는 워크플로 자신의 리포라 `GITHUB_TOKEN`으로 충분하다.
- `maxRollout` 0일 때 App 설치 토큰 발급만 확인하는 동작은 그대로다.

## 검증

- `node --test scripts/test/sync-pr.test.mjs`: 12개 통과.
- `npm run check`: 테스트 404개 중 402개 통과, 2개 건너뜀.
- 병합 후 `sync` 실행 결과는 #205에 적는다.
