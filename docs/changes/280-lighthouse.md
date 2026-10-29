# #280 workout-memo CI에서 Lighthouse CI 점수 경고 시험

## 변경

| 파일 | 내용 |
|---|---|
| `templates/lighthouse/lighthouserc.json` | 새 기능 폴더. `npm run check`가 만든 `frontend/dist`를 정적으로 띄워 한 번 잰다. 접근성 0.9, 모범 사례 0.9, 성능 0.8 미만이면 경고 |
| `sync.config.json`, `registry/projects.schema.json`, `registry/projects.json` | `features.lighthouse`. workout-memo만 켠다 |
| `.github/workflows/reusable-app-ci.yml` | `verify` job의 knip 다음에 Lighthouse 단계. 점수를 로그와 작업 요약에 쓰고, 보고서는 artifact(`lighthouse-report`, 7일)로 남긴다 |
| `templates/app/.prettierignore.tmpl`, `templates/common/.gitignore.tmpl` | `lighthouserc.json`, `.lighthouseci/` |
| `scripts/test/lighthouse.test.mjs` 등 | 경고만 내는지, workout-memo만 받는지 |

## 정한 것

- 방식: npm 패키지 `@lhci/cli` 0.15.1(앱 lockfile에 고정). 외부 Action은 실행 때마다 고정되지 않은 `@lhci/cli`를 내려받아 쓰지 않았다(#245 승인 댓글).
- 화면: 빌드된 첫 화면(`index.html`) 하나. 백엔드 없이 정적 파일로 재므로 API 호출은 실패한 상태의 점수다. 화면별 측정은 #281(MSW 목)로 데이터를 채울 수 있게 된 뒤 늘린다.
- 기준 점수는 시험값이다. workout-memo 동기화 PR의 첫 점수를 보고 #280에 기록하고 다시 정한다.
- 기준 미달과 측정 실패 모두 CI를 멈추지 않는다. 결과 업로드는 공개 서버가 아니라 작업 안의 파일(`filesystem`)로만 한다.
- Chrome은 러너 이미지(ubuntu-24.04)에 설치된 Google Chrome을 쓴다(e2e job과 같음).

## 다른 앱에 켜기

앱 루트에 `@lhci/cli`를 설치(승인 필요, `--ignore-scripts`)한 뒤 레지스트리 `features.lighthouse`를 `true`로 바꾼다.

## 검증

- `npm run check`: PR 본문에 기록
