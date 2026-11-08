# #417 autodeploy가 GitHub가 직접 돌리는 실행 때문에 배포를 멈추지 않게 하기

## 문제

`autodeploy.sh`의 `ci_state`는 main 커밋에 붙은 check run이 **모두** 성공해야 배포했다. workout-memo에서 2026-11-08에 두 번 배포가 멈췄다.

- `254e1f7`: Dependabot 보안 업데이트 run(`npm_and_yarn in /. for minimatch - Update`)이 실패했다. 고친 버전이 아직 없어서다.
- `593a906`: CodeQL 기본 설정 run이 CLI를 받다가 504로 실패했다. 기본 설정 run은 다시 돌릴 수 없다.

두 경우 모두 우리 `ci` 워크플로(verify·docker-build·e2e-visual)와 `windows-auth`는 통과했다.

## 확인한 것

- 이슈 본문의 제안인 `app.slug == "dependabot"` 필터는 맞지 않는다. 실제 응답에서 Dependabot check run의 `app.slug`도 `github-actions`다.
- workflow runs API(`/actions/runs?head_sha=`)에서는 Dependabot 업데이트와 CodeQL 기본 설정 둘 다 `event: "dynamic"`이고 `path`가 `dynamic/...`이다. 리포 워크플로는 `push` 등 실제 이벤트다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/autodeploy.sh.tmpl` | check-runs 대신 workflow runs API를 읽고, `event`가 `dynamic`인 실행을 뺀 나머지가 모두 success·skipped·neutral이면 배포 |
| `scripts/test/deploy-templates.test.mjs` | 입력을 `workflow_runs`로 바꾸고 dynamic 실행 실패·진행 중·dynamic만 있는 경우를 추가 |
| `docs/runbooks/deploy.md` | 배포 조건 설명에 dynamic 실행 제외를 적음 |

이슈 댓글의 제안(배포 판단을 리포 워크플로로 좁히기)과 같은 결과다. 브랜치 보호의 필수 검사 목록을 읽는 방식은 인증이 필요해서 쓰지 않았다(서버는 공개 API만 쓴다). CodeQL 경보는 code scanning에서 따로 본다.

## 검증

- 로컬 Windows에는 python3가 없어 해당 테스트가 건너뛰어진다(CI의 ubuntu에서는 돈다). 그래서 WSL Ubuntu에서 렌더링한 스크립트의 `ci-state`를 직접 돌렸다: pending·pass·fail 판정과 dynamic 실행 사례 7가지가 모두 기대대로 나왔고, workout-memo 실제 커밋 `254e1f7`·`593a906`의 workflow runs 응답이 둘 다 `pass`였다(바뀌기 전에는 `fail`).
- `npm run check`: 결과는 PR 본문에 적는다.
- 반영: 동기화 PR로 각 앱의 `deploy/autodeploy.sh`가 바뀐다. workout-memo는 동기화 PR 병합 뒤 `.autodeploy-failed`가 남아 있으면 다음 main 커밋에서 다시 판단한다(지금 `593a906`이 기록돼 있다면 `rm /opt/workout-memo/.autodeploy-failed`로 바로 다시 시도할 수 있다).
