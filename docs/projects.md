# Project overview

<!-- Generated file. Edit registry/projects.json, then regenerate with `npm run docs`. -->

## Projects

| Slot | Project | Name | Display name | Domain | Status | DB / test DB | Service address | AWS prefix | Rollout stage |
|---|---|---|---|---|---|---|---|---|---|
| 01 | workout-memo | Workout Log | FORM · My Workout Log | 운동 | active | workout / workout_test | TBD | TBD | 1 |
| 02 | study-log | Study Log | Study Log | 공부 | active | study / study_test | TBD | TBD | 2 |
| 03 | health-log | Health Log | Diet, Sleep and Health Log | 건강 | active | health / health_test | TBD | TBD | 2 |
| 04 | life-journal | Reviews & Diary | Reviews & Diary | 일기 | active | journal / journal_test | TBD | TBD | 2 |
| 05 | money-ledger | Money Ledger | Ledger, Assets, Mock Trading | 재무 | active | money / money_test | TBD | TBD | 2 |
| 06 | cert-manager | Cert Manager | Cert Manager | 자격증 | active | cert / cert_test | TBD | TBD | 2 |
| 07 | plan-routine | Plan Routine | Plan · Practice · Routine · Feedback | 루틴 | active | plan / plan_test | TBD | TBD | 2 |
| 08 | dev-career-portfolio | Dev Career | Dev Career Portfolio | 커리어 | active | career / career_test | TBD | TBD | 2 |

## Ports

| Project | web | api | e2e api | vite | e2e web | db |
|---|---|---|---|---|---|---|
| workout-memo | 8101 | 3101 | 3201 | 5201 | 5301 | 15401 |
| study-log | 8102 | 3102 | 3202 | 5202 | 5302 | 15402 |
| health-log | 8103 | 3103 | 3203 | 5203 | 5303 | 15403 |
| life-journal | 8104 | 3104 | 3204 | 5204 | 5304 | 15404 |
| money-ledger | 8105 | 3105 | 3205 | 5205 | 5305 | 15405 |
| cert-manager | 8106 | 3106 | 3206 | 5206 | 5306 | 15406 |
| plan-routine | 8107 | 3107 | 3207 | 5207 | 5307 | 15407 |
| dev-career-portfolio | 8108 | 3108 | 3208 | 5208 | 5308 | 15408 |

## Local tools

Not apps: no deploy, DB, or sync. They hold a slot so their ports never collide with an app, and use only the ports listed.

| Slot | Tool | Repository | Ports | Summary |
|---|---|---|---|---|
| 09 | file-control | file-control | web 8109 | Windows file cleanup CLI (fctl). Its local screen fctl ui serves on 127.0.0.1 only and fails instead of moving when the port is busy. |

Port formula: base value + slot. web 8100, api 3100, e2e api 3200, vite 5200, e2e web 5300, db 15400. Reserved ports (do not assign): 3000, 4173, 5173, 5432, 8080. Basis: [ADR-0006](adr/0006-port-slot-allocation.md)

## Shared values

| Item | Value |
|---|---|
| Root domain | TBD |
| AWS region | ap-northeast-2 |
| AWS account alias | TBD |
| AWS shared prefix | TBD |
