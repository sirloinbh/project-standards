# #192 로컬 브랜치를 Fork 앱으로 관리하는 규칙

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/skills/std-git-writing/SKILL.md` | 3장에 "로컬 브랜치 관리 (Fork 앱)"를 추가했다. 에이전트는 브랜치 생성·커밋·push·PR까지만 하고, 병합 후 로컬 정리(main 전환, pull, 로컬 브랜치 삭제)와 `stash`·`reset`·`rebase`는 하지 않는다. 새 브랜치는 `origin/main`에서 만든다 |
| `.claude/skills/std-git-writing/SKILL.md` | 원본 복제 |
| `AGENTS.md` | 에이전트 병합 명령에서 `--delete-branch`를 뺐다. 이 옵션은 원격뿐 아니라 로컬 브랜치도 지운다 |

## 정한 것

- 사용자가 2026-10-24에 모든 프로젝트의 로컬 브랜치를 Git GUI 앱 Fork로 관리하기로 했다.
- 원격 브랜치 정리는 리포 설정 "병합 후 브랜치 자동 삭제"(`delete_branch_on_merge`, `docs/repo-settings.md` 권장값)에 맡긴다. 이 리포는 아직 꺼져 있어서, 켜기 전까지는 병합된 원격 브랜치가 남는다.
- 사용자에게 정리를 안내할 때는 명령어 대신 Fork 기준으로 쓴다.

## 하위 리포

- 공통 스킬이라 중앙 동기화(#113, #115)로 하위 리포에 퍼진다.

## 검증

- `diff templates/common/skills/std-git-writing .claude/skills/std-git-writing`: 차이 없음
- `npm run check` 통과(테스트 392개 중 391 통과·1 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
