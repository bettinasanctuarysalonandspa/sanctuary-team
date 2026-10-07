import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect,useState,type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { appHead } from '@/lib/app-meta';
export const Route = createFileRoute('/reset-password')({ head: () => appHead('Reset password', 'Set a new password for your Sanctuary employee account.'), component: ResetPassword });
function ResetPassword() { const [recovery,setRecovery] = useState(false); const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState(''); const [message,setMessage] = useState(''); const [done,setDone] = useState(false); const [busy,setBusy] = useState(false);
 useEffect(()=>{setRecovery(window.location.hash.includes('type=recovery'));},[]);
 async function submit(e:FormEvent) {e.preventDefault(); if(password!==confirm){setMessage('Passwords do not match.');return;} setBusy(true); const {error} = await supabase.auth.updateUser({password}); setBusy(false); if(error) setMessage(error.message); else setDone(true);}
 return <section className="auth-panel"><h1>Set a new password</h1>{done ? <><p>Your password has been updated.</p><Button variant="sanctuary" asChild className="mt-5"><Link to="/">Return to home</Link></Button></> : recovery ? <form className="auth-form" onSubmit={submit}><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/><Button variant="sanctuary" type="submit" disabled={busy}>Update password</Button>{message&&<div role="status" className="form-message">{message}</div>}</form> : <><p>Open this page from the password reset link in your email.</p><Button variant="glass" asChild className="mt-5"><Link to="/auth">Back to sign in</Link></Button></>}</section>;
}
