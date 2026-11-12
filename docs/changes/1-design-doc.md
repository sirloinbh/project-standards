# #1 Integrated standards repo design document and ADR drafts

## Change

- `docs/design.md`: research results, key decisions, central repo structure, deployment flows for option A and option B, file classification table, manifest, `sync.config` schema and initial values, registry and port scheme, detect-and-guide flow, conflict handling rules, infrastructure exception, GitHub App, phased rollout plan
- `docs/adr/0001` to `0006`: division of roles between option A and option B, GitHub App, why we only detect and guide, provenance check for our own packages, the shared-aws-infrastructure exception, port slot assignment
- `README.md`: updated the current status to the design review phase

## User decisions applied

| Question | Decision |
|---|---|
| Infrastructure source | Promote shared-aws-infrastructure to an independent source |
| tsconfig | Option A package |
| standards-check | Copy to downstream repos |
| Ports | Reassign everything by slot; e2e ports of the 7 apps fixed |
| Common skills | `std-*`; existing `<proj>-*` are project-specific skills |
| Sync PR updates | Keep the branch from the first SHA and only update the title and body to the latest SHA |
| Pinning `^` ranges | Included in the first sync PR |
| design-tokens | Included in phase 1 |
| Domain and AWS prefix | Prepared as `null` keys (`service`, `aws` in `projects.json`, `platform.json`) |

## Differences from the requirements

- Added Workflows: write to the GitHub App permissions. This permission is needed to sync workflow files (ADR-0002).
- The managed `.npmrc` contains `ignore-scripts=true` (design.md 4.3).
- The test DB name is separated as `<name>_test`.

## Checks

- Only documents changed, so there are no tests to run.
- A temporary Node script (built-in modules only) confirmed the following.
  - Relative links in the 9 documents: 0 broken links
  - Port formula: 99 slots x 6 kinds = 594 ports, all distinct
  - Overlap with reserved ports: at first there was 1 (slot 28 api = 3128). I removed 3128 from the reserved list, bringing it to 0.
- When choosing the port range, I checked this PC's reserved ports (`netsh ... excludedportrange`: 50000–50059) and the port in use (55536).
