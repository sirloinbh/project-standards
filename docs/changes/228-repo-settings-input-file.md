# #228 리포 설정 문서의 secret scanning 명령 고치기

`docs/repo-settings.md`의 secret scanning·push protection 명령은 JSON을 파이프로 `ghp api ... --input -`에 넘겼다. 래퍼 `gh-project.ps1`은 파이프라인 입력을 받지 않아 `InputObjectNotBound`와 HTTP 400으로 실패했다(2026-10-26 사용자 실행).

## 변경

| 파일 | 내용 |
|---|---|
| `docs/repo-settings.md` | JSON을 임시 파일에 쓰고 `--input <파일>`로 넘긴 뒤 지우는 명령으로 바꿈 |

## 검증

- `npm run check`: 통과
