import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BOOKING_STORAGE_KEY, restoreBooking, transitionBooking, type BookingAction, type BookingRole, type BookingState } from './booking';

const BookingContext = createContext<{
  booking: BookingState;
  actor: BookingRole;
  act: (action: BookingAction) => boolean;
  storageUnavailable: boolean;
} | null>(null);

export function BookingProvider({ actor, children }: { actor: BookingRole; children: ReactNode }) {
  const [ledger, setLedger] = useState(() => {
    try { return restoreBooking(localStorage.getItem(BOOKING_STORAGE_KEY)); }
    catch { return restoreBooking(null); }
  });
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const current = useRef(ledger);
  const act = useCallback((action: BookingAction) => {
    const at = new Date().toISOString();
    const next = transitionBooking(current.current.state, action, actor, at);
    if (next === current.current.state) return false;
    current.current = { state: next, events: [...current.current.events, { action, actor, at }] };
    setLedger(current.current);
    return true;
  }, [actor]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(ledger.events));
      setStorageUnavailable(false);
    } catch { setStorageUnavailable(true); }
  }, [ledger]);

  return <BookingContext.Provider value={{ booking: ledger.state, actor, act, storageUnavailable }}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be inside BookingProvider');
  return context;
}
