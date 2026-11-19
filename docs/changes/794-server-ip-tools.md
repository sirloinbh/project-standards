# 794: server-ip and server-ssh read the server IP from SSM

Part of storing the server's static IP centrally: shared-aws-infrastructure#69 (PR #70) adds the SSM parameter `/sirloinbh/shared/server-static-ip`; this change adds the PC side.

- `tools/server-ip.ps1`: SSM first (personal profile), then DNS (`auth.daysofme.com`) with a warning. Prints one IPv4 address.
- `tools/server-ssh.ps1`: `ssh -i <key> ubuntu@<address> <args>`; the key is `~/.ssh/workout-memo-lightsail` or `SIRLOINBH_SERVER_KEY`.
- `tools/install.ps1` copies both; `tools/project-terminal.ps1` defines the functions `server-ip` and `server-ssh` (the user must run `tools\install.ps1` and open a new terminal).
- Docs now say `server-ssh` / `server-ip` instead of `<static_ip>`: `docs/runbooks/deploy.md`, `docs/runbooks/backup-restore.md`, `docs/user-steps.md`, `docs/server-proxy.md`; `docs/tools.md` describes the tools.
- Tests: `scripts/test/server-ip.test.mjs` (Windows; fake `aws` and `ssh`), and the install test lists the new files.

Until #70 is applied by the user, `server-ip` uses the DNS fallback, so the docs work from the start. No server or AWS change here.
