# #242 앱 8개 프런트엔드 반복 UI·공통 코드

조사 결과와 공통화 후보는 [docs/research/ui-survey.md](../research/ui-survey.md)에 있다. 코드는 바꾸지 않았다.

## 확인한 방법

- 앱 8개 리포 `origin/main`의 `frontend/src` 파일 목록을 비교하고, 기능 화면이 있는 3개 앱의 화면 코드를 `git show`로 읽었다.
- 반복 요소는 패턴(`confirm(`, `role="status"`, `<button>`·`<Button>`, `fetch(`, `type="date"`, `Skeleton`·`Spinner`)을 세고, 걸린 곳을 직접 읽어 확인했다.
- 공통 컴포넌트 목록은 [ui-components.md](../ui-components.md)와 비교했다.
