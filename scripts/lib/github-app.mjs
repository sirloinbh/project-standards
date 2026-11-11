// GitHub App authentication with node:crypto only: an RS256 JWT for the App, exchanged for a
// short-lived installation token limited to one repository. Tokens are never logged.
import crypto from 'node:crypto';

const base64url = (input) => Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** JWT valid for 9 minutes; iat is backdated 60s for clock drift, as GitHub recommends. */
export function createAppJwt({ appId, privateKey, now = Math.floor(Date.now() / 1000) }) {
  if (!appId) throw new Error('SYNC_APP_ID is not set');
  if (!privateKey?.includes('PRIVATE KEY')) throw new Error('SYNC_APP_PRIVATE_KEY is not a PEM private key');
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) }));
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(privateKey);
  return `${header}.${payload}.${base64url(signature)}`;
}

// GitHub's docs: avoid many concurrent requests (secondary rate limits) and wait as told before retrying (#464).
export const MAX_CONCURRENT_REQUESTS = 4;
const MAX_RETRIES = 3;
const MAX_WAIT_MS = 15 * 60_000;
const sleepFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs fn over items with at most `limit` calls in flight, keeping the result order. */
export async function mapLimit(items, fn, limit = MAX_CONCURRENT_REQUESTS) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Milliseconds to wait before retrying a rate-limited response, or null when it is not one.
 * Order from GitHub's docs: `retry-after`, then `x-ratelimit-reset` when nothing remains, then
 * at least a minute, doubling per attempt, for a secondary rate limit without headers.
 */
export function retryDelay(response, message, attempt, now = Date.now()) {
  if (response.status !== 403 && response.status !== 429) return null;
  const retryAfter = Number(response.headers.get('retry-after'));
  if (retryAfter > 0) return retryAfter * 1000;
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  if (response.headers.get('x-ratelimit-remaining') === '0' && reset > 0) return Math.max(1000, reset * 1000 - now + 1000);
  if (response.status === 429 || /rate limit/i.test(message)) return 60_000 * 2 ** attempt;
  return null;
}

/** Calls the GitHub REST API. Error messages include status and path, never the token. */
export function createClient({ token, fetchImpl = fetch, baseUrl = 'https://api.github.com', sleep = sleepFor, maxRetries = MAX_RETRIES }) {
  return async function api(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'project-standards-sync',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.status === 404 && method === 'GET') return null;
      const text = await response.text();
      if (response.ok) return parseBody(method, text);
      let message = text;
      try {
        message = JSON.parse(text).message ?? text;
      } catch {}
      const wait = retryDelay(response, message, attempt);
      if (wait !== null && attempt < maxRetries && wait <= MAX_WAIT_MS) {
        console.warn(`GitHub API ${method} ${path}: rate limited (${response.status}), retrying in ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${message}`);
    }
  };
}

function parseBody(method, text) {
  // A GET that succeeds with no body (204, e.g. vulnerability-alerts enabled) returns '' so it never reads as a 404 null.
  if (!text) return method === 'GET' ? '' : null;
  return JSON.parse(text);
}

/** Exchanges the App JWT for an installation token that can only access `owner/repo`. */
export async function getInstallationToken({ appId, privateKey, repo, fetchImpl = fetch }) {
  const [owner, name] = repo.split('/');
  const app = createClient({ token: createAppJwt({ appId, privateKey }), fetchImpl });
  const installation = await app('GET', `/repos/${owner}/${name}/installation`);
  if (!installation) throw new Error(`the sync App is not installed on ${repo} (docs/github-app.md step 3)`);
  const { token, expires_at: expiresAt } = await app('POST', `/app/installations/${installation.id}/access_tokens`, { repositories: [name] });
  return { token, expiresAt };
}
