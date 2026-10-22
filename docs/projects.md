# 프로젝트 개요

<!-- 자동 생성 파일. 수정은 registry/projects.json에서 하고 `npm run docs` 로 다시 생성한다. -->

## 프로젝트

| 슬롯 | 프로젝트 | 이름 | 표시 이름 | 분야 | 상태 | DB / 테스트 DB | 서비스 주소 | AWS 접두어 | 적용 단계 |
|---|---|---|---|---|---|---|---|---|---|
| 01 | workout-memo | 운동 기록 | FORM · 나의 운동 기록 | 운동 | active | workout / workout_test | 미정 | 미정 | 1 |
| 02 | study-log | 공부 기록 | 공부 기록 | 공부 | active | study / study_test | 미정 | 미정 | 2 |
| 03 | health-log | 식단·수면·건강 기록 | 식단·수면·건강 기록 | 건강 | active | health / health_test | 미정 | 미정 | 2 |
| 04 | life-journal | 감상문·일기장 | 감상문·일기장 | 일기 | active | journal / journal_test | 미정 | 미정 | 2 |
| 05 | money-ledger | 가계부·자산 포트폴리오 | 가계부·자산 포트폴리오 | 가계부 | active | money / money_test | 미정 | 미정 | 2 |
| 06 | english-study | 영어 공부 | 영어 공부 | 영어 | active | english / english_test | 미정 | 미정 | 2 |
| 07 | plan-routine | 계획·실천·루틴·피드백 | 계획·실천·루틴·피드백 | 루틴 | active | plan / plan_test | 미정 | 미정 | 2 |
| 08 | dev-career-portfolio | 개발 커리어 포트폴리오 | 개발 커리어 포트폴리오 | 커리어 | active | career / career_test | 미정 | 미정 | 2 |

## 포트

| 프로젝트 | web | api | e2e api | vite | e2e web | db |
|---|---|---|---|---|---|---|
| workout-memo | 8101 | 3101 | 3201 | 5201 | 5301 | 15401 |
| study-log | 8102 | 3102 | 3202 | 5202 | 5302 | 15402 |
| health-log | 8103 | 3103 | 3203 | 5203 | 5303 | 15403 |
| life-journal | 8104 | 3104 | 3204 | 5204 | 5304 | 15404 |
| money-ledger | 8105 | 3105 | 3205 | 5205 | 5305 | 15405 |
| english-study | 8106 | 3106 | 3206 | 5206 | 5306 | 15406 |
| plan-routine | 8107 | 3107 | 3207 | 5207 | 5307 | 15407 |
| dev-career-portfolio | 8108 | 3108 | 3208 | 5208 | 5308 | 15408 |

포트 공식: 기준값 + 슬롯. web 8100, api 3100, e2e api 3200, vite 5200, e2e web 5300, db 15400. 예약 포트(배정 금지): 3000, 4173, 5173, 5432, 8080. 근거: [ADR-0006](adr/0006-port-slot-allocation.md)

## 공통값

| 항목 | 값 |
|---|---|
| 루트 도메인 | 미정 |
| AWS 리전 | ap-northeast-2 |
| AWS 계정 별칭 | 미정 |
| AWS 공유 접두어 | 미정 |
