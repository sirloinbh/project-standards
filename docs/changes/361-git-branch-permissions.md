# #361 에이전트의 git 브랜치 명령 자동 실행 허용

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | git 브랜치 명령의 `allow`·`ask`·`deny` 규칙을 Bash와 PowerShell에 추가 |
| `templates/common/.codex/rules/git-branch.rules`, `.codex/rules/git-branch.rules` | Codex용 같은 범위의 규칙 추가 |
| `scripts/test/agent-guardrails.test.mjs` | 샘플 명령을 deny, ask, allow 순서로 판정하는 테스트 추가 |
| `scripts/test/fixtures/sync-snapshot.json` | 동기화 대상에 새 규칙 파일 추가 |
| `docs/agent-guardrails.md` | 허용 범위와 이유, 한계 기록 |

## 정한 것

- 규칙은 PC별 전역 설정이 아니라 중앙 관리 파일에 둔다. PC마다 적용하는 사용자 단계가 없어지고, 앱 리포는 동기화로 받는다.
- `git switch` 전체를 허용하는 대신 변경을 버리는 옵션은 승인 필요로 뺐다. `git pull`은 `--ff-only`만, `git fetch`는 `origin`만 허용한다.
- 스킬의 명령을 `git switch --create`, `git branch --delete`로 바꿨다. PowerShell 규칙이 대소문자를 구별하지 않아 `-c`·`-d`가 `-C`·`-D` 승인 규칙에 걸리기 때문이다.
- 프로젝트 `allow` 규칙은 신뢰한 폴더에서만 적용된다. 새 PC나 새 클론은 신뢰 수락이 한 번 필요하다.
- 강제 push와 main 직접 push는 지금까지 Bash 전역 설정에서만 막았다. PowerShell 도구에서도 막도록 중앙 규칙에 넣었다.
