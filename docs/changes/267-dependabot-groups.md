# #267 Dependabot 보안 업데이트를 앱마다 PR 2개로 묶기

## 문제

앱 8개에 같은 보안 업데이트 3종(`zod`, `body-parser`, `undici`)이 PR 34개로 열려 있었다(#256 조사). 앱마다 lockfile이 3개라 Dependabot이 디렉터리마다 PR을 따로 열었다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/.github/dependabot.yml` | npm 항목 하나에 `directories: [/, /frontend, /backend]`. `groups`의 `applies-to: security-updates`로 마이너·패치 묶음과 메이저 묶음을 나눔. `open-pull-requests-limit: 0`(버전 업 PR 막기)과 github-actions 항목은 그대로 |
| `scripts/test/dependabot.test.mjs` | npm 항목 하나, 디렉터리 3개, 버전 업 막기, 두 보안 업데이트 묶음 확인 |
| `docs/dependency-policy.md` | 묶음 규칙, 기존 PR 처리 순서 |

근거: GitHub 문서 [Configuring Dependabot security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates) — `groups`에 `applies-to: security-updates`를 쓰면 보안 업데이트를 한 PR로 묶고, `directories`에 manifest 위치를 모두 넣으면 디렉터리를 넘어 묶는다.

## 검증

- `node --test scripts/test/dependabot.test.mjs`: 3개 통과
- `npm run check`: 테스트 442개 중 441개 통과, 1개 건너뜀, 실패 0
- 실제 묶음 동작은 동기화 PR이 앱에 반영된 뒤 다음 Dependabot 실행에서 확인한다.
