import { createFileRoute, Link } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/access-pending')({ head: () => appHead('Access pending', 'Employee and administrator access is approved by the Sanctuary owner.'), component: () => <section className="empty-state"><span className="tool-icon"><ShieldCheck size={24}/></span><h1 className="text-3xl font-display">Employee access required</h1><p>Your account has not been granted employee access. Please contact the owner of Sanctuary Salon & Spa.</p><Button variant="glass" asChild><Link to="/profile">View account</Link></Button></section> });
