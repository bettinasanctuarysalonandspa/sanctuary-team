import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, RefreshCw, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { listEmployees, revokeEmployee } from '@/lib/employee-admin.functions';
import { inviteEmployee, listInvitations, removeInvitation, resendInvitation } from '@/lib/employee-invites.functions';
import { getEmployeeAccess } from '@/lib/access.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { appHead } from '@/lib/app-meta';

export const Route = createFileRoute('/_authenticated/_employee/admin')({
  head: () => appHead('Employee access', 'Owner administration for Sanctuary Team employee accounts.'),
  beforeLoad: async ({ context }) => {
    if (!context.access.admin) throw redirect({ to: '/access-pending' });
  },
  component: AdminEmployees,
});

const information = [
  ['Consultation Calculator', 'Approved service and product prices'],
  ['Sanctuary Support', 'Client concerns, procedures, escalation'],
  ['Sanctuary Guidance', 'Employee Handbook and Code of Honor'],
  ['Content Studio', 'Brand voice, services, campaigns'],
];

function AdminEmployees() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const invite = useServerFn(inviteEmployee);
  const resend = useServerFn(resendInvitation);
  const remove = useServerFn(removeInvitation);
  const revoke = useServerFn(revokeEmployee);
  const employees = useQuery({ queryKey: ['sanctuary-employees'], queryFn: () => listEmployees() });
  const invitations = useQuery({ queryKey: ['sanctuary-invitations'], queryFn: () => listInvitations() });

  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await invite({ data: { name, email } });
      setMessage(`${name} was invited. They can open the link in their email to join.`);
      setName('');
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: ['sanctuary-invitations'] });
      await queryClient.invalidateQueries({ queryKey: ['sanctuary-employees'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The invitation could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite(inviteEmail: string) {
    setMessage('');
    try {
      await resend({ data: { email: inviteEmail } });
      setMessage(`The invitation for ${inviteEmail} was sent again.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The invitation could not be sent again.');
    }
  }

  async function removeInvite(id: string, inviteEmail: string) {
    setMessage('');
    try {
      await remove({ data: { id } });
      setMessage(`The invitation for ${inviteEmail} was withdrawn.`);
      await queryClient.invalidateQueries({ queryKey: ['sanctuary-invitations'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The invitation could not be withdrawn.');
    }
  }

  async function revokeAccess(id: string) {
    const result = await revoke({ data: { target_user_id: id } });
    if (!result.blocked) setMessage('The person could not be removed. Please try again.');
    else if (!result.authBlocked) setMessage('Their employee access was removed, but the final account step is still pending. Please try again.');
    else setMessage('Their access was removed. They are signed out immediately.');
    await queryClient.invalidateQueries({ queryKey: ['sanctuary-employees'] });
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="eyebrow">OWNER ADMINISTRATION</p>
        <h1 className="page-heading">Employee access</h1>
        <p className="mt-2 text-sm text-muted-foreground">Invite people to the team, and remove access the moment it ends.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Button variant="glass" asChild><Link to="/pricing">Service and product prices</Link></Button>
        <Button variant="glass" asChild><Link to="/support-knowledge">Sanctuary Support</Link></Button>
        <Button variant="glass" asChild><Link to="/guidance-knowledge">Sanctuary Guidance</Link></Button>
        <Button variant="glass" asChild><Link to="/content-knowledge">Content Studio</Link></Button>
      </div>
      <section className="glass-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary"><UserPlus size={15} /> Invite someone to the team</h2>
        <p className="mt-2 text-sm text-muted-foreground">They receive a private link in their email. No account, no password, nothing to sign up for — they choose a password when they open it.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={sendInvite}>
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required aria-label="Name" />
          <Input placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required aria-label="Email address" />
          <Button variant="sanctuary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}<ArrowRight size={15} /></Button>
        </form>
        {message && <div role="status" className="form-message">{message}</div>}
      </section>
      <section className="glass-panel overflow-hidden">
        <h2 className="px-5 pt-5 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Invitations</h2>
        {invitations.isLoading ? <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p> : invitations.isError ? <p className="px-5 py-4 text-sm text-muted-foreground">Invitations could not be loaded.</p> : !invitations.data?.length ? <p className="px-5 py-4 text-sm text-muted-foreground">No invitations yet.</p> : (
          <div className="mt-3 divide-y divide-input">
            {invitations.data.map(invitee => (
              <div className="admin-row" key={invitee.id}>
                <div className="min-w-0">
                  <strong>{invitee.display_name}</strong>
                  <p className="truncate text-sm text-muted-foreground">{invitee.email}</p>
                  <span className={`status status-${invitee.status === 'accepted' ? 'active' : 'revoked'}`}>{invitee.status === 'accepted' ? 'Joined' : 'Waiting'}</span>
                </div>
                {invitee.status !== 'accepted' ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="glass" onClick={() => void resendInvite(invitee.email)}><RefreshCw size={14} /> Send again</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 size={14} /> Withdraw</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Withdraw this invitation?</AlertDialogTitle>
                          <AlertDialogDescription>{invitee.email} will no longer be able to join with this link.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void removeInvite(invitee.id, invitee.email)}>Withdraw</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="glass-panel overflow-hidden">
        <h2 className="px-5 pt-5 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Employees</h2>
        {employees.isLoading ? <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p> : employees.isError ? <p className="px-5 py-4 text-sm text-muted-foreground">The list could not be loaded.</p> : !employees.data?.length ? <p className="px-5 py-4 text-sm text-muted-foreground">No employees yet.</p> : (
          <div className="mt-3 divide-y divide-input">
            {employees.data.map(employee => (
              <div className="admin-row" key={employee.user_id}>
                <div className="min-w-0"><strong>{employee.display_name}</strong><p className="truncate text-sm text-muted-foreground">{employee.email}</p><span className={`status status-${employee.status}`}>{employee.status}</span></div>
                {employee.status !== 'revoked' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive"><ShieldOff size={14} /> Revoke access</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke {employee.display_name}’s access?</AlertDialogTitle>
                        <AlertDialogDescription>They will be signed out immediately and cannot return to any Sanctuary tool.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep access</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void revokeAccess(employee.user_id)}>Revoke access</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="glass-panel overflow-hidden">
        <h2 className="px-5 pt-5 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Approved information</h2>
        <div className="mt-3 divide-y divide-input">
          {information.map(([tool, description]) => <div className="admin-row" key={tool}><div><strong>{tool}</strong><p className="text-sm text-muted-foreground">{description}</p></div><span className="status status-active">Ready</span></div>)}
        </div>
      </section>
      <Button variant="link" asChild className="back-link justify-start px-0"><Link to="/">Return to Sanctuary Team</Link></Button>
    </div>
  );
}
