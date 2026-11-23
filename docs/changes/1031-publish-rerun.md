# #1031 Let the package release workflow rerun after a failed Release record

- Issue: [#1031](https://github.com/sirloinbh/project-standards/issues/1031)
- Branch: `fix/1031-publish-rerun`
- Related: #70, #205

## Changes — 2026-11-23

`.github/workflows/publish.yml`:

- The Publish step runs `npm view @sirloinbh/<package>@<version> version` first and skips `npm publish` when the version is already there. Before this, a rerun after `npm publish` succeeded and `gh release create` failed stopped at `npm publish` (npm refuses to publish a version twice), so no Release was ever created and `verifyPackages` failed every sync target with "no release for tag".
- The Record step ends without an error when `gh release view "$TAG"` finds the Release, so a rerun never fails on a Release that exists.
- Both steps stay loud on other errors: when `npm view` or `gh release view` fails for a reason other than "not found", the publish or create runs and reports its own error.

## Verification

- `node --test scripts/test/workflows.test.mjs`: 12 passed, including the new test (the version lookup comes before `npm publish`, the Release lookup before `gh release create`, an existing Release ends the step with `exit 0`).
- `npm run check`: passes.
- The workflow itself runs only on a tag push (a user step), so the rerun path was not run on GitHub.
