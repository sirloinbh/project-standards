# #120 UI 컴포넌트를 shadcn/ui로 확정하고 아이콘·이모지 소스 정하기

## 변경

- `docs/adr/0007-shadcn-ui-icons-emoji.md`: shadcn/ui 채택과 소스 직접 작성 방식, lucide-react, Fluent Emoji Flat, 의존성 고정 버전 표, 아이콘·이모지 사용 규칙

## 결정 과정

- **UI 컴포넌트:** 사용자가 조사 없이 shadcn/ui로 정했다.
- **이모지:** 4개 후보를 비교해 사용자에게 물었고, 사용자가 Fluent Emoji Flat을 골랐다.

  | 후보 | 라이선스 | SVG | 비고 |
  |---|---|---|---|
  | Fluent Emoji Flat | MIT (GitHub API로 확인) | 있음 | 고른 것 |
  | Noto Emoji | 이미지 Apache-2.0, 폰트 OFL-1.1 | 있음 | |
  | Twemoji (jdecked 포크) | 그림 CC-BY 4.0, 코드 MIT | 있음 | 저작자 표시 필요 |
  | Tossface | 공식 조건 확인 못 함 | 주로 폰트 | |

- **의존성 버전:** `npm view`(읽기 전용)로 버전, 게시일, 라이선스, 저장소, 설치 스크립트 여부를 조회했다. 2026-10-08 이전에 게시된 버전 중 가장 새 것을 골랐다.
- **lucide-react:** 최신은 1.61.0이지만 앱들이 0.468.0을 쓰고 있다. 메이저 업그레이드라서 지금 버전을 유지하고, 업그레이드 검토는 별도 이슈로 등록했다.

## 검증

- 문서만 바꿨다. `npm run check` 통과.
- ADR의 모든 패키지에 설치 스크립트가 없음을 `npm view <패키지>@<버전> scripts`로 확인했다.
