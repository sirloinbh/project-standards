# A transient image-push failure no longer stops the deploy (#923)

- `reusable-app-ci.yml` and `reusable-service-ci.yml`: the image-push job runs each `docker build` and `docker push` through `retry`, which tries 3 times with 10 s and 20 s pauses and then fails. A network blip (money-ledger, 2026-11-21: `npm ECONNRESET` inside the image build) no longer turns main CI red.
- Decided to keep a persistent image-push failure blocking autodeploy: with pull on the image is missing, and a build that fails three times is a real problem worth stopping for.
- `scripts/test/image-push-ci.test.mjs`: every build and push in both jobs uses `retry`; the function is run in bash for a flaky step (succeeds on the third call) and a broken one (gives up after 3).
