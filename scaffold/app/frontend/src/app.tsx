import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router';
import { cn } from './lib/utils';

// Every page URL lives here (docs/directory-rules.md in the central repository).
export const pages = { overview: '/' } as const;

const queryClient = new QueryClient();

async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('서버에 연결할 수 없습니다');
  return (await res.json()) as { status: string };
}

function Overview() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  return (
    <section aria-labelledby="overview-title">
      <h1 id="overview-title">개요</h1>
      <p className="text-body text-muted-foreground">{{project.summary}}</p>
      <p role="status" className="text-caption">
        {health.isPending ? '서버 확인 중' : health.isError ? health.error.message : '서버 정상'}
      </p>
    </section>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <header className="border-b border-border p-4">
          <nav aria-label="주 메뉴">
            <NavLink
              to={pages.overview}
              className={({ isActive }) => cn('font-semibold', isActive && 'underline')}
            >
              {{project.displayName}}
            </NavLink>
          </nav>
        </header>
        <main className="p-4">
          <Routes>
            <Route path={pages.overview} element={<Overview />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
