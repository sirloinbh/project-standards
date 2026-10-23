# #187 사용자 단계 문서에 진행 상태와 권장 순서 반영하기

## 변경

| 파일 | 내용 |
|---|---|
| `docs/user-steps.md` | 단계 표에 2026-10-23 상태 열, 권장 순서(1 → 2 → 3 → 4)와 이유, 단계별로 끝나면 에이전트가 이어서 할 일 표. 7(#180 Codex 훅 신뢰), 8(#183 PC 점검) 절 추가. 2-3 백업 폴더 이름을 실행 날짜로. 2-1 fast-forward 재확인 날짜 |

## 상태를 확인한 방법 (읽기 전용)

- #21: `%LOCALAPPDATA%\sirloinbh-tools` 없음
- #92: `shared-aws-infrastructure` main `b4cafc1`이 workout-memo `git subtree split` 결과 `684542a`의 조상(`git merge-base --is-ancestor`), 3커밋 차이. `workout-memo\infrastructure\terraform.tfstate` 있음, `$HOME\Backups` 없음
- #86: `variable list`, `secret list` 결과 없음
- #88: `git ls-remote --tags origin`, `release list` 결과 없음
- #22: workout-memo `vulnerability-alerts` API가 "disabled"(404)
- #183: `claude --version` 2.1.309

## 검증

- `npm run check` 통과(테스트 392개 모두 통과)
