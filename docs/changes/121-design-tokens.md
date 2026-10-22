# #121 디자인 토큰 전체 정하기

## 변경

| 파일 | 내용 |
|---|---|
| `design/tokens.json` | 디자인 토큰 원본: 글꼴, 글자 크기·굵기, 글자 스타일, 간격, 모서리, 그림자·테두리, 반응형 기준점, 아이콘 크기, z-index, 움직임, 로딩 표시, 색. workout-memo 기존 토큰 대응표 포함 |
| `docs/design-tokens.md` | 위 파일에서 자동 생성한 표 |
| `scripts/gen-docs.mjs` | `docs/design-tokens.md` 생성 추가. `--check`가 두 생성 문서를 모두 확인한다 |
| `scripts/test/tokens.test.mjs` | 토큰 일관성 테스트 6개 |

## 정한 값과 이유

| 항목 | 값 | 이유 |
|---|---|---|
| 글꼴 | Pretendard Variable 1.3.9, 직접 제공 | 사용자 지정. 외부 CDN 없이 패키지로 제공해 오프라인·PWA(#125)에서도 동작 |
| 글자 크기 | Tailwind 기본 단계 xs–3xl | shadcn/ui 컴포넌트와 같은 단계 |
| 본문 줄 높이 | 1.6 | 한국어 본문 가독성 |
| 제목 | h1–h4 모바일·데스크톱 2단계 크기, h1 700, h2–h4 600 | 모바일 우선 반응형 |
| 보조·주석 텍스트 | `caption`(14px, muted-foreground), `meta`(12px) | 사용자 요청: 주석 텍스트 스타일 통일 |
| 간격 | 4px 단위, 페이지 여백 16·24·32px | Tailwind spacing 기준 |
| 모서리 | 기준 10px, 6·8·10·14px | shadcn/ui 기본 `--radius` |
| 반응형 | 모바일 우선, 최소 360px, `md`(768px)에서 LNB가 사이드바로 바뀜, 터치 영역 44px | 사용자 요청: 모바일 최적화 필수 |
| 로딩 | shadcn Skeleton과 lucide `Loader2Icon` 스피너, 300ms 안에 끝나면 표시 안 함 | 사용자 요청: 스켈레톤·스피너 통일 |
| 색 | shadcn/ui neutral, 성공·주의 추가. 앱마다 다른 것은 테마 색 6개뿐 | 사용자 요청: 이름과 테마 색만 구별 |
| 다크 모드 | 아직 정하지 않음 | 요청 범위 밖. 도입할 때 토큰 파일에 추가 |

## 검증

- `npm run check`: 테스트 85개 통과, `registry-check: ok`, 두 생성 문서 최신
- Pretendard 라이선스: GitHub API로 LICENSE 원문을 읽어 SIL Open Font License 형식(Reserved Font Name 표기)임을 확인했다. GitHub의 자동 판별은 `NOASSERTION`이었다.
- #65의 할 일에 "토큰 CSS는 `design/tokens.json`에서 생성, Pretendard 1.3.9 woff2와 OFL 고지 포함"을 추가했다.
