// Reads files of a repository's default branch through the GitHub API (no clone).
export async function openRemote(api, repo) {
  const path = `/repos/${repo}`;
  const info = await api('GET', path);
  if (!info) throw new Error(`${repo} not found or not accessible to the App`);
  const ref = await api('GET', `${path}/git/ref/heads/${info.default_branch}`);
  const commit = await api('GET', `${path}/git/commits/${ref.object.sha}`);
  const tree = await api('GET', `${path}/git/trees/${commit.tree.sha}?recursive=1`);
  const blobs = new Map(tree.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
  const cache = new Map();
  const fetchText = async (file) => {
    if (!cache.has(file)) {
      const sha = blobs.get(file);
      cache.set(file, sha ? Buffer.from((await api('GET', `${path}/git/blobs/${sha}`)).content, 'base64').toString('utf8') : null);
    }
    return cache.get(file);
  };
  return {
    defaultBranch: info.default_branch,
    baseSha: ref.object.sha,
    treeSha: commit.tree.sha,
    has: (file) => blobs.has(file),
    fetchText,
    /** Synchronous read of files fetched before. */
    read: (file) => cache.get(file) ?? null,
  };
}
