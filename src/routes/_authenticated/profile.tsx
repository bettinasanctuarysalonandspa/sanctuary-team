import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { appHead } from '@/lib/app-meta';
export const Route = createFileRoute('/_authenticated/profile')({head:()=>appHead('Employee profile','Your private Sanctuary employee account.'),component:Profile});
function Profile() { const {user} = Route.useRouteContext(); const qc=useQueryClient(); const navigate=useNavigate(); const [message,setMessage]=useState(''); const [name,setName]=useState<string|null>(null);
 const profile=useQuery({queryKey:['profile',user.id],queryFn:async()=>{const {data,error}=await supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle();if(error)throw error;return data;}});
 async function save(){if(name===null)return;const {error}=await supabase.from('profiles').update({display_name:name.trim()}).eq('id',user.id);setMessage(error?error.message:'Profile updated.');if(!error)await qc.invalidateQueries({queryKey:['profile']});}
 async function signout(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();await navigate({to:'/auth',replace:true});}
 return <section className="auth-panel"><span className="tool-icon"><UserRound size={20}/></span><h1>Your profile</h1><p>{user.email}</p>{profile.error?<div className="form-message">Your profile could not be loaded.</div>:<div className="auth-form"><label htmlFor="display-name">Display name</label><input id="display-name" value={name??profile.data?.display_name??''} onChange={e=>setName(e.target.value)} maxLength={80}/><Button variant="sanctuary" onClick={save} disabled={profile.isPending||!profile.data||name===null}>Save profile</Button></div>}{message&&<div className="form-message" role="status">{message}</div>}<Button variant="glass" className="mt-6 w-full" onClick={signout}><LogOut/>Sign out</Button></section>;
}
