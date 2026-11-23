// Shared sign-in client for sirloinbh apps (ADR-0015). It imports nothing: the backend passes
// fetch (Node's global by default) and the frontend passes React's hooks, like @sirloinbh/eslint-config.

/** Cookies the auth service sets on the parent domain (Better Auth, cookie prefix "sirloinbh"). */
export const SESSION_COOKIES = ['sirloinbh.session_token', 'sirloinbh.session_data'];

/** Keeps only the shared session cookies from a Cookie header ("__Secure-" names included). */
export function sessionCookies(header) {
  return (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => SESSION_COOKIES.includes(part.slice(0, part.indexOf('=')).replace(/^__Secure-/, '')))
    .join('; ');
}

// A loop instead of /\/+$/, which CodeQL flags as slow on long runs of "/".
function trimSlashes(url) {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end--;
  return url.slice(0, end);
}

// Same pattern as requestLog in the managed standard/http.ts: a request ID that does not match is never forwarded.
const REQUEST_ID_PATTERN = /^[\w.-]{1,128}$/;

const tokenOf = (cookies) => /(?:^|; )(?:__Secure-)?sirloinbh\.session_token=([^;]+)/.exec(cookies)?.[1] ?? null;

/**
 * Express middleware: checks the shared session with the auth service and sets req.user.
 * No session → 401. Auth service unreachable or failing → 503 (never lets the request through).
 * Only successful checks are cached, for cacheMs. The request's ID (res.locals.requestId from requestLog) goes to the
 * auth service as X-Request-Id, so a failed check can be matched to its log (#1082).
 */
export function createAuthMiddleware({ authUrl, fetch = globalThis.fetch, cacheMs = 30_000, timeoutMs = 3_000, publicPaths = ['/api/health'], maxCached = 100, now = Date.now } = {}) {
  if (!authUrl) throw new Error('createAuthMiddleware: authUrl is required (the auth service on the shared-auth network)');
  const sessionUrl = `${trimSlashes(authUrl)}/api/auth/get-session`;
  const cache = new Map();

  return async function auth(req, res, next) {
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (publicPaths.some((p) => path === p || path.startsWith(`${p}/`))) return next();

    const cookies = sessionCookies(req.headers?.cookie);
    const token = tokenOf(cookies);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const hit = cache.get(token);
    if (hit && hit.until > now()) {
      req.user = hit.user;
      return next();
    }
    cache.delete(token);

    let body;
    try {
      const requestId = res.locals?.requestId;
      const headers = typeof requestId === 'string' && REQUEST_ID_PATTERN.test(requestId) ? { cookie: cookies, 'x-request-id': requestId } : { cookie: cookies };
      const response = await fetch(sessionUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) return res.status(503).json({ error: 'auth_unavailable' });
      body = await response.json();
    } catch {
      return res.status(503).json({ error: 'auth_unavailable' });
    }
    if (!body?.user?.id) return res.status(401).json({ error: 'unauthorized' });

    const user = { id: body.user.id, email: body.user.email ?? null, name: body.user.name ?? null, image: body.user.image ?? null };
    if (cache.size >= maxCached) cache.delete(cache.keys().next().value);
    cache.set(token, { user, until: now() + cacheMs });
    req.user = user;
    return next();
  };
}

/** Express handler for GET /api/me, mounted after the middleware. The frontend hook reads it. */
export function meHandler(req, res) {
  res.json({ user: req.user });
}

/** Asks the app's own API who is signed in: signed-in, signed-out (401), or error. */
export async function fetchUser({ meUrl = '/api/me', fetch = globalThis.fetch } = {}) {
  try {
    const response = await fetch(meUrl, { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (response.status === 401) return { status: 'signed-out', user: null };
    if (!response.ok) return { status: 'error', user: null };
    const { user } = await response.json();
    return user ? { status: 'signed-in', user } : { status: 'signed-out', user: null };
  } catch {
    return { status: 'error', user: null };
  }
}

/** Sign-in page of the auth service; it sends the browser back to returnTo afterwards. */
export function signInUrl(authOrigin, returnTo) {
  return `${trimSlashes(authOrigin)}/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Sign-out page of the auth service; it ends the session for every app, then returns to returnTo. */
export function signOutUrl(authOrigin, returnTo) {
  return `${trimSlashes(authOrigin)}/sign-out?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Builds the React hook from React's own hooks: const useUser = createUseUser({ useState, useEffect }).
 * useUser() returns { status: 'loading' | 'signed-in' | 'signed-out' | 'error', user }.
 */
export function createUseUser({ useState, useEffect }) {
  return function useUser(options = {}) {
    const [state, setState] = useState({ status: 'loading', user: null });
    const { meUrl, fetch } = options;
    useEffect(() => {
      let live = true;
      fetchUser({ meUrl, fetch }).then((next) => {
        if (live) setState(next);
      });
      return () => {
        live = false;
      };
    }, [meUrl, fetch]);
    return state;
  };
}
