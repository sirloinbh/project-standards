# 804: server-ssh starts ssh directly

Bug from the first real use: `server-ssh "uptime"` worked, but `server-ssh "sudo cp ... && rm ... && sudo bash cert.sh reload"` asked for the key passphrase three times and ended in "Permission denied (publickey)", while a plain `scp -i` with the same key worked.

The chain was cmd, `powershell -File server-ssh.ps1`, then ssh. PowerShell 5.1 re-quotes arguments for a native command and sits between the console and ssh's passphrase prompt. I could not reproduce the failure without the real key; the arguments themselves arrived intact in a fake-ssh test, so the cause is most likely the console and quoting layers. Instead of guessing which one, the layer is removed.

- `tools/bin/server-ssh.cmd` now runs `ssh -i <key> ubuntu@<ip> %*` itself. The address comes from `server-ip.cmd` (a `for /f` capture; its warning still goes to the console). The key is `SIRLOINBH_SERVER_KEY` or `~/.ssh/workout-memo-lightsail`.
- `tools/server-ssh.ps1` stays for callers that use it from PowerShell.
- Tests: a command with `&&` reaches ssh in one piece, and the shim contains no PowerShell call.
- If it still fails for the user, run `ssh -v` through the shim (`server-ssh -v uptime`) and compare with the plain `ssh -i` verbose output.
