# #378 Fix the nginx.conf template comment to match app request limits

- Issue: [#378](https://github.com/sirloinbh/project-standards/issues/378)
- Branch: `docs/378-nginx-comment`

## Purpose

The template comment stated flatly that "there is no limit on the API". `sirloinbh/life-journal` added a request limit to its API, so this comment became untrue (life-journal#34).

## Change (2026-11-01)

Only the comment in `templates/app/frontend/nginx.conf.tmpl` was fixed. It now says that an app may add a limit on the API, and that this limit is applied behind it. The config lines are unchanged.

## Checks

- `git diff`: the only changed lines are comments.
- Dependencies are not installed in this working folder, so `npm run check` was not run locally. The result is checked through the PR's CI.
