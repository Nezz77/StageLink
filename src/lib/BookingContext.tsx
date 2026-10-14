import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { BookingAction, BookingRole, BookingState } from "./booking"
import {
  initialPipeline,
  reducePipeline,
  type PipelineAction,
  type PipelineState,
} from "./pipeline"

const BookingContext = createContext<{
  booking: BookingState
  actor: BookingRole
  act: (action: BookingAction) => boolean
  state: PipelineState
  dispatch: (action: PipelineAction) => boolean
} | null>(null)

export function BookingProvider({
  actor,
  children,
}: {
  actor: BookingRole
  children: ReactNode
}) {
  // Each page load starts a fresh demo. This provider stays mounted through
  // navigation and role switches; old browser-stored events are never restored.
  const [state, setState] = useState<PipelineState>(initialPipeline)
  const current = useRef(state)
  const dispatch = useCallback(
    (action: PipelineAction) => {
      const next = reducePipeline(current.current, action, actor)
      if (next === current.current) return false
      current.current = next
      setState(next)
      return true
    },
    [actor],
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
        dispatch,
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
