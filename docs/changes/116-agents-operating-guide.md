# #116 중앙 AGENTS.md 운영 지침화 (일부)

#116의 두 할 일 중 "AGENTS.md: 검증 명령, 동기화·배포 절차, 금지 사항"을 먼저 했다. 사용자 단계나 #115와 관계없이 할 수 있기 때문이다. "준수 현황 정기 실행"은 `compliance.yml`에 매일 실행(cron)이 이미 있고 GitHub App 변수(`SYNC_APP_ID`, #86)가 생기면 동작하므로, 첫 보고서 PR과 9개 리포 확인은 #115 이후에 한다.

## 변경

| 파일 | 내용 |
|---|---|
| `AGENTS.md` | "현재 단계: 설계 전"을 "적용 준비"로 바꿈. 검증 명령, 원본과 복제본 표, 동기화와 배포, 금지 사항 절 추가. 도구 위치를 새 위치(#21)와 예전 위치 둘 다 적음. "동기화 스크립트가 생기기 전까지는" 문구를 "동기화 스크립트는 하위 리포만 갱신한다"로 |
| `README.md` | "현재 상태" 첫 문장을 AGENTS.md와 맞춤 |

## 확인

- 이 리포의 `.claude/skills/`, `.github/` 템플릿이 `templates/common/` 원본과 같은지 비교했다(머리말 제외). 다른 파일 없음.
- AGENTS.md가 가리키는 경로(`templates/*`, `publish.yml`의 `*/v*` 태그, `docs/dependency-policy.md`, `docs/agent-guardrails.md`)가 있는지 확인했다.
- `npm run check` 통과(테스트 392개 모두 통과).
