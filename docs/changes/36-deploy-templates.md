# #36 배포 스크립트 템플릿 만들기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/` 5개 | workout-memo `deploy/`를 ADR-0009대로 일반화했다. `autodeploy.sh`, `remote-deploy.sh`, `install-autodeploy.sh`, `autodeploy.service`, `autodeploy.timer`. 리포 이름, `/opt/<앱>`, 이미지 이름, 백업 명령, timer 이름, 시작 시각, 기본 웹 포트를 레지스트리 값으로 넣는다 |
| `scripts/lib/render.mjs` | `.service`, `.timer`에도 "중앙 관리 파일" 머리말(`#`)을 붙인다 |
| `docs/runbooks/deploy.md` | 공용 잠금, 서버 웹 포트(`WEB_PORT`), timer 시작 시각, timer 설치 명령, 배포 스크립트가 요구하는 `compose.yaml` 조건을 적었다 |
| `docs/adr/0009-multi-app-single-lightsail.md` | 보충 절: timer 이름(`<DB 이름>-autodeploy`), 시작 시각, health 포트, 배포 전 덤프 |
| `scripts/test/deploy-templates.test.mjs` | 8개 앱 렌더링, workout-memo 운영 서버 이름 유지, 공용 잠금, 슬롯별 시작 시각, `{{.Tag}}` 보존, `bash -n`, CI 판정 |
| `scripts/test/render.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | 머리말 확장자 검사, 앱별 배포 파일 5개 추가 |

## 정한 것

- **workout-memo 서버를 바꾸지 않고 동기화되게 했다.** timer 이름 `workout-autodeploy`, 백업 명령 `/usr/local/bin/workout-backup`, 이미지 이름 `workout-backend`·`workout-frontend`가 지금과 같다. health 포트는 서버 `.env`의 `WEB_PORT`(지금 80)를 읽는다.
- **바뀌는 점은 잠금 파일 하나다.** `/run/lock/workout-deploy.lock` 대신 `/run/lock/apps-deploy.lock`을 쓴다. 수동 배포와 timer가 같은 새 잠금을 쓰므로 둘이 겹치지 않는다.
- **파일 이름은 앱과 상관없이 같다.** 렌더러는 파일 이름에 변수를 쓰지 못한다. 그래서 `deploy/autodeploy.service`를 `install-autodeploy.sh`가 `/etc/systemd/system/<DB 이름>-autodeploy.service`로 설치한다. workout-memo의 기존 `deploy/workout-autodeploy.*` 파일은 동기화가 지우지 않으므로, 첫 동기화 PR(#97)에서 지울지 정한다.
- **docker `--format '{{.Tag}}'`**는 렌더러가 변수로 읽기 때문에 `'{''{.Tag}}'`로 나눠 썼다. 테스트가 bash에서 `{{.Tag}}`로 합쳐지는지 확인한다.
- 다른 앱 7개의 `compose.yaml`에는 이미지 이름과 `WEB_BIND`·`WEB_PORT` 변수가 아직 없다. 이 스크립트는 동기화로 들어가도 서버에 timer를 설치하기 전까지는 실행되지 않는다. 앱을 배포할 때 각 리포에서 compose를 맞춘다(`docs/runbooks/deploy.md` 4장 조건).
- PC에서 실행하는 `scripts/deploy.ps1`은 이 이슈 범위(`deploy/*`)에 넣지 않았다.

## 검증

- `node --test scripts/test/deploy-templates.test.mjs`: 7개 중 6개 통과, 1개 건너뜀. CI 판정 검사는 `python3`가 없어서 이 PC에서 건너뛰었고, CI(ubuntu)에서 실행된다. 이 PC에서는 렌더링한 `autodeploy.sh ci-state`에 실제 Python을 연결해 5가지 입력(없음, 실행 중, 성공·skipped·neutral, 실패 포함, 취소)이 pending·pending·pass·fail·fail로 나오는 것을 확인했다.
- `bash -n`: 8개 앱의 렌더링한 `.sh` 3개 모두 통과.
- `UPDATE_SNAPSHOT=1 npm test`: 400개 중 398개 통과, 2개 건너뜀.
- 실제 서버 배포는 하지 않았다.
