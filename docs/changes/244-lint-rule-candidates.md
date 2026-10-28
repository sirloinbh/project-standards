# #244 공유 ESLint·Prettier 설정 보강 후보

조사 결과와 권장안은 [docs/research/lint-rules.md](../research/lint-rules.md)에 있다. 코드는 바꾸지 않았고, 아무것도 설치하지 않았다.

## 확인한 방법

- 패키지 정보: `npm view <패키지> --json`(읽기 전용), deps.dev API(보안 권고), npm 다운로드 API
- 위반 수: 앱 8개에 이미 설치된 `eslint`·`typescript-eslint`를 Node API로 불러 `recommendedTypeCheckedOnly`를 켜고 셌다. 앱 파일은 바꾸지 않았다.

## 다음 단계

- 사용자가 권장안을 확인하면 "결정"에 적는다.
- #245에서 패키지 4개 설치를 승인받고, #246에서 공유 설정에 넣는다.
