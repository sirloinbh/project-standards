# 0001. A안(npm 패키지)과 B안(템플릿 동기화)의 역할 분담

- 상태: 제안 (이슈 #1)
- 날짜: 2026-10-22

## 맥락

8개 앱은 ESLint·Prettier·tsconfig 설정과 `.editorconfig` 등 설정 파일이 이미 같다(design.md 1.1). 하지만 모두 복사본이라서 한 곳을 고치면 8번 반복해야 한다. 공유 대상 중 일부는 `extends`나 `import`로 불러올 수 있고, 일부(`AGENTS.md`, 스킬, 워크플로, `.gitattributes`)는 파일이 리포에 직접 있어야 동작한다.

## 결정

- 불러올 수 있는 설정은 A안 패키지로 배포한다: `@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens`.
- 파일로 있어야 하는 것은 B안 템플릿 동기화로 배포한다. 패키지를 불러오는 진입 파일(`eslint.config.mjs`, `prettier.config.mjs`(#246 전에는 `.prettierrc.json`), `tsconfig.json`)도 B안 관리 파일로 둔다.
- 하위 리포의 `.standards/manifest.json` 하나가 두 경로의 기준이다. 중앙 SHA, 관리 파일 해시, 패키지 버전을 모두 여기에 기록한다.
- 패키지 버전을 올릴 때도 B안 동기화 PR로 한다. Renovate·Dependabot의 버전 업 PR은 쓰지 않는다.

## 결과

- 설정 규칙이 바뀌면 패키지 버전만 올리면 되고, 진입 파일은 거의 바뀌지 않는다.
- 하위 리포는 private 레지스트리 인증이 필요해진다. CI, Docker 빌드, 운영 서버 각각에 인증 경로를 따로 설계해야 한다(design.md 4.3).
- 버전 변경 경로가 sync 하나로 모이므로, 어떤 리포가 어떤 버전을 쓰는지 `docs/compliance.md`에서 한 번에 볼 수 있다.
