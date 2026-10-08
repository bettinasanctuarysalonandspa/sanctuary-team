import { createFileRoute } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { ToolGrid } from '@/components/sanctuary/tools';
import { useSession } from '@/components/sanctuary/session';
import { appHead } from '@/lib/app-meta';
export const Route = createFileRoute('/')({ head: () => appHead('Home', 'The Sanctuary Salon & Spa employee workspace in Cornelius, North Carolina.'), component: Home });
function Home() {
 const { user } = useSession();
 return <><section className="welcome"><p className="eyebrow">YOUR SANCTUARY WORKSPACE</p><h1>Sanctuary Team</h1><p className="welcome-copy">Welcome to Sanctuary Team. Your tools, resources, and support—all in one place.</p><div className="identity-strip"><span className="identity-icon"><UserRound size={17} strokeWidth={1.3}/></span><div><p className="identity-title">{user ? 'Welcome back' : 'Welcome to your sanctuary'}</p><p className="identity-caption">{user ? 'Employee workspace' : 'Employee access · Cornelius, NC'}</p></div><span className="status">{user ? 'Signed in' : 'Private workspace'}</span></div></section><section><div className="section-heading"><h2>Your tools</h2><span>Made for your day</span></div><ToolGrid/></section><section className="sanctuary-note"><div><span className="eyebrow">SANCTUARY SALON & SPA</span><h2>Care begins with us.</h2><p>Cornelius, North Carolina</p></div><div className="photo-placeholder" aria-label="Reserved for Sanctuary photography"><span className="brand-mark" aria-hidden="true">S</span></div></section></>;
}
