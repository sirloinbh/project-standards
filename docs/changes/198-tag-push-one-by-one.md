# #198 패키지 태그를 하나씩 push하도록 절차 수정

## 변경

| 파일 | 내용 |
|---|---|
| `docs/user-steps.md` 4-1 | 태그 4개를 한 번에 push하던 명령을 태그별 한 줄로 나눴다. 이유와 이미 한꺼번에 push했을 때 되돌리는 방법을 적었다 |

## 정한 것

- GitHub는 한 번의 push에 태그가 3개보다 많으면 push 이벤트를 만들지 않는다. 2026-10-24 #88에서 4개를 한 번에 push해 publish가 실행되지 않았고, 원격 태그를 지운 뒤 하나씩 다시 push해서 4개 모두 배포했다.

## 검증
- `npm run check` 통과(테스트 400개 중 398 통과·2 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
