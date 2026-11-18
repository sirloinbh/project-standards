import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeIcon } from 'lucide-react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AppShell, type NavItem } from './components/layout/app-shell';
import { Toaster } from './components/ui/sonner';
import { healthText, useHealth } from './health';
import { AccountActions, SignInGate } from './sign-in';

// Every page URL lives here (docs/directory-rules.md in the central repository).
const pages = { overview: '/' } as const;

// Main menu (LNB) items, in display order.
const nav: NavItem[] = [{ to: pages.overview, label: '개요', icon: HomeIcon }];

const queryClient = new QueryClient();

function Overview() {
  const health = useHealth();
  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-2">
      <h1 id="overview-title">개요</h1>
      <p className="text-body text-muted-foreground">{{project.summary}}</p>
      <p role="status" className="text-caption">
        {healthText(health)}
      </p>
    </section>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SignInGate>
          <AppShell appName="{{project.displayName}}" nav={nav} actions={<AccountActions />}>
            <Routes>
              <Route path={pages.overview} element={<Overview />} />
            </Routes>
          </AppShell>
        </SignInGate>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
