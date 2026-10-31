// In-memory stand-in for the parts of the GitHub REST API the sync uses (no network in tests).
import { gitBlobSha } from '../lib/sync-pr.mjs';

let counter = 0;
const newSha = (prefix) => `${prefix}${String(++counter).padStart(40 - prefix.length, '0')}`;

export function fakeRepo(fullName, files, { labels: initialLabels = [] } = {}) {
  const labels = initialLabels.map((l) => ({ ...l }));
  const blobs = new Map();
  const trees = new Map();
  const commits = new Map();
  const refs = new Map();
  const pulls = [];
  const calls = [];
  const putTree = (entries) => {
    const sha = newSha('t');
    trees.set(sha, new Map(entries));
    return sha;
  };
  const initial = [...Object.entries(files)].map(([path, text]) => {
    const sha = gitBlobSha(text);
    blobs.set(sha, text);
    return [path, sha];
  });
  const firstCommit = newSha('c');
  commits.set(firstCommit, { tree: putTree(initial) });
  refs.set('heads/main', firstCommit);
  const base = `/repos/${fullName}`;

  async function api(method, path, body) {
    calls.push(`${method} ${path}`);
    if (method === 'GET' && path === base) return { full_name: fullName, default_branch: 'main' };
    let m;
    if (method === 'GET' && (m = /\/git\/ref\/(heads\/.+)$/.exec(path))) return refs.has(m[1]) ? { object: { sha: refs.get(m[1]) } } : null;
    if (method === 'GET' && (m = /\/git\/commits\/(\w+)$/.exec(path))) return { tree: { sha: commits.get(m[1]).tree } };
    if (method === 'GET' && (m = /\/git\/trees\/(\w+)\?recursive=1$/.exec(path))) return { tree: [...trees.get(m[1])].map(([p, sha]) => ({ path: p, type: 'blob', sha })) };
    if (method === 'GET' && (m = /\/git\/blobs\/(\w+)$/.exec(path))) return { content: Buffer.from(blobs.get(m[1]), 'utf8').toString('base64') };
    if (method === 'POST' && path === `${base}/git/trees`) {
      const entries = new Map(trees.get(body.base_tree));
      for (const e of body.tree) {
        if (e.sha === null) entries.delete(e.path);
        else {
          const sha = gitBlobSha(e.content);
          blobs.set(sha, e.content);
          entries.set(e.path, sha);
        }
      }
      return { sha: putTree(entries) };
    }
    if (method === 'POST' && path === `${base}/git/commits`) {
      const sha = newSha('c');
      commits.set(sha, { tree: body.tree, message: body.message, parents: body.parents });
      return { sha };
    }
    if (method === 'GET' && path.startsWith(`${base}/pulls?state=open`)) return pulls.filter((p) => p.state === 'open');
    if (method === 'GET' && (m = /\/pulls\/(\d+)\/commits\?per_page=100$/.exec(path))) {
      const pr = pulls.find((p) => p.number === Number(m[1]));
      const list = [];
      for (let sha = refs.get(`heads/${pr.head.ref}`); commits.get(sha)?.message; [sha] = commits.get(sha).parents) list.unshift({ sha, commit: { message: commits.get(sha).message } });
      return list;
    }
    if (method === 'POST' && (m = /\/issues\/(\d+)\/comments$/.exec(path))) {
      const pr = pulls.find((p) => p.number === Number(m[1]));
      (pr.comments ??= []).push(body.body);
      return {};
    }
    if (method === 'POST' && path === `${base}/git/refs`) {
      refs.set(body.ref.replace('refs/', ''), body.sha);
      return {};
    }
    if (method === 'PATCH' && (m = /\/git\/refs\/(heads\/.+)$/.exec(path))) {
      refs.set(m[1], body.sha);
      return {};
    }
    if (method === 'POST' && path === `${base}/pulls`) {
      const pr = { number: pulls.length + 1, state: 'open', title: body.title, body: body.body, head: { ref: body.head, repo: { full_name: fullName } }, html_url: `https://github.com/${fullName}/pull/${pulls.length + 1}` };
      pulls.push(pr);
      return pr;
    }
    if (method === 'PATCH' && (m = /\/pulls\/(\d+)$/.exec(path))) {
      const pr = pulls.find((p) => p.number === Number(m[1]));
      Object.assign(pr, body);
      return pr;
    }
    // Labels: names are case-insensitive, pages hold at most `per_page` labels.
    if (method === 'GET' && (m = new RegExp(`^${base}/labels\\?per_page=(\\d+)&page=(\\d+)$`).exec(path))) {
      const size = Number(m[1]);
      return labels.slice((Number(m[2]) - 1) * size, Number(m[2]) * size).map((l) => ({ ...l }));
    }
    const findLabel = (name) => labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (method === 'POST' && path === `${base}/labels`) {
      if (findLabel(body.name)) throw new Error(`GitHub API POST ${path} failed: 422 already_exists`);
      labels.push({ name: body.name, color: body.color, description: body.description });
      return { ...labels.at(-1) };
    }
    if (method === 'PATCH' && (m = new RegExp(`^${base}/labels/(.+)$`).exec(path))) {
      const label = findLabel(decodeURIComponent(m[1]));
      if (!label) throw new Error(`GitHub API PATCH ${path} failed: 404`);
      Object.assign(label, { name: body.new_name ?? label.name, color: body.color ?? label.color, description: body.description ?? label.description });
      return { ...label };
    }
    throw new Error(`fake GitHub has no route for ${method} ${path}`);
  }

  // Reads the files of a branch as { path: text }.
  const filesAt = (branch) => {
    const tree = trees.get(commits.get(refs.get(`heads/${branch}`)).tree);
    return Object.fromEntries([...tree].map(([p, sha]) => [p, blobs.get(sha)]));
  };
  // Simulates the user merging the sync PR.
  const merge = (branch) => {
    refs.set('heads/main', refs.get(`heads/${branch}`));
    for (const p of pulls) if (p.head.ref === branch) p.state = 'closed';
  };
  // Simulates a person pushing a commit to a branch.
  const addCommit = (branch, message) => {
    const parent = refs.get(`heads/${branch}`);
    const sha = newSha('c');
    commits.set(sha, { tree: commits.get(parent).tree, message, parents: [parent] });
    refs.set(`heads/${branch}`, sha);
    return sha;
  };
  return { api, calls, pulls, refs, filesAt, merge, addCommit, commits, labels };
}

// The central repository as the sync sees it once every shared package was published:
// each package tag has a Release whose body links a successful publish.yml run.
export function fakePublishedCentral() {
  const run = { path: '.github/workflows/publish.yml', conclusion: 'success', html_url: 'https://github.com/sirloinbh/project-standards/actions/runs/7' };
  return async (method, path) => {
    if (method === 'GET' && path.includes('/releases/tags/')) return { body: `- 배포 실행: ${run.html_url}` };
    if (method === 'GET' && path.endsWith('/actions/runs/7')) return run;
    return null;
  };
}
