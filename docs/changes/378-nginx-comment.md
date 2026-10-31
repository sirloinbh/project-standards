# #378 nginx.conf 템플릿 주석을 앱 요청 제한에 맞게 수정

- 이슈: [#378](https://github.com/sirloinbh/project-standards/issues/378)
- 브랜치: `docs/378-nginx-comment`

## 목적

템플릿 주석이 "API에는 제한이 없다"고 단정했다. `sirloinbh/life-journal`은 API에 요청 제한을 넣어 이 주석이 사실과 달라졌다(life-journal#34).

## 변경 — 2026-11-01

`templates/app/frontend/nginx.conf.tmpl`의 주석만 고쳤다. 앱이 API에 제한을 더할 수 있고, 이 제한은 그 앞단에서 적용된다고 적었다. 설정 줄은 그대로다.

## 검증

- `git diff`: 바뀐 줄은 주석뿐이다.
- 이 작업 폴더에는 의존성을 설치하지 않아 `npm run check`를 로컬에서 돌리지 않았다. 결과는 PR의 CI로 확인한다.
