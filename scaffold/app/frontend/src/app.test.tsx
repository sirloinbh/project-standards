import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { App } from './app';

test('shows the server status from /api/health', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))),
  );
  render(<App />);
  expect(screen.getByRole('heading', { name: '개요' })).toBeInTheDocument();
  expect(await screen.findByText('서버 정상')).toBeInTheDocument();
});
