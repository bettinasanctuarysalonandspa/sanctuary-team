import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { acceptInvitation } from '@/lib/employee-invites.functions';
import { Button } from '@/components/ui/button';
import { appHead } from '@/lib/app-meta';

export const Route = createFileRoute('/set-password')({
  head: () => appHead('Join the team', 'Set a password for your Sanctuary Team employee account.'),
  component: SetPassword,
});

function SetPassword() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const accept = useServerFn(acceptInvitation);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    // The invitation link carries the sign-in token; the client exchanges it for a
    // session on load, and getUser() waits for that exchange before resolving.
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const result = await accept();
      if (!result.accepted) setMessage('Your password is set. If this invitation was already used, sign in as usual.');
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your password could not be set. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const name = typeof user?.user_metadata?.['full_name'] === 'string' ? user.user_metadata['full_name'] : '';

  return (
    <section className="auth-panel">
      <h1>{done ? 'Welcome to the team' : 'Set your password'}</h1>
      {checking ? (
        <div className="auth-panel" role="status">Opening your invitation…</div>
      ) : !user ? (
        <>
          <p>This invitation link is no longer active. Ask the salon owner to send you a new one.</p>
          <Button variant="glass" asChild className="mt-5">
            <Link to="/auth">Go to sign in</Link>
          </Button>
        </>
      ) : done ? (
        <>
          <p className="flex items-center gap-2"><CheckCircle2 size={17} />Your account is ready.</p>
          <Button variant="sanctuary" asChild className="mt-5">
            <Link to="/">Enter Sanctuary Team</Link>
          </Button>
        </>
      ) : (
        <>
          <p>
            {name ? `Welcome, ${name}. ` : 'Welcome. '}
            Choose a password for {user.email}. You will use it with this email to sign in on any device.
          </p>
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <Button variant="sanctuary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Set password and continue'}
              <ArrowRight size={15} />
            </Button>
            {message && <div role="status" className="form-message">{message}</div>}
          </form>
          <Button variant="link" className="mt-3 px-0 text-xs" onClick={() => void navigate({ to: '/' })}>
            Skip for now
          </Button>
        </>
      )}
    </section>
  );
}
