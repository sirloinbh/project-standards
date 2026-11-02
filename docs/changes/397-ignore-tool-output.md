# #397 중앙 리포 .gitignore에 도구 부산물 폴더 추가

## 변경

| 파일 | 내용 |
|---|---|
| `.gitignore` | `.bkit/`, `.playwright-mcp/` 추가 |

## 앱 8개

앱이 받는 `templates/common/.gitignore.tmpl`에는 두 폴더가 이미 있다. 앱 8개의 `.gitignore`에도 있음을 확인해서 동기화 PR이 따로 필요 없다.

## 검증

- `git check-ignore`: 두 폴더 모두 무시됨
- `npm run check`: 통과
