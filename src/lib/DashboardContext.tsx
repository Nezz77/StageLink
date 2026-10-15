import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BookingRole } from './booking';
import { initialDashboard, reduceDashboard, type DashboardAction, type DashboardState } from './dashboard';

const DashboardContext = createContext<{ state: DashboardState; dispatch: (action: DashboardAction) => boolean } | null>(null);
export function DashboardProvider({ children, actor }: { children: ReactNode; actor: BookingRole }) {
  const [state, setState] = useState(initialDashboard);
  const current = useRef(state);
  const urls = useRef(new Set<string>());
  const dispatch = useCallback((action: DashboardAction) => {
    const next = reduceDashboard(current.current, action, actor);
    if (next === current.current) return false;
    current.current = next; setState(next); return true;
  }, [actor]);
  useEffect(() => {
    const active = new Set([...state.media.filter(item => item.src.startsWith('blob:')).map(item => item.src), ...state.evidence.map(file => file.url)]);
    urls.current.forEach(url => { if (!active.has(url)) URL.revokeObjectURL(url); });
    urls.current = active;
  }, [state.media, state.evidence]);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);
  return <DashboardContext.Provider value={{ state, dispatch }}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('DashboardProvider is required');
  return context;
}
