# #240 앱 8개 의존성·기술 스택 비교

조사 결과와 공통화 후보는 [docs/research/stack-survey.md](../research/stack-survey.md)에 있다. 아무것도 설치하지 않았다.

## 확인한 방법

- 앱 8개 리포를 `git fetch` 한 뒤 `origin/main`의 `package.json` 3개와 `package-lock.json` 3개를 `git show`로 읽어 비교했다.
- 열린 의존성 PR: `node tools/dependency-prs.mjs list`

## 함께 고친 문서

- `docs/stack.md`: 근거를 앱 8개 기준으로 바꾸고, 낡은 "사용 중" 칸(라우팅, 스타일, 테스트)을 고쳤다.
- `docs/dependency-policy.md`: "lucide-react 앱 설치본은 아직 0.468.0" 비고를 지웠다(지금은 8개 앱 모두 1.52.0).
