# #356 ConfirmDialog를 trigger 없이 열면 닫은 뒤 포커스가 사라지는 문제 고치기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/confirm-dialog.tsx` | `returnFocusRef` prop 추가 |
| `templates/ui/frontend/src/components/ui/confirm-dialog.test.tsx` | 지정한 곳으로 돌아감, `trigger` 동작 유지, 빈 ref 사례 추가 |
| `docs/ui-components.md` | 쓰는 법 추가 |

## 정한 것

- `onCloseAutoFocus`를 그대로 넘기지 않고 ref 하나만 받는다. 앱은 돌아갈 곳만 정하면 되고, Radix 이벤트를 다루지 않아도 된다.
- ref가 비어 있으면 Radix 기본 동작을 그대로 둔다.
- 동기화 뒤 cert-manager `frontend/src/exam-attempts.tsx`의 질문 상자에 돌아갈 곳을 넘기는 일은 그 리포에서 한다.

## 확인

- 템플릿 파일을 임시 폴더로 복사해, cert-manager에 이미 설치된 패키지로 `vitest`를 돌렸다. 설치는 하지 않았다.
- 실제 앱 화면과 브라우저에서는 확인하지 않았다. 앱 CI는 동기화 PR에서 돈다.
