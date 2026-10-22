# #41 비용 문서 중앙 이전과 앱별 배분

## 변경

| 파일 | 내용 |
|---|---|
| `docs/costs.md` | workout-memo `docs/shared-hosting-costs.md`의 공유 서버 월 비용(2 GB $13.50, 4 GB $25.50)과 근거를 옮겼다. 앱별 배분 기준(서버·스냅샷은 운영 중인 앱 수로 균등, ECR은 저장량 비례·측정 전 균등)과 8개 앱 배분 표, 운영 앱 수별 앱당 금액을 추가했다. 계정 ID·리소스 식별자·비밀값은 넣지 않았다 |

## 정한 것

- 배분은 청구를 나누는 것이 아니라 관리용이다. 앱별 메모리 사용량을 아직 측정하지 않아 균등 배분을 기본으로 했다.
- 아직 배포하지 않은 앱은 배분하지 않는다. workout-memo만 운영 중이면 서버 비용 전체가 workout-memo 몫이다.
- 금액은 원본 문서의 요금 확인일(2026-10-15) 기준을 그대로 썼다. 새로 조회하지 않았다.

## 하위 리포

- workout-memo에 링크 교체 이슈를 등록했다(sirloinbh/workout-memo#139). 표준 라벨이 그 리포에 없어서 라벨 없이 등록했다(라벨 동기화는 #40).

## 검증

- 문서만 바꿨다. `npm run check` 통과(테스트 166개 중 165 통과·1 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows).
