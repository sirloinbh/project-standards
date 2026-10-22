import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { HomeIcon } from 'lucide-react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell, type NavItem } from './components/layout/app-shell';
import { Toaster } from './components/ui/sonner';

// Every page URL lives here (docs/directory-rules.md in the central repository).
export const pages = { overview: '/' } as const;

// Main menu (LNB) items, in display order.
const nav: NavItem[] = [{ to: pages.overview, label: '개요', icon: HomeIcon }];

const queryClient = new QueryClient();

async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('서버에 연결할 수 없습니다');
  return (await res.json()) as { status: string };
}

function Overview() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-2">
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
        <AppShell appName="{{project.displayName}}" nav={nav}>
          <Routes>
            <Route path={pages.overview} element={<Overview />} />
          </Routes>
        </AppShell>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
