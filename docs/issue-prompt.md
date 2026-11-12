# Prompt for writing issue cards outside Claude Code

A copy-paste prompt that turns rough notes into an issue card that follows the sirloinbh rules. Use it where the repo's skills are not loaded, for example in claude.ai chat or another AI tool.

- **Inside Claude Code, in a sirloinbh repo:** you do not need this. Ask for the issue directly; the agent follows [std-backlog](../templates/common/skills/std-backlog/SKILL.md) and [std-git-writing](../templates/common/skills/std-git-writing/SKILL.md), checks for duplicates, and links the parent issue.
- **Anywhere else:** copy the prompt below, replace `{{REPO}}`, `{{PARENTS}}`, and `{{DESCRIPTION}}`, and send it. You get a title, labels, a body, open questions, and a `ghp` command.

The rules in the prompt are copies. The sources are `templates/common/.github/ISSUE_TEMPLATE/task.md` (body sections), `templates/common/labels.json` (labels), std-backlog sections 1–3 (splitting and priority), and std-git-writing section 2 (title and body). When one of them changes, update this prompt in the same PR.

## Copy-paste prompt

````text
You are writing GitHub issue cards for the repository sirloinbh/{{REPO}}. Follow the rules below exactly.

<rules>
LANGUAGE AND FACTS
- Write everything in English, even if my notes are in Korean.
- Use only facts from my notes. Anything I did not say: write TBD. Never invent versions, numbers, file paths, or causes.
- Replace tokens, passwords, API keys, .env values, internal hosts, and personal data with <redacted>.
- Put file paths, commands, and identifiers in backticks. Put errors and logs in fenced code blocks.

SPLITTING
- One issue = one purpose that one PR can review.
- Split when the notes mix unrelated purposes or different repositories.
- Steps I must do myself (create an account or app, register a secret, buy something, approve a package install) go into a separate issue whose title starts with [Manual], with the label needs-user.
- Keep research that only needs confirming as the first task of the implementation issue. Only open a separate issue (type/research) when the direction depends on the result.

TITLE
- No prefix such as "feat:", "[Bug]:", or "type:". The label carries the type.
- One imperative sentence saying what the issue does: "Add ...", "Fix ...", "Move ...", "Decide ...". About 60 characters, no trailing period.
- Name the component and the symptom or goal. Not "Improvements" or "Fix bug".
- Several scopes go in parentheses: "Add Docker build templates (2 Dockerfiles, nginx)".
- Issues I must do myself start with "[Manual] ".

BODY: exactly these six sections, in this order. Never delete a section; write "None" if empty.
## Summary
One sentence: what is different once this issue is done.
## Why
What is wrong today and the evidence (files, docs, error messages). 2–4 lines.
## Tasks
- [ ] one task per line, in order
## Done when
- [ ] statements anyone can verify: tests, command results, files that exist. No "works well" or "improved".
## Blocked by
- "#number short name" for prerequisite issues, or the user step that must happen first, or "None".
## Notes
- Priority: P<n> — one-line reason (if promoted: "promoted from P<m>")
- Parent issue: "#number area name" from the parent list below, or TBD if none fits
- Related docs: paths or links, or "None"

LABELS (use only these names)
- Exactly one priority:
  priority/P0 = operations or security problem that must stop now, or I called it urgent
  priority/P1 = prerequisite for other issues, or cleaning up duplication across repos
  priority/P2 = security and operations standards
  priority/P3 = shared work needed soon, or spreading a feature that exists in one repo only
  priority/P4 = docs and rules cleanup, nice-to-have improvements
  Not enough to judge: P3, and say in Notes that the basis is thin.
- Exactly one type: type/feature (new feature or managed item; also user-visible bug fixes, since there is no bug label), type/docs, type/security, type/chore (migration, cleanup, config), type/research (no code change).
- One or more areas: area/templates, area/tooling, area/compliance, area/registry, area/scaffold, area/ci, area/agent, area/deploy, area/app (app features: screens, API, DB).
- needs-user when the issue includes a step I must do.
- origin/added only when I say the requirement was added in the middle of other work. Then raise the priority one level (P4→P3, P3→P2, P2→P1, P1 stays P1; never to P0) and record the original level in Notes.
- Never use epic; parent issues are created separately.

OPEN PARENT ISSUES (epic) IN THIS REPO
{{PARENTS — e.g. "#410 Fix app template defects and fill gaps in shared rules", or "unknown"}}
</rules>

<notes>
{{DESCRIPTION — paste notes, error messages, screenshot text, chat threads}}
</notes>

Before answering, check every issue against every rule above and fix anything that fails.

Answer with one block per issue, in exactly this format:

### Title
<title>

### Labels
<comma-separated labels>

### Body
```markdown
<the six sections>
```

### Open questions
<bulleted list of every TBD and what you need from me, or "None">

### Command
```powershell
ghp issue create --repo sirloinbh/{{REPO}} --title "<title>" --body-file issue.md --label <label> --label <label>
```
````

## After you get the answer

1. Answer the open questions, or ask the AI to fill the TBDs with your answers.
2. Save the body as `issue.md`, UTF-8 without BOM (in an editor, not PowerShell 5.1 `Set-Content`, which writes the system code page).
3. Search open issues for a duplicate first: `ghp issue list --repo sirloinbh/<repo> --search "<keywords>"`. If one exists, add the tasks there instead.
4. Run the `ghp` command from a terminal where `ghp` exists ([docs/tools.md](tools.md)), then link the new issue to its parent (std-backlog section 6):

   ```powershell
   $id = ghp api repos/sirloinbh/<repo>/issues/<new-number> --jq .id
   ghp api -X POST repos/sirloinbh/<repo>/issues/<parent-number>/sub_issues -F sub_issue_id=$id
   ```

   Or ask an agent in Claude Code to register it from the answer; it does steps 3 and 4 for you.

## Example

Notes: "login breaks when the email has a + in it, getting a 500. seen on prod since yesterday's deploy. pretty urgent"

Answer (abridged):

```text
### Title
Fix the 500 error on login when the email contains a plus sign

### Labels
priority/P0, type/feature, area/app

### Body
## Summary
Users whose email contains `+` can log in again.

## Why
Logging in with an email such as `name+tag@example.com` returns HTTP 500 in production since the latest deploy (date TBD).

## Tasks
- [ ] Reproduce the 500 with a `+` email
- [ ] Find and fix the cause (TBD)
- [ ] Add a test for a `+` email login

## Done when
- [ ] Logging in with a `+` email returns 200 in a test
- [ ] `npm run check` passes

## Blocked by
- None

## Notes
- Priority: P0 — production login failure; the user called it urgent
- Parent issue: TBD
- Related docs: None

### Open questions
- Which deploy (commit or date) started it?
- A server log or stack trace for one failing request?
- Which parent issue (epic) should it go under?
```
