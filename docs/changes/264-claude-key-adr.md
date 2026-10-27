# #264 Claude API 키 관리 방식 결정

## 결정

사용자가 원본을 **AWS SSM Parameter Store**(SecureString)로, 키는 **지금은 1개**로 골랐다(2026-10-27). 비교는 #264 댓글, 결정은 [ADR-0010](../adr/0010-claude-api-key-ssm.md)이다.

## 변경

| 파일 | 내용 |
|---|---|
| `docs/adr/0010-claude-api-key-ssm.md` | 원본 위치, 서버·로컬·CI 전달 경로, 키 수, 교체, 환경변수 이름 |
| `docs/env-conventions.md` | 공통 키 `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` |

구현은 #265, 사용자 단계는 #266이다.

## 검증

- `npm run check`: PR 본문 참고
