# #276 리포 일괄 상태·pull·실행 명령과 VS Code 작업공간 파일

## 변경

| 파일 | 내용 |
|---|---|
| `tools/repos.mjs` | `status`(브랜치·변경·뒤/앞), `pull`(main이고 깨끗한 클론만 `--ff-only`), `run -- <명령>`(설치 명령은 차단 훅의 `findInstall`로 거부), `workspace`(`.local/sirloinbh.code-workspace`) |
| `scripts/test/repos.test.mjs` | 임시 origin과 클론으로 6개 |
| `docs/tools.md` | 사용법 |

리포 목록은 이 리포와 `sync.config.json` 대상이다. file-control은 레지스트리에 없어서 넣지 않았다. GitHub Pull Requests 권장 확장은 #247에서 `.vscode/extensions.json`과 함께 넣는다.

## 실제 실행 (2026-10-27, `status`, fetch 없음)

| 리포 | 브랜치 | 커밋 안 한 변경 | 뒤 / 앞 |
|---|---|---|---|
| project-standards | feat/276-repos-command | 3 | 0 / 0 |
| workout-memo | research/112-ux-audit | 0 | 44 / 0 |
| study-log 외 앱 6개 | main | 0 | 0 / 0 |
| shared-aws-infrastructure | (클론 없음) | | |

`workspace`로 리포 10개짜리 작업공간 파일을 만들었다.

## 검증

- `node --test scripts/test/repos.test.mjs`: 6개 통과
