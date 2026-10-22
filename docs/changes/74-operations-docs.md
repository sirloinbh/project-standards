# #74 운영 절차 문서 (GitHub App 절차서, README)

## 변경

| 파일 | 내용 |
|---|---|
| `docs/github-app.md` | 동기화 App 만들기, 개인키 등록, 설치, 하위 리포의 중앙 CI 호출 허용, 동작 확인, 키 교체, 권한 변경 절차. 사용자가 직접 할 단계는 [사용자]로 표시 |
| `docs/adr/0002-github-app-for-sync.md` | 권한에 Administration·Secrets·Variables **읽기**를 추가했다(준수 현황에서 설정과 secret 이름만 확인). Issues 쓰기는 라벨 동기화(#40) 때 추가한다 |
| `README.md` | 현재 상태, 명령표, 새 프로젝트 추가, 규칙 바꾸기, 하위 리포에서 standards-check가 실패했을 때의 대응 |

## 검증

- 문서만 바꿨다. `npm run check` 통과(테스트 73개, registry-check, docs check).
- 문서 안의 상대 링크가 실제 파일을 가리키는지 확인했다(아래 PR 본문).
