# {{project.title}} 고유 지침

이 파일은 {{project.name}}에만 해당하는 규칙이다. 공통 지침은 [AGENTS.md](AGENTS.md)(중앙 관리)이며, 두 파일이 다르면 이 파일이 우선한다.

## 서비스 규칙

- 서비스 이름: {{project.displayName}}.
- 날짜는 `YYYY-MM-DD`, 서비스 시간대는 `Asia/Seoul`.
- 입력 검증은 서버에서도 한다. 입력 스키마의 원본은 `shared/contract.ts`다.

## 작업 절차 (공통 절차에 더해)

- PR을 올린 뒤 자동 코드 리뷰를 최대 2회 거친다. 보완점은 추가 커밋으로 반영하고, 이 PR에서 고치기에 큰 수정은 새 이슈로 분리한다.
- **최종 head의 필수 CI 검사가 모두 통과하면 에이전트가 PR을 병합한다**(`--merge --match-head-commit <검증한 SHA>`). 실패·진행 중 검사 상태의 병합, `--admin` 등 보호 규칙 우회, 자기 PR 승인, main 직접 푸시, force push는 하지 않는다.
- 운영 배포를 연결하면 main 병합이 곧 배포가 된다. 그때 이 절에 배포 확인 절차를 추가한다([배포·운영](docs/deployment.md)).

## 고유 스킬과 문서

- 공통 스킬(`std-*`)을 쓴다. 이 프로젝트에만 필요한 절차가 생기면 `skills/{{project.db.name}}-*`로 만들고 여기에 적는다.

## 고유 검증 명령

- 단위 테스트: `npm test`. 백엔드는 node:test(`backend/test`), 화면은 Vitest·Testing Library(`frontend/src/*.test.tsx`).
- 브라우저 검증: `npm run test:e2e`. `db:migrate`로 준비한 테스트 DB를 `E2E_DATABASE_URL`(없으면 `TEST_DATABASE_URL`)로 지정한다. API {{project.ports.e2eApi}}·화면 {{project.ports.e2eWeb}} 포트를 쓰며 개인 DB를 지정하지 않는다.
- 입력 스키마 변경: `shared/contract.ts`를 고친 뒤 `npm run contract:sync`. 복제본은 직접 고치지 않는다.
