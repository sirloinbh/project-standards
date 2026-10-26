# 준수 현황이 하위 폴더 package.json의 공유 패키지도 읽게 하기 (#219)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/compliance.mjs` | `repoStatus`가 루트 `package.json`과 매니페스트에 등록된 하위 `*/package.json`을 모두 읽는다. 한 곳이라도 버전이 다르면 그 값을 보여 주고, 어디에도 없으면 `없음`이다 |
| `scripts/test/compliance.test.mjs` | 하위 폴더에만 있는 패키지, 한 폴더만 버전이 다른 경우, 어디에도 없는 경우를 검사 |

## 이유

- PR #201의 `docs/compliance.md`에 workout-memo가 `✗ @sirloinbh/tsconfig 없음≠1.0.0`으로 나왔다.
- 동기화는 `templates/index.json`대로 `@sirloinbh/tsconfig`를 `frontend/package.json`, `backend/package.json`에 넣는데, 보고서는 루트 `package.json`만 읽었다. workout-memo의 두 파일에는 실제로 `1.0.0`이 들어 있다.

## 확인

- `npm run check`: 통과(테스트 413개 중 412개 통과, 1개 건너뜀, 실패 0)
- `docs/compliance.md`는 다음 정기 실행(`compliance.yml`)이 다시 만든다.
