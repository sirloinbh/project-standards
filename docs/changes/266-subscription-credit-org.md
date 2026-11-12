# #266 Fix the organization and amount of the subscription API credit

## Change

| File | Content |
|---|---|
| `docs/user-steps.md` | Fixed step 2 of item 10 to $200 per month and the organization `Quantified ESG` |
| `docs/adr/0010-claude-api-key-ssm.md` | Added the organization decision and its effect to the change log |

## Decisions

- The user decided to keep using the `Quantified ESG` organization, which already has the credit attached (2026-11-01). The workspace name was first `sirloinbh-apps`, as it was in the document at first, and was changed to `byunghk-tool` at the user's request. The server IAM user names (`sirloinbh-apps-*`) are separate, so they were not changed.
- The 2026-10-29 entry in ADR-0010 was the fact at that time, so it was not edited and a new entry was added.

## Checks

- The amount and organization name follow the Billing screen and the answer the user gave. We did not look at the Console ourselves.
- Issuing the key and entering it into SSM remain user steps.
