import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionMonitor } from './session-monitor';

const mocks = vi.hoisted(() => ({
 getUser: vi.fn(), rpc: vi.fn(), signOut: vi.fn(), navigate: vi.fn(), removeChannel: vi.fn(),
 authEvent: undefined as undefined | ((event: string) => void),
 revoked: undefined as undefined | (() => void),
}));
vi.mock('@tanstack/react-router', () => ({
 useRouter: () => ({ navigate: mocks.navigate }),
 useRouterState: () => true,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
 auth: {
  getUser: mocks.getUser, signOut: mocks.signOut,
  onAuthStateChange: (callback: (event: string) => void) => { mocks.authEvent = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
 },
 rpc: mocks.rpc, removeChannel: mocks.removeChannel,
 channel: () => ({ on: (_type: string, _filter: unknown, callback: () => void) => {
  mocks.revoked = callback; return { subscribe: vi.fn() };
 } }),
} }));

function openApp() {
 const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const result = render(<QueryClientProvider client={queryClient}><SessionMonitor><p>Private tool workspace</p></SessionMonitor></QueryClientProvider>);
 return { ...result, queryClient };
}
describe('Employee session monitoring', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'employee' } }, error: null });
  mocks.rpc.mockResolvedValue({ data: { valid: true, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.navigate.mockResolvedValue(undefined);
 });
 afterEach(() => { cleanup(); });
 it('restores the managed session on app reopen without asking for credentials', async () => {
  const first = openApp();
  await screen.findByText('Private tool workspace');
  first.unmount();
  openApp();
  await screen.findByText('Private tool workspace');
  expect(mocks.getUser).toHaveBeenCalledTimes(2);
  expect(mocks.signOut).not.toHaveBeenCalled();
 });
 it('rejects an expired session and clears private cached information', async () => {
  mocks.rpc.mockResolvedValue({ data: { valid: false, expiresAt: new Date(Date.now() - 1).toISOString() }, error: null });
  const { queryClient } = openApp();
  queryClient.setQueryData(['private'], 'cached employee information');
  await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth', replace: true }));
  expect(queryClient.getQueryData(['private'])).toBeUndefined();
 });
 it('ends an active session immediately on a revocation notification', async () => {
  const { queryClient } = openApp();
  await screen.findByText('Private tool workspace');
  queryClient.setQueryData(['private'], 'cached employee information');
  await act(async () => { mocks.revoked?.(); });
  await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' }));
  expect(queryClient.getQueryData(['private'])).toBeUndefined();
  expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth', replace: true });
 });
 it('revalidates on focus without ending a valid session', async () => {
  openApp();
  await screen.findByText('Private tool workspace');
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.signOut).not.toHaveBeenCalled();
 });
 it('hides private tools when access cannot be verified, without discarding a valid login', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Offline' } });
  openApp();
  await screen.findByText('Unable to verify access');
  expect(screen.queryByText('Private tool workspace')).toBeNull();
  expect(mocks.signOut).not.toHaveBeenCalled();
 });
});