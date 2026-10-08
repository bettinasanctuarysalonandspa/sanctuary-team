import { Link, useRouterState } from '@tanstack/react-router';
import { House, LayoutGrid, PenLine, UserRound, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from './session';
import type { ReactNode } from 'react';
export function AppShell({ children }: { children: ReactNode }) {
 const { user } = useSession();
 const pathname = useRouterState({ select: state => state.location.pathname });
 const nav = [{label:'Home',to:'/',icon:House}, {label:'Tools',to:'/tools',icon:LayoutGrid}, {label:'Studio',to:'/content-studio',icon:PenLine}, {label:'Profile',to:'/profile',icon:UserRound}] as const;
 return <><div className="app-shell"><header className="app-header"><Link to="/" className="wordmark" aria-label="Sanctuary Team home"><img src="/logo.png" alt="" className="brand-logo" width="40" height="40"/><div><p className="brand-title">Sanctuary</p><p className="brand-subtitle">TEAM</p></div></Link><div className="header-actions"><Button variant="glass" size="sm" asChild><Link to={user ? '/profile' : '/auth'}>{user ? 'Account' : 'Sign in'}</Link></Button><Button variant="sanctuary" size="sm" asChild><Link to="/admin">Admin</Link></Button></div></header><main>{children}</main><footer className="app-footer"><LockKeyhole size={10}/>Sanctuary Salon & Spa · Cornelius, NC</footer></div><nav className="bottom-nav" aria-label="Main navigation"><div className="bottom-nav-inner">{nav.map(item => <Link key={item.label} to={item.to} className="nav-item" data-active={pathname === item.to}><item.icon size={19} strokeWidth={1.5}/>{item.label}</Link>)}</div></nav></>;
}
