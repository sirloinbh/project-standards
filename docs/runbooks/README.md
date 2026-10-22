# 운영 문서 템플릿

앱 리포의 배포·운영 문서 형식이다. workout-memo에서 실제로 운영하며 검증한 문서를 바탕으로 만들었다(#35).

| 템플릿 | 앱 리포에서 쓰는 위치 | 내용 |
|---|---|---|
| [deploy.md](deploy.md) | `docs/deployment.md` | 서버 값, 서버 `.env` 키 이름, 인프라 적용, 배포·롤백, 자동 배포, 접속, 철거 |
| [backup-restore.md](backup-restore.md) | `docs/backup-restore.md` | 백업 종류와 보관, PC로 가져오기, 복원 확인, 운영 DB 교체, 서버 전체 복구 |
| [daily.md](daily.md) | `docs/daily/README.md` | 일일 기록 규칙과 날짜 파일 형식 |
| [next-steps.md](next-steps.md) | `docs/next-steps/README.md` | 다음 작업 문서 형식 |

## 쓰는 법

- 템플릿의 `{{project.*}}` 자리에는 [레지스트리](../../registry/projects.json)의 그 프로젝트 값이 들어간다(이름, 포트, DB 이름 등). 동기화와 같은 렌더러(`scripts/lib/render.mjs`)로 채우므로 모든 활성 프로젝트에서 빈칸 없이 렌더링되는지 테스트한다.
- **동기화하지 않는다.** 운영 문서는 앱마다 비용표, 서버 IP 결정, 운영 이력이 붙으므로 중앙이 덮어쓰면 안 된다. 새 앱은 스캐폴드(#85)가 처음 한 번 복사하고, 기존 앱은 배포를 준비할 때 복사해서 앱에 맞게 고친다.
- 서버 `.env`는 키 이름과 만드는 곳만 적는다. 값은 어디에도 적지 않는다.
- 사용자가 직접 할 단계는 `[사용자]`로 표시한다.
- 템플릿을 고치면 이미 운영 중인 앱(지금은 workout-memo)의 문서에도 같은 변경이 필요한지 확인하고, 필요하면 그 리포에 이슈를 연다.

## workout-memo 문서와의 차이

workout-memo는 이 템플릿의 원본이다. 차이는 다음과 같고, workout-memo 문서를 템플릿에 맞춰 바꿀 필요는 없다.

| 항목 | workout-memo | 템플릿 | 이유 |
|---|---|---|---|
| 배포 문서 위치 | `docs/deployment.md` 하나에 백업까지 | `deployment.md`와 `backup-restore.md`로 나눔 | 백업·복구는 배포 없이도(로컬 DB) 쓰는 절차라 따로 찾기 쉽게 |
| 비용표·요금 근거 | 있음 | 없음 | 서버 구성과 시점에 따라 바뀐다. 앱이 운영을 시작할 때 직접 쓴다 |
| 서버 `.env` 키 | 본문에 흩어져 있음 | 표 하나로 모음, `NODE_AUTH_TOKEN` 추가 | 공유 패키지(GitHub Packages)를 쓰면 서버 빌드에 읽기 토큰이 필요하다([design.md](../design.md) 9절) |
| 서버 이름 접두어 | `workout-` (timer, 잠금, 백업 폴더) | `{{project.db.name}}-` | workout-memo의 접두어가 DB 이름과 같다. 다른 앱도 같은 규칙으로 맞춘다 |
| AWS CLI 프로필 | `workout-personal` | `{{project.db.name}}-personal` | 같은 규칙 |
| 복원 확인 | 확인 후 임시 DB를 남김 | 확인 후 `dropdb`로 지움 | 서버 디스크와 스냅샷 크기를 늘리지 않게 |
| 서버 전체 복구 | 스냅샷 복원만 언급 | 복구 뒤 `terraform plan`·`import` 확인 추가 | 새 인스턴스는 state와 달라진다 |
| Lightsail 알람(CLI) | 있음 | 없음 | 선택 사항이고 계정·연락처에 따라 다르다 |
| 일일 기록 날짜 파일 | 형식 없이 자유롭게 | 한 일·발견한 문제·남은 일 3절과 상태 열 | PR 생성·CI·병합·배포를 구분해서 적게 |
| 다음 작업 | 우선순위 표, 후속, 실행 경계 | 우선순위 표, 사용자가 할 일, 후속, 운영 상태 | 사용자 단계를 따로 모으는 규칙(std-git-writing)과 맞춤. 우선순위 근거는 이슈 라벨 |
