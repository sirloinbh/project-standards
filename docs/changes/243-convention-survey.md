# #243 Compare the code conventions of the 8 apps

The survey results and adoption candidates are in [docs/research/convention-survey.md](../research/convention-survey.md). No code was changed.

## How it was checked

- Counted the file name forms and test locations from the file lists on `origin/main` of the 8 app repos.
- In the screen code, counted import paths (`@/` and relative), `export default`, the component declaration style, and `type` and `interface`.
- Read the app-specific skills `skills/<app>-*/SKILL.md` and compared them with the central skills (`templates/common/skills/`).
