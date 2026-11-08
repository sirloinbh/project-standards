# #401 도메인 규칙에 주식 수량·외화·환율 규칙 추가

## 변경

| 파일 | 내용 |
|---|---|
| `docs/conventions/domain.md` | 금액 절에 "외화·수량·환율" 하위 절 추가. "필요해지면 money-ledger에서 정한다"는 마지막 줄을 지우고, 첫 줄을 "원화 금액은 원 단위 정수"로 좁힘 |

## 정한 것

- 규칙은 money-ledger `AGENTS.project.md`의 "수량·외화·환율"(sirloinbh/money-ledger#35, 2026-11-03 사용자 결정)을 옮겼다. 새로 정한 규칙은 없다.
- 다른 앱도 읽을 수 있게 공통 규칙(형식 표, 계산·반올림·합계)만 옮겼다. 컬럼별 `CHECK` 조건과 거래 행 구성은 money-ledger 원본을 가리킨다.
- 시세·환율 출처와 주기는 앱마다 다를 수 있어 money-ledger `docs/price-source.md`(#36)를 예로만 적었다.
- `docs/conventions/`는 하위 리포에 동기화되지 않아 동기화 PR은 생기지 않는다.

## 확인

- `npm run check` 통과.
