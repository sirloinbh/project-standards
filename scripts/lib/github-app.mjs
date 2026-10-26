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

/** Calls the GitHub REST API. Error messages include status and path, never the token. */
export function createClient({ token, fetchImpl = fetch, baseUrl = 'https://api.github.com' }) {
  return async function api(method, path, body) {
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
    if (!response.ok) {
      let message = text;
      try {
        message = JSON.parse(text).message ?? text;
      } catch {}
      throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${message}`);
    }
    // A GET that succeeds with no body (204, e.g. vulnerability-alerts enabled) returns '' so it never reads as a 404 null.
    if (!text) return method === 'GET' ? '' : null;
    return JSON.parse(text);
  };
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
