import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  BOOKING_STORAGE_KEY,
  restoreBooking,
  type BookingAction,
  type BookingRole,
  type BookingState,
} from "./booking"
import {
  PIPELINE_KEY,
  initialPipeline,
  reducePipeline,
  restorePipeline,
  type PipelineAction,
  type PipelineEvent,
  type PipelineState,
} from "./pipeline"

type Store = { state: PipelineState; events: PipelineEvent[]; damaged: boolean }
const BookingContext = createContext<{
  booking: BookingState
  actor: BookingRole
  act: (action: BookingAction) => boolean
  storageUnavailable: boolean
  state: PipelineState
  dispatch: (action: PipelineAction) => boolean
  storageError: string
  retryStorage: () => void
} | null>(null)
function readStore(): Store {
  const raw = localStorage.getItem(PIPELINE_KEY)
  if (raw !== null) return restorePipeline(raw)
  const old = restoreBooking(localStorage.getItem(BOOKING_STORAGE_KEY))
  const events: PipelineEvent[] = old.events.map((event) => ({
    ...event,
    action: { type: "legacy", action: event.action },
  }))
  return restorePipeline(JSON.stringify(events))
}
export function BookingProvider({
  actor,
  children,
}: {
  actor: BookingRole
  children: ReactNode
}) {
  const [storageError, setStorageError] = useState("")
  const [store, setStore] = useState<Store>(() => {
    try {
      return readStore()
    } catch {
      return { state: initialPipeline(), events: [], damaged: false }
    }
  })
  const current = useRef(store)
  const dirty = useRef(false)
  const persist = useCallback((next: Store) => {
    if (next.damaged) {
      setStorageError(
        "Saved workspace data could not be read. Your changes remain in this session.",
      )
      dirty.current = true
      return
    }
    try {
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(next.events))
      setStorageError("")
      dirty.current = false
    } catch {
      setStorageError(
        "Browser storage is unavailable or full. Keep this tab open; changes are saved only in this session.",
      )
      dirty.current = true
    }
  }, [])
  useEffect(() => {
    persist(current.current)
    const sync = (event: StorageEvent) => {
      if (event.key !== PIPELINE_KEY) return
      if (dirty.current) {
        setStorageError(
          "Another tab changed this workspace while local saving was unavailable. Keep this tab open to preserve your session.",
        )
        return
      }
      const next = restorePipeline(event.newValue)
      if (next.damaged) {
        setStorageError(
          "Another tab saved unreadable workspace data. Your current session is preserved.",
        )
        return
      }
      current.current = next
      setStore(next)
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [persist])
  const dispatch = useCallback(
    (action: PipelineAction) => {
      // Refresh before each mutation so sequential changes from another tab are retained.
      if (!dirty.current) {
        try {
          const latest = readStore()
          if (!latest.damaged) current.current = latest
        } catch {
          /* retain this session */
        }
      }
      const at = new Date().toISOString()
      const nextState = reducePipeline(current.current.state, action, actor, at)
      if (nextState === current.current.state) return false
      const next = {
        ...current.current,
        state: nextState,
        events: [...current.current.events, { action, actor, at }],
      }
      current.current = next
      setStore(next)
      persist(next)
      return true
    },
    [actor, persist],
  )
  const act = useCallback(
    (action: BookingAction) => dispatch({ type: "legacy", action }),
    [dispatch],
  )
  return (
    <BookingContext.Provider
      value={{
        booking: store.state.bookings.find((record) => record.id === "BK-2901")!
          .ledger,
        actor,
        act,
        storageUnavailable: !!storageError,
        state: store.state,
        dispatch,
        storageError,
        retryStorage: () => persist(current.current),
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
