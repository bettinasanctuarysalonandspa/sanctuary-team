import { createFileRoute } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { ToolGrid } from '@/components/sanctuary/tools';
import { useSession } from '@/components/sanctuary/session';
import { appHead } from '@/lib/app-meta';
import spaImage from '@/assets/spa-still-life.jpg';
export const Route = createFileRoute('/')({ head: () => appHead('Home', 'The Sanctuary Salon & Spa employee workspace in Cornelius, North Carolina.'), component: Home });
function Home() {
 const { user } = useSession();
 return <><section className="welcome"><p className="eyebrow">YOUR SANCTUARY WORKSPACE</p><h1>Sanctuary Salon AI</h1><p className="welcome-copy">A little clarity.<br/>A lot of care.</p><div className="identity-strip"><span className="identity-icon"><UserRound size={17} strokeWidth={1.3}/></span><div><p className="identity-title">{user ? 'Welcome back' : 'Welcome to your sanctuary'}</p><p className="identity-caption">{user ? 'Employee workspace' : 'Employee access · Cornelius, NC'}</p></div><span className="status">{user ? 'Signed in' : 'Private workspace'}</span></div></section><section><div className="section-heading"><h2>Your tools</h2><span>Made for your day</span></div><ToolGrid/></section><section className="sanctuary-note"><div><span className="eyebrow">SANCTUARY SALON & SPA</span><h2>Care begins with us.</h2><p>Cornelius, North Carolina</p></div><img src={spaImage} alt="Sage spa towels, an orchid, and a ceramic bowl" width={512} height={512} loading="lazy"/></section></>;
}
