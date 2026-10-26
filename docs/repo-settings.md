# 리포 설정 기준

9개 하위 리포의 GitHub 설정 기준이다(#22). 준수 현황(`docs/compliance.md`, 매일)의 "리포 설정" 열과 절이 이 기준과 비교한 결과다. 동기화 App의 Administration·Secrets·Variables **읽기** 권한으로 확인하고, 설정을 바꾸지는 않는다([ADR-0002](adr/0002-github-app-for-sync.md)).

## 기준

| 항목 | 기준 | 수준 | 이유 |
|---|---|---|---|
| 기본 브랜치 | `main` | 필수 | 동기화·CI·배포가 `main`을 기준으로 한다 |
| 병합 커밋 허용 | 켬 | 필수 | 에이전트와 사용자가 `--merge --match-head-commit`으로 병합한다([git-conventions.md](git-conventions.md)) |
| squash·rebase 병합 | 끔 | 권장 | 병합 방식을 하나로 두면 이력에서 PR 단위를 찾기 쉽다 |
| 병합 후 브랜치 자동 삭제 | 켬 | 권장 | 병합한 브랜치가 쌓이지 않는다 |
| Actions 기본 토큰 권한 | `read` | 필수 | 워크플로가 필요한 권한만 `permissions:`로 올린다 |
| Actions의 PR 승인 | 끔 | 필수 | 자동화가 자기 PR을 승인해 보호 규칙을 피하지 못하게 |
| `main` 브랜치 보호 | 켬, 필수 검사 1개 이상, 강제 push·삭제 금지 | 필수 (공개 리포) | CI를 통과하지 않은 변경이 `main`(=배포)에 들어가지 않게 |
| secret scanning, push protection | `enabled` | 필수 (공개 리포) | 토큰·키가 커밋되면 막거나 알린다 |
| Dependabot 취약점 알림 | 켬 | 필수 | 공급망 공격 대응. 보안 업데이트만 쓰는 정책([dependency-policy.md](dependency-policy.md))의 전제 |
| Dependabot 보안 업데이트 | 켬 | 필수 | 같은 이유. 버전 업 PR은 `.github/dependabot.yml`이 막는다 |
| Actions secret·variable 이름 | `sync.config.json` 대상의 `secrets`·`variables` 목록과 같음 | 필수(없는 이름) / 권장(목록에 없는 이름) | 필요한 secret이 빠졌거나, 쓰지 않는 secret이 남아 있지 않은지 |

- **비공개 리포와 요금제:** GitHub Free에서는 비공개 리포에 브랜치 보호(규칙 포함)와 secret scanning을 쓸 수 없다. 준수 현황에는 실패가 아니라 "— 요금제"로 표시한다. 지금 workout-memo만 공개이고 나머지 8개와 중앙 리포는 비공개다(2026-10-22).
- **값은 다루지 않는다.** secret API는 이름만 돌려준다. variable API는 값도 돌려주지만 받자마자 버리고 이름만 남긴다. 테스트(`scripts/test/repo-settings.test.mjs`)가 보고서에 값이 나오지 않는지 확인한다.
- secret·variable 목록은 지금 모든 리포가 빈 목록이다. 앱 CI는 `GITHUB_TOKEN`만 쓴다. 리포에 secret이 필요해지면 `sync.config.json`의 그 대상에 이름을 더한다.

## 2026-10-22 확인 결과

개인 계정의 읽기 API로 미리 실행한 결과다. 준수 현황은 App이 설치된 뒤(#86) 매일 같은 내용을 보여 준다.

| 리포 | 필수 위반 | 권장 | 요금제로 불가 |
|---|---|---|---|
| workout-memo (공개) | 브랜치 보호 없음, secret scanning·push protection 꺼짐, Dependabot 알림·보안 업데이트 꺼짐 | squash·rebase 켜짐, 브랜치 자동 삭제 꺼짐 | — |
| 나머지 8개 (비공개) | Dependabot 알림·보안 업데이트 꺼짐 | 같음 | 브랜치 보호, secret scanning |

기본 브랜치, 병합 커밋, Actions 토큰 권한(`read`)과 PR 승인(끔)은 9개 모두 기준과 같다. secret·variable은 9개 모두 없다.

## 맞추는 법 [사용자]

설정 변경은 사용자가 한다. 아래 명령은 개인 계정(`ghp`)으로 실행한다. `<리포>`에 리포 이름을 넣는다.

```powershell
# Dependabot 알림과 보안 업데이트 켜기 (9개 모두)
ghp api -X PUT repos/sirloinbh/<리포>/vulnerability-alerts
ghp api -X PUT repos/sirloinbh/<리포>/automated-security-fixes

# 병합 방식 (권장)
ghp api -X PATCH repos/sirloinbh/<리포> -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

workout-memo(공개)는 추가로 secret scanning과 브랜치 보호를 켠다. 브랜치 보호의 필수 검사 이름은 첫 동기화(#97)로 CI 호출부가 바뀐 뒤의 이름을 써야 하므로, 브랜치 보호는 #97 병합 뒤에 설정한다.

```powershell
# secret scanning, push protection
# 래퍼는 파이프 입력을 받지 않으므로 JSON을 임시 파일로 넘긴다(#228)
$f = Join-Path $env:TEMP 'workout-memo-security.json'
'{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' | Set-Content -Encoding ascii $f
ghp api -X PATCH repos/sirloinbh/workout-memo --input $f --jq '.security_and_analysis'
Remove-Item $f
```

브랜치 보호는 웹에서 설정하는 것이 쉽다: workout-memo → Settings → Branches → Add branch protection rule(`main`) → "Require status checks to pass"에서 CI 검사 선택, "Allow force pushes"·"Allow deletions"는 끈다.

비공개 리포에도 브랜치 보호와 secret scanning을 쓰려면 GitHub Pro로 바꾸거나 리포를 공개해야 한다. 이건 사용자가 정할 일이다.
