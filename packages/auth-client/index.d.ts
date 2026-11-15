export type User = { id: string; email: string | null; name: string | null; image: string | null };

export type UserState =
  | { status: 'loading'; user: null }
  | { status: 'signed-in'; user: User }
  | { status: 'signed-out'; user: null }
  | { status: 'error'; user: null };

type FetchLike = (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type RequestLike = { originalUrl?: string; url?: string; headers?: { cookie?: string }; user?: User };
type ResponseLike = { status(code: number): ResponseLike; json(body: unknown): unknown };

export type AuthMiddlewareOptions = {
  /** The auth service on the shared-auth Docker network, for example http://shared-auth-api:3110 */
  authUrl: string;
  fetch?: FetchLike;
  /** How long a successful check is reused, in milliseconds. Default 30000 */
  cacheMs?: number;
  /** Timeout of one check, in milliseconds. Default 3000 */
  timeoutMs?: number;
  /** Paths that need no session. Default ['/api/health'] */
  publicPaths?: string[];
  maxCached?: number;
  now?: () => number;
};

export const SESSION_COOKIES: readonly string[];
export function sessionCookies(header: string | undefined): string;
export function createAuthMiddleware(options: AuthMiddlewareOptions): (req: RequestLike, res: ResponseLike, next: () => void) => Promise<unknown>;
export function meHandler(req: RequestLike, res: ResponseLike): void;
export function fetchUser(options?: { meUrl?: string; fetch?: FetchLike }): Promise<Exclude<UserState, { status: 'loading' }>>;
export function signInUrl(authOrigin: string, returnTo: string): string;
export function signOutUrl(authOrigin: string, returnTo: string): string;
export function createUseUser(react: {
  useState: <S>(initial: S) => [S, (next: S) => void];
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void;
}): (options?: { meUrl?: string; fetch?: FetchLike }) => UserState;
