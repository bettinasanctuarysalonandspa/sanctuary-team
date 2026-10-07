import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
export const SessionContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useSession = () => useContext(SessionContext);
export function SessionProvider({ user, ready, children }: { user: User | null; ready: boolean; children: ReactNode }) { return <SessionContext.Provider value={{ user, ready }}>{children}</SessionContext.Provider>; }
