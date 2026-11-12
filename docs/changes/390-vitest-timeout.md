# #390 Raise the app frontend test timeout to 15 seconds

- Issue: [#390](https://github.com/sirloinbh/project-standards/issues/390)
- Found in: [sirloinbh/cert-manager#80](https://github.com/sirloinbh/cert-manager/issues/80)

## Purpose

When other work runs on the same PC, an app's screen tests hit the Vitest default limit of 5 seconds, and a required check fails regardless of the code. The user decided on 15 seconds (2026-11-01).

## Change

- `templates/vitest/frontend/vitest.config.ts.tmpl`: added `testTimeout: 15_000`.
- `docs/test-config.md`: recorded the value and the reason.

It reaches apps with `features.vitest` on through the sync PR. The list of files they receive does not change, so the snapshot is unchanged.

## Measurement

I ran the whole cert-manager frontend on a PC with 12 CPU cores. I measured with the `--testTimeout` option, without changing the app config file.

| Limit | Load | Runs | Failures | Slowest test |
| ---- | ---- | ---: | ---: | ---: |
| 5 s | 24 busy processes | 3 | 9 to 18 per run | 10.3 to 12.6 s (failed) |
| 15 s | 24 or more busy processes | 3 | 0 | 11.5 to 14.5 s except the first run |
| 5 s | little other work | 4 | 0 | 1.9 to 2.2 s |

- During the 15 s measurement, some load processes from the earlier measurement had not finished, so the load was greater than 24. The exact amount was not measured.
- In the first 15 s run, the time record shows the slowest test as 3.6 s, which does not match the run time of 260 s. I did not look for the cause and record only 0 failures.
- The margin is not large. Under a heavier load, even 15 s could be reached.
- Other apps were not measured.

## Checks

- `npm run check`: passed.

## Limits and follow-up

- The user merges the sync PRs on the app side.
