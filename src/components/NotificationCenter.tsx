import { useEffect, useRef, useState } from "react"
import { Bell, MessageCircle, X } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { serviceFor, unreadFor, visibleTo } from "../lib/pipeline"
import "../pipeline.css"
export default function NotificationCenter() {
  const { state, actor, dispatch } = useBooking()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const records = state.bookings.filter(
    (record) => visibleTo(record, actor) && unreadFor(state, record, actor) > 0,
  )
  const count = records.reduce(
    (sum, record) => sum + unreadFor(state, record, actor),
    0,
  )
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [open])
  if (actor === "admin" || actor === "visitor") return null
  return (
    <div className="pw-notifications" ref={root}>
      <button
        ref={trigger}
        className="pw-icon pw-bell"
        aria-label={`Notifications, ${count} unread messages`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={17} />
        {count > 0 && <span>{count}</span>}
      </button>
      {open && (
        <section
          className="pw-notification-panel"
          aria-label="Message notifications"
        >
          <header>
            <h2>Behind the scenes</h2>
            <button
              className="pw-icon"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </header>
          {records.length ? (
            <>
              <button
                className="pw-text-button"
                onClick={() =>
                  records.forEach((record) =>
                    dispatch({ type: "read", id: record.id }),
                  )
                }
              >
                Mark all as read
              </button>
              {records.map((record) => (
                <button
                  className="pw-notification-item"
                  key={record.id}
                  onClick={() => {
                    setOpen(false)
                    window.dispatchEvent(
                      new CustomEvent("stagelink:open-thread", {
                        detail: record.id,
                      }),
                    )
                  }}
                >
                  <MessageCircle size={18} />
                  <span>
                    <strong>
                      {actor === "customer"
                        ? serviceFor(record.serviceId).name
                        : "Jordan Rivera"}
                    </strong>
                    <small>{record.event}</small>
                    <span>
                      {unreadFor(state, record, actor)} unread messages
                    </span>
                  </span>
                </button>
              ))}
            </>
          ) : (
            <p>You’re all caught up. New booking messages will appear here.</p>
          )}
          <footer>Local demo notifications</footer>
        </section>
      )}
    </div>
  )
}
