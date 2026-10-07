import { Calculator, LifeBuoy, Sparkles, PenLine, ArrowUpRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
export const tools = [
 { title: 'Consultation Calculator', description: 'Service & extension pricing, retail, and tax.', path: '/consultation', icon: Calculator, tone: 'consultation', empty: 'Approved pricing is on its way', detail: 'No service prices, stylist levels, products, taxes, or amenity charges have been added yet.' },
 { title: 'Sanctuary Emergency Help', description: 'Client concerns, difficult moments, and next steps.', path: '/emergency-help', icon: LifeBuoy, tone: 'emergency', empty: 'Guidance awaiting approval', detail: 'Salon policies and escalation procedures have not been added. This tool cannot provide guidance yet.' },
 { title: 'Sanctuary Salon AI', description: 'Service knowledge, hospitality & Code of Honor.', path: '/salon-ai', icon: Sparkles, tone: 'education', empty: 'Your knowledge library is taking shape', detail: 'Approved education, standard operating procedures, hospitality standards, and Code of Honor will live here.' },
 { title: 'Marketing & Content Studio', description: 'Captions, video scripts, and client education.', path: '/content-studio', icon: PenLine, tone: 'studio', empty: 'A space for your salon’s voice', detail: 'Approved brand guidance and product information have not been added. Content generation is not active yet.' },
] as const;
export function ToolGrid() { return <div className="tool-grid">{tools.map(tool => <Link key={tool.path} to={tool.path} className="tool-card"><span className={`tool-icon ${tool.tone}`}><tool.icon size={19} strokeWidth={1.5}/></span><ArrowUpRight className="card-arrow" size={17} strokeWidth={1.3}/><h3>{tool.title}</h3><p>{tool.description}</p></Link>)}</div>; }
