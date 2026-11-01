# #381 패키지 설치 차단 훅이 npm -- install을 막지 못하는 문제 수정

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/hooks/block-package-installs.mjs`와 복제본 | 명령을 찾기 전의 `--`를 옵션 끝으로만 처리 |
| `scripts/test/package-install-hook.test.mjs` | `--` 앞뒤의 차단·통과 사례 추가 |

## 정한 것

- 판정 함수가 `--`에서 멈춰서, npm이 명령으로 받는 `--` 뒤의 단어를 보지 못했다. 이제 `--` 뒤의 첫 명령어를 판정한다.
- 명령을 찾으면 판정이 끝나므로 `npm run x -- install`, `npm test -- --watch`는 지금처럼 통과한다.
- `--` 뒤의 옵션 모양 단어는 옵션으로 건너뛰지 않는다. npm도 명령이 아닌 단어로 받기 때문이다.

## 확인

- 테스트의 차단 사례는 판정만 확인한다. `npm -- install`을 실제로 실행하지 않았다.
