import { clearAttachments } from './chatAttachments'
import { useDashboard } from './DashboardContext'
import { catalogFor } from './catalog'
import type { BookingOptions } from './pipeline'
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { BookingAction, BookingRole, BookingState } from "./booking"
import {
  initialPipeline,
  bookingService,
  reducePipeline,
  type PipelineAction,
  type PipelineState,
} from "./pipeline"

const BookingContext = createContext<{
  booking: BookingState
  actor: BookingRole
  act: (action: BookingAction) => boolean
  state: PipelineState
  options: BookingOptions
  dispatch: (action: PipelineAction) => boolean
  getBooking: (id: string) => import('./pipeline').RecordBooking | undefined
} | null>(null)

export function BookingProvider({
  actor,
  children,
}: {
  actor: BookingRole
  children: ReactNode
}) {
  const { state: dashboard } = useDashboard()
  const options: BookingOptions = { availability: dashboard.availability, catalog: catalogFor(dashboard), organizer: dashboard.profiles.customer.name }
  // Each page load starts a fresh demo. This provider stays mounted through
  // navigation and role switches; old browser-stored events are never restored.
  const [state, setState] = useState<PipelineState>(initialPipeline)
  useEffect(() => () => clearAttachments(), [])
  const current = useRef(state)
  const dispatch = useCallback(
    (action: PipelineAction) => {
      if ((action.type === 'settle' || action.type === 'legacy') && action.action.type === 'release') {
      const record = current.current.bookings.find(record => record.id === (action.type === 'legacy' ? 'BK-2901' : action.id))
      if (!record || dashboard.payoutAccounts[bookingService(record).role].status !== 'verified') return false
    }
    const next = reducePipeline(current.current, action, actor, new Date().toISOString(), false, options)
      if (next === current.current) return false
      current.current = next
      setState(next)
      return true
    },
    [actor, dashboard],
  )
  const act = useCallback(
    (action: BookingAction) => dispatch({ type: "legacy", action }),
    [dispatch],
  )
  return (
    <BookingContext.Provider
      value={{
        booking: state.bookings.find((record) => record.id === "BK-2901")!.ledger,
        actor,
        act,
        state,
        options,
        dispatch,
        getBooking: (id: string) => current.current.bookings.find(record => record.id === id),
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}
export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) throw new Error("useBooking must be inside BookingProvider")
  return context
}
