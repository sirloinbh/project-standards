# #36 여러 앱을 한 Lightsail에 배포하는 구조 결정 (조사·결정 부분)

## 결정 (2026-10-23 사용자, 권장안 그대로)

비교는 #36 댓글, 결정은 [ADR-0009](../adr/0009-multi-app-single-lightsail.md)에 있다. 앱마다 자기 compose와 postgres 컨테이너, 앱별 웹 포트(8101–8108)를 허용 IP에만 공개, 서버 빌드와 서버 공용 배포 잠금, 앱별 autodeploy timer, 두 번째 앱부터 2 GB.

## 변경

| 파일 | 내용 |
|---|---|
| `docs/adr/0009-multi-app-single-lightsail.md` | 새 ADR |
| `docs/costs.md` | 전제를 ADR-0009에 맞춤: 공유 postgres → 앱별 컨테이너, ECR 비용 제거(서버 빌드). 합계 2 GB $13.50 → $13.00, 4 GB $25.50 → $25.00과 앱별 배분 표 재계산. ECR은 "다른 구성" 표로 옮김 |

## 남은 일

- `templates/app/deploy/` 템플릿과 렌더링 테스트·`bash -n`은 #94(workout-memo에서 `infrastructure/` 제거) 이후에 한다.

## 검증

- 재계산: 2 GB $12 + 스냅샷 $1 = $13.00, 앱당 $1.625(세후 2,502.5원 → 2,503원). 4 GB $24 + $1 = $25.00, 앱당 $3.125(4,812.5원 → 4,813원).
- `npm run check` 통과(테스트 392개 모두 통과).
