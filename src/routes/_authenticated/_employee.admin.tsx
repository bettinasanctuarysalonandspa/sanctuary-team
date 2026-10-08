import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { tools } from '@/components/sanctuary/tools';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { listEmployees, revokeEmployee } from '@/lib/employee-admin.functions';
export const Route = createFileRoute('/_authenticated/_employee/admin')({ beforeLoad: ({ context }) => { if (!context.access.admin) throw redirect({ to: '/access-pending' }); }, head: () => appHead('Owner administration', 'The restricted owner workspace for Sanctuary approved information.'), component: Admin });
function Admin() {
 const fetchEmployees = useServerFn(listEmployees);
 const revoke = useServerFn(revokeEmployee);
 const queryClient = useQueryClient();
 const employees = useQuery({ queryKey: ['owner-employees'], queryFn: () => fetchEmployees() });
 const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 async function confirmRevocation() {
  if (!selected || busy) return;
  setBusy(true); setMessage('');
  try {
   const result = await revoke({ data: { userId: selected.id } });
   setMessage(result.authBlocked ? 'Employee access revoked on all devices.' : 'Employee access is blocked on all devices. Account sign-in blocking could not finish; contact support.');
   setSelected(null);
   await queryClient.invalidateQueries({ queryKey: ['owner-employees'] });
  } catch (error) { setMessage(error instanceof Error ? error.message : 'Access could not be revoked.'); }
  finally { setBusy(false); }
 }
 return <>
  <div className="page-heading"><p className="eyebrow">OWNER ADMINISTRATION</p><h1>Employee access</h1></div>
  {employees.isPending ? <p role="status">Loading employee access…</p> : employees.error ? <div className="form-message" role="alert">Employee access could not be loaded.<Button variant="link" onClick={() => void employees.refetch()}>Try again</Button></div> : employees.data?.length ? <ul className="divide-y divide-input" aria-label="Employee access">{employees.data.map(employee => <li key={employee.user_id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><h2 className="break-words text-xl">{employee.display_name || employee.email}</h2>{employee.display_name && <p className="break-all text-sm text-muted-foreground">{employee.email}</p>}<p className="mt-1 text-xs text-muted-foreground">{employee.revoked_at ? 'Access revoked' : 'Employee'}</p></div>{!employee.revoked_at && <Button variant="glass" onClick={() => { setMessage(''); setSelected({ id: employee.user_id, name: employee.display_name || employee.email }); }}><ShieldOff size={16}/>Revoke access</Button>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No approved employee accounts yet.</p>}
  <AlertDialog open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><AlertDialogContent className="w-[calc(100%-3rem)] rounded-lg"><AlertDialogHeader><AlertDialogTitle>Revoke employee access?</AlertDialogTitle><AlertDialogDescription className="break-words">{selected?.name} will lose access to Sanctuary on every device.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={() => void confirmRevocation()}><ShieldOff size={16}/>{busy ? 'Revoking…' : 'Confirm revocation'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  {message && <p className="form-message" role="status">{message}</p>}
  <div className="page-heading mt-10"><h2 className="text-2xl">Approved information</h2><p>Information management is built with each tool, step by step.</p></div>{tools.map((tool, i) => i === 0
   ? <Link to="/pricing" className="admin-row" key={tool.path}><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><div><h2>{tool.title}</h2><p>Stylists, services, products and extensions</p></div><span className="status">Edit prices</span></Link>
   : i === 2 ? <Link to="/guidance-knowledge" className="admin-row" key={tool.path}><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><div><h2>{tool.title}</h2><p>Handbook, Code of Honor and approved policies</p></div><span className="status">Edit information</span></Link>
   : i === 3 ? <Link to="/content-knowledge" className="admin-row" key={tool.path}><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><div><h2>{tool.title}</h2><p>Brand instructions and approved information</p></div><span className="status">Edit information</span></Link>
   : <div className="admin-row" key={tool.path}><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><div><h2>{tool.title}</h2><p>No approved information</p></div><span className="status">Not configured</span></div>)}
 </>;
}
