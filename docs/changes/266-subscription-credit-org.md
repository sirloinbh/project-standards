# #266 구독 API 크레딧 조직과 금액 고치기

## 변경

| 파일 | 내용 |
|---|---|
| `docs/user-steps.md` | 10번 2단계를 월 $200, 조직 `Quantified ESG` 기준으로 고침 |
| `docs/adr/0010-claude-api-key-ssm.md` | 조직 결정과 그 영향을 변경 기록에 추가 |

## 정한 것

- 사용자가 크레딧이 이미 연결된 `Quantified ESG` 조직을 그대로 쓰기로 정했다(2026-11-01). workspace 이름은 처음에 문서에 있던 `sirloinbh-apps`로 했다가, 사용자 요청으로 `byunghk-tool`로 바꿨다. 서버 IAM 사용자 이름(`sirloinbh-apps-*`)은 별개라 바꾸지 않았다.
- ADR-0010의 2026-10-29 기록은 당시 사실이므로 고치지 않고 새 기록을 더했다.

## 확인

- 금액과 조직 이름은 사용자가 준 Billing 화면과 답변을 따랐다. Console은 직접 보지 않았다.
- 키 발급과 SSM 입력은 사용자 단계로 남아 있다.
