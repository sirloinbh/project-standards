# 798: server-ip and server-ssh work in any terminal

The #794 commands were PowerShell functions that only the VS Code terminal loaded, so a plain PowerShell or Orca terminal said "not recognized". A profile cannot fix it: the execution policy is Restricted, so profiles and `.ps1` files do not run.

- `tools/bin/server-ip.cmd` and `tools/bin/server-ssh.cmd` run the `.ps1` one folder up with `-NoProfile -ExecutionPolicy Bypass`.
- `tools/install.ps1` copies them to `%LOCALAPPDATA%\sirloinbh-tools\bin` and adds only that folder to the user PATH (idempotent). The folder holds only `.cmd` files: with the `.ps1` files on the PATH, PowerShell resolves `server-ip` to the blocked `.ps1` first. An older entry for the tools folder itself is removed. A custom `-Destination` never touches the real PATH; the test hook `-UserPathFile` keeps the PATH in a file.
- Tests in `scripts/test/server-ip.test.mjs`: the shims run, the PATH is added once and not twice, a stale tools-folder entry is dropped.
- `docs/tools.md` says the commands work in any terminal after `install.ps1` and a new terminal, and its backslashes are fixed.
