# 756: the private GHCR package quota is recorded, retention is 2 versions

- **ADR-0023 risk replaced** with the checked numbers (GitHub Free; 500 MB storage and 1 GB transfer included for private packages; November use 0.85 GB-hr and 0.02 GB, billed $0) and my size estimate for what the images will need once they are pushed: about 170 MB per app with 2 tags, so about 3 apps fit and 8 apps plus 2 services (about 1.5 GB) do not. The estimate is not measured; the first pushed images replace it. A Free account has a spending limit of $0 until a budget is set, so pushes would fail at the limit rather than cost money unexpectedly.
- **Retention:** `image-keep` defaults to 2 in `reusable-app-ci.yml` and `reusable-service-ci.yml` (the current and the previous version, which is what a rollback needs). ADR point 5 says the same. `rollback <tag>` to an older commit works only while that tag is still in GHCR or in the server's local cache.
- **Open for the user:** a small Packages budget, or moving only as many apps as fit. #756 stays open until that is chosen.
- Public apps that inline the reusable CI get `IMAGE_KEEP: 2` in their `ci.yml` (the job is switched off there).
