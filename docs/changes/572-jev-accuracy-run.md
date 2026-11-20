# #572 Jev accuracy run on Korean samples; ADR-0028 accepted

ADR-0028 (#848) left one step for #572: run 20 or more labeled Korean samples through the helper with the real key (#573) and accept or change the 0.9 confidence gate. This change records that run and sets the ADR to Accepted.

## Change

| File | Content |
|---|---|
| `docs/adr/0028-e2e-jev-judge.md` | Status Accepted; the "Accuracy result" section with the run; the vendor route (`https://api.typesafe.ai/v1/systemone`, `JEV_MODEL=jev-latest`) read from the vendor's API reference |
| `docs/test-config.md` | The two variables a recording run sets for the vendor route, and why `JEV_MODEL` is needed (the helper's built-in model name is the OpenRouter one) |

## How the run was done

- The key was read from SSM (`/sirloinbh/shared/jev-api-key`, profile `workout-personal`) into the Node process at run time only; it was not printed, logged, written to `.env`, or committed.
- A throwaway script outside the repo imported `judge()` from `templates/e2e/e2e/support/jev.ts` (Node 24 strips the types) and called it once per sample with `JEV_API_URL=https://api.typesafe.ai/v1/systemone` and `JEV_MODEL=jev-latest`. So the run also checked the helper's request body, auth header, and response parsing against the real API. The fixtures went to a scratch folder and are not committed (they are not app fixtures).
- Calls: 28 (one route test, then 27 samples). Input tokens: 9,430. Cost about $0.0004. The API answered with model `jev-1.14.0`.

## Questions (English, as the ADR says)

| Kind | Type | Instructions |
|---|---|---|
| err | noul | The text is the error a form shows after the user pressed Save. Does it tell the user what to enter or fix? |
| tone | choice | Which describes this error message for the user who sees it? (actionable / vague / blaming, criteria as in the workout-memo pilot) |
| empty | noul | The text is an empty list on an app screen. Does it tell the user what to do next to add the first item? |
| sum | noul | The state has the data the user entered and the summary sentence the app shows. Does the summary describe the same activity, subject, or item as the data (ignore numbers)? |
| tr | choice | Compare the meaning of the Korean source and the English translation. (same / partly / different) |

## Samples and answers

For `noul` the answer is the probability of yes; for `choice` the chosen option and its confidence.

| Id | State | Label | Jev | Agree |
|---|---|---|---|---|
| err-1 | - alert: 날짜와 운동 이름을 입력해 주세요. | true | yes 0.94 | yes |
| err-2 | - alert: 체중, 체지방률, 근육량 중 하나 이상을 입력해 주세요. | true | yes 0.93 | yes |
| err-3 | - alert: 오류가 발생했습니다. | false | yes 0.05 | yes |
| err-4 | - alert: 저장하지 못했습니다. (code 400) | false | yes 0.06 | yes |
| err-5 | - alert: 금액은 0보다 큰 숫자로 입력해 주세요. | true | yes 0.96 | yes |
| err-6 | - alert: 잘못된 요청입니다. | false | yes 0.06 | yes |
| tone-1 | - alert: 공부한 과목을 선택해 주세요. | actionable | actionable (1) | yes |
| tone-2 | - alert: 문제가 생겼습니다. 나중에 다시 시도하세요. | vague | actionable (0.4) | **no** |
| tone-3 | - alert: 입력을 제대로 하세요. 이것도 못 채우나요? | blaming | blaming (1) | yes |
| tone-4 | - alert: 자격증 이름은 100자 이하로 입력해 주세요. | actionable | actionable (1) | yes |
| tone-5 | - alert: 알 수 없는 오류 | vague | vague (1) | yes |
| empty-1 | - heading "운동 기록" [level=2] / - paragraph: 아직 기록이 없습니다. "운동 추가"를 눌러 첫 운동을 기록해 보세요. / - button "운동 추가" | true | yes 0.97 | yes |
| empty-2 | - heading "식단" [level=2] / - paragraph: 데이터 없음 | false | yes 0.08 | yes |
| empty-3 | - heading "가계부" [level=2] / - paragraph: 이번 달 내역이 없습니다. 아래 버튼으로 첫 지출이나 수입을 입력하세요. / - button "내역 추가" | true | yes 0.96 | yes |
| empty-4 | - heading "루틴" [level=2] / - paragraph: 표시할 항목이 없습니다. | false | yes 0.07 | yes |
| empty-5 | - heading "일기" [level=2] / - paragraph: 오늘의 일기를 아직 쓰지 않았어요. "새 일기"를 눌러 시작하세요. / - button "새 일기" | true | yes 0.86 | yes |
| empty-6 | - heading "보유 기술" [level=2] / - paragraph: 목록이 비어 있습니다. | false | yes 0.06 | yes |
| sum-1 | data: {"exercise":"벤치프레스","sets":5} / summary: 오늘 벤치프레스 5세트를 했어요. | true | yes 0.99 | yes |
| sum-2 | data: {"exercise":"스쿼트","sets":3} / summary: 오늘 데드리프트를 했어요. | false | yes 0.02 | yes |
| sum-3 | data: {"subject":"영어","minutes":40} / summary: 영어를 40분 공부했습니다. | true | yes 0.99 | yes |
| sum-4 | data: {"subject":"수학","minutes":30} / summary: 오늘은 한국사를 공부했습니다. | false | yes 0.02 | yes |
| sum-5 | data: {"meal":"점심","food":"김치찌개"} / summary: 점심으로 김치찌개를 먹었어요. | true | yes 0.99 | yes |
| sum-6 | data: {"category":"교통","memo":"택시"} / summary: 식비로 커피를 샀습니다. | false | yes 0.02 | yes |
| tr-1 | source: 나는 매일 아침 30분씩 달린다. / translation: I run for 30 minutes every morning. | same | same (0.98) | yes |
| tr-2 | source: 회의가 내일 오후로 미뤄졌다. / translation: The meeting was cancelled. | different | different (0.97) | yes |
| tr-3 | source: 비가 와서 우산을 챙겼지만 버스를 놓쳤다. / translation: It rained, so I took an umbrella. | partly | partly (1) | yes |
| tr-4 | source: 이 책은 생각보다 훨씬 재미있었다. / translation: This book was much more fun than I expected. | same | same (0.92) | yes |

## Result

- 26 of 27 agree (96%). All 25 answers at the 0.9 gate agree (100%), above the 90% bar in the ADR, so the gate stays at 0.9 and Korean page text stays allowed.
- The only disagreement (tone-2) had confidence 0.40, so in a test it would be a `jev-warning`, not a failure.

## Checks

- `npm run check:docs`: see the PR.
