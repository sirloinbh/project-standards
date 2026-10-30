# 앱 프로젝트 이름 바꾸기

레지스트리에 등록된 앱의 이름(리포 이름, 표시 이름, DB 이름)을 바꾸는 순서다. english-study → cert-manager(#347)에서 처음 썼다.

## 바뀌지 않는 것

- 슬롯과 포트. 포트는 슬롯에 묶여 있고 이름과 관계없다.
- GitHub App 설치, 리포 secret·variable. GitHub는 리포 이름이 바뀌어도 같은 리포로 다룬다.
- 과거 기록(`docs/changes/`, 일일 기록, 조사 문서, 이전 표). 당시 상태라서 고치지 않는다.

## 순서

중앙 동기화는 대상 리포가 `sirloinbh/<repos.umbrella>`인지 검사한다(`scripts/lib/registry.mjs`). 그래서 2번과 3번은 같은 시점에 한다. 레지스트리를 먼저 병합하면 동기화가 아직 없는 리포를 찾다가 실패하고, 리포 이름을 먼저 바꾸면 이전 이름으로 동기화가 실패한다.

1. 앱 리포에서 새 이름·표시 이름·설명·DB 이름을 정해 이슈에 기록한다. 리포 이름과 DB 이름은 레지스트리의 다른 앱과 겹치지 않게 한다.
2. 이 리포에서 이름 값을 바꾸는 PR을 만든다. PR 본문의 "병합 전에 확인해 주세요"에 3번 완료를 적어 두고, 3번이 끝나기 전에는 병합하지 않는다.
   - `registry/projects.json`: `name`, `title`, `displayName`, `domain`, `summary`, `repos`, `db`, `skills`
   - `sync.config.json`: `repo`, `project`
   - 생성 문서(`npm run docs`), 동기화 스냅샷(`UPDATE_SNAPSHOT=1 npm test`)
   - 이름이 들어간 테스트와 현재 값을 적은 문서(`docs/design.md` 표, `docs/tools.md`, `docs/github-app.md`, `docs/user-steps.md`, `docs/costs.md`)
3. `[사용자]` GitHub에서 우산 리포와 하위 리포 3개의 이름을 바꾼다. 바로 이어서 2번 PR을 병합한다.
4. 새 이름 리포에 열린 동기화 PR을 확인한다. `AGENTS.md`, `deploy/`, `compose.yaml`의 DB 이름이 새 값으로 바뀌고 `standards-check`가 통과해야 한다. 이 PR은 사용자가 병합한다.
5. `[사용자]` 로컬 원격 주소, 폴더 이름, 로컬 DB(`.env`, Docker 볼륨)를 새 이름에 맞춘다.
6. 앱 리포가 관리하는 이름(패키지 이름, 화면 문구, 고유 스킬, README)을 앱 리포 이슈로 바꾼다.

## 운영 중인 앱이면

서버의 timer·잠금·백업 폴더 이름이 DB 이름을 접두어로 쓴다([ADR-0009](adr/0009-multi-app-single-lightsail.md)). DB 이름을 바꾸면 서버의 systemd timer, `/opt/<앱>` 경로, DB 이름, 백업 위치도 옮겨야 한다. 이 절차는 아직 쓴 적이 없다. 운영 중인 앱의 이름을 바꿀 때 먼저 이슈로 설계한다.
