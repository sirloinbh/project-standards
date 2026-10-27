# #285 매일 서버 상태 보고

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/report.sh.tmpl` | `memory=..% disk=..% deployed=<커밋> [autodeploy-failed=<커밋>] containers: <이름> <메모리>, ...` 한 줄. healthchecks.io report 신호 본문으로 보내고, 메모리(`REPORT_MEMORY_PERCENT`, 기본 85)·디스크(`REPORT_DISK_PERCENT`, 기본 90) 기준을 넘으면 실패 신호. `line`은 출력만 |
| `templates/app/deploy/report.{service,timer}.tmpl` | 매일 04:00(서울) |
| `templates/app/deploy/install-backup.sh.tmpl` | report timer도 설치 |
| `scripts/test/deploy-templates.test.mjs`, 스냅샷 | 가짜 free·df·docker로 한 줄 형식, 기준 초과 실패, `.env` 기준 |
| `docs/runbooks/deploy.md` | 보고 형식과 기준 |

메모리 사용률은 `free`의 (total − available) / total이다. ADR-0009가 2 GB 서버에서 재기로 한 값을 매일 남긴다.

## 검증

- `node --test scripts/test/deploy-templates.test.mjs`: 22개 중 21개 통과, 1개 건너뜀(python3 없음, 기존 테스트)
- `npm run check`: 테스트 463개 중 462개 통과, 1개 건너뜀, 실패 0
