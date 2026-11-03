# #399 money-ledger 레지스트리 이름과 소개에 모의투자 넣기

## 왜

money-ledger의 범위가 가계부, 자산 포트폴리오, 모의투자 세 영역으로 정해졌고 앱 안의 이름은 sirloinbh/money-ledger#65에서 `가계부·자산·모의투자`로 바뀌었다. 레지스트리 값으로 만드는 `manifest.webmanifest`, `offline.html`, `AGENTS.md`는 앱에서 고칠 수 없어 이름이 달랐다.

## 변경

| 필드 | 전 | 후 |
|---|---|---|
| `title`, `displayName` | 가계부·자산 포트폴리오 | 가계부·자산·모의투자 |
| `domain` | 가계부 | 재무 |
| `summary` 첫 문장 | 수입과 지출, 자산 포트폴리오를 기록하고 흐름을 확인하는 개인 서비스. | 수입과 지출, 자산 포트폴리오를 기록해 흐름을 확인하고, 모의투자로 투자 판단을 연습하는 개인 서비스. |

- `domain`은 다른 앱처럼 한 단어로 두되 세 영역을 모두 덮는 `재무`로 정했다. `docs/projects.md` 표에만 쓰인다.
- `docs/projects.md`를 다시 생성했다. 하위 리포가 받는 파일 목록은 같아서 스냅샷은 바뀌지 않았다.

## 검증

- `npm run sync:preview`: money-ledger의 `frontend/public/manifest.webmanifest`, `frontend/public/offline.html`, `AGENTS.md`에 새 이름이 들어가고, 옛 이름은 미리보기 어디에도 남지 않음
- `UPDATE_SNAPSHOT=1 npm test`: 517개 통과, 스냅샷 변화 없음
- `npm run check`: 통과

## 남은 일

- 병합 뒤 열리는 money-ledger 동기화 PR을 검토해 이 이슈에 기록한다. 그 PR에서 `npm run standards:check`가 통과하는지 확인한다. 병합은 사용자가 한다.
