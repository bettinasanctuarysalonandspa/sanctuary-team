import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SessionProvider } from './session';

export function SessionMonitor({ children }: { children: ReactNode }) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const [user, setUser] = useState<User | null>(null);
 const [ready, setReady] = useState(false);
 const [unavailable, setUnavailable] = useState(false);
 const [retry, setRetry] = useState(0);
 useEffect(() => {
  let active = true;
  let checking = false;
  let signingOut = false;
  let expiration: ReturnType<typeof setTimeout> | undefined;
  let channel: ReturnType<typeof supabase.channel> | undefined;
  let watchedUser: string | undefined;
  async function endSession() {
   if (!active || signingOut) return;
   signingOut = true;
   setReady(false);
   await queryClient.cancelQueries();
   queryClient.clear();
   await supabase.auth.signOut({ scope: 'local' });
   if (!active) return;
   setUser(null); setUnavailable(false); setReady(true);
   await router.navigate({ to: '/auth', replace: true });
  }
  async function check() {
   if (!active || checking || signingOut) return;
   checking = true;
   try {
    const { data, error } = await supabase.auth.getUser();
    if (!active) return;
    if (!data.user) {
     if (error && error.status !== 401 && error.status !== 403 && error.name !== 'AuthSessionMissingError') throw error;
     if (user || error?.status === 401 || error?.status === 403) { await endSession(); return; }
     setUser(null); setUnavailable(false); setReady(true); return;
    }
    if (error) throw error;
    const { data: status, error: statusError } = await supabase.rpc('sanctuary_session_status');
    if (statusError) throw statusError;
    if (!active) return;
    if (!status || typeof status !== 'object' || Array.isArray(status) || status.valid !== true) { await endSession(); return; }
    const expiresAt = typeof status.expiresAt === 'string' ? Date.parse(status.expiresAt) : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { await endSession(); return; }
    clearTimeout(expiration);
    // Timers cap at 2^31-1 milliseconds; recheck rather than overflow at 30 days.
    expiration = setTimeout(() => { void check(); }, Math.min(expiresAt - Date.now(), 2147483647));
    setUser(data.user); setReady(true); setUnavailable(false);
    if (watchedUser !== data.user.id) {
     if (channel) void supabase.removeChannel(channel);
     watchedUser = data.user.id;
     channel = supabase.channel(`employee-access-${data.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_access_revocations', filter: `user_id=eq.${data.user.id}` }, () => { void endSession(); })
      .subscribe();
    }
   } catch { if (active) { setUnavailable(true); setReady(false); } }
   finally { checking = false; }
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
   if (event === 'SIGNED_OUT') {
    clearTimeout(expiration);
    void queryClient.cancelQueries().then(() => queryClient.clear());
    setUser(null); setReady(true); setUnavailable(false);
    void router.navigate({ to: '/auth', replace: true });
   } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
    window.setTimeout(() => { void check(); }, 0);
   }
  });
  const resume = () => { if (document.visibilityState === 'visible') void check(); };
  const interval = setInterval(() => { void check(); }, 30000);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  document.addEventListener('visibilitychange', resume);
  void check();
  return () => {
   active = false; clearInterval(interval); clearTimeout(expiration); subscription.unsubscribe();
   if (channel) void supabase.removeChannel(channel);
   window.removeEventListener('focus', resume); window.removeEventListener('online', resume);
   document.removeEventListener('visibilitychange', resume);
  };
 // Keep one observer for the entire app, not a new observer per tool.
 }, [router, queryClient, retry]);
 return <SessionProvider user={user} ready={ready}>{unavailable ? <section className="auth-panel"><h1>Unable to verify access</h1><p>Reconnect to continue securely.</p><Button variant="sanctuary" className="mt-5" onClick={() => setRetry(value => value + 1)}>Try again</Button></section> : ready ? children : <div className="auth-panel" role="status">Checking your session…</div>}</SessionProvider>;
}