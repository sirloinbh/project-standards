# #870 Remove the old pulled GHCR images from the server after a deploy

With `ghcr.pull` on, `pull_images` pulls `ghcr.io/sirloinbh/<image>:<tag>` and adds the local name `<image>:<tag>`. The cleanup after a deploy removed old tags only under the local name. An image is freed only when every name is gone, so the `ghcr.io/...` names kept the layers and the server disk (and the snapshot, billed by used size) grew with each deploy.

## Change

- `templates/deploy/deploy/remote-deploy.sh.tmpl`: the cleanup loop runs for both repositories, `<image>` and `<registry>/<image>`, keeping the current and previous tags. With pulls off the second repository is empty, so nothing changes; after pulls are turned off again, leftovers are cleaned too.
- `scripts/test/deploy-pull.test.mjs`: runs the rendered cleanup with a fake `docker` and checks that old tags are removed under both names and the current and previous ones are kept. The test fails on the old script.
