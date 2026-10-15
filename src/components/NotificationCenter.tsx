import { useEffect, useRef, useState } from "react"
import { Bell, Check, MessageCircle, Ticket, X } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { notificationsFor, bookingService, unreadFor, visibleTo } from "../lib/pipeline"
import "../pipeline.css"
import { useDashboard } from '../lib/DashboardContext'
import { inquiryUnread } from '../lib/community'
import type { MemberRole } from '../lib/dashboard'

export default function NotificationCenter() {
  const { state, actor, dispatch } = useBooking()
  const { state: dashboard, dispatch: manage } = useDashboard()
  const enquiries = dashboard.inquiries.filter(item => (actor === 'customer' || item.provider === actor) && inquiryUnread(item, actor as MemberRole) > 0)
  const [open, setOpen] = useState(false)
  const [onlyUnread, setOnlyUnread] = useState(true)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const records = actor === "admin" ? [] : state.bookings.filter(record => visibleTo(record, actor) && unreadFor(state, record, actor) > 0)
  const notifications = notificationsFor(state, actor)
  const count = enquiries.reduce((sum,item) => sum + inquiryUnread(item, actor as MemberRole), 0) + notifications.filter(item => !item.readBy.includes(actor)).length + records.reduce((sum, record) => sum + unreadFor(state, record, actor), 0)
  const shown = notifications.filter(item => !onlyUnread || !item.readBy.includes(actor))
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus() } }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape) }
  }, [open])
  if (actor === "visitor") return null
  return <div className="pw-notifications" ref={root}>
    <button ref={trigger} className="pw-icon pw-bell" aria-label={`Notifications, ${count} unread updates`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={17} />{count > 0 && <span>{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section className="pw-notification-panel" aria-label="Notifications">
      <header><h2>Behind the scenes</h2><button className="pw-icon" aria-label="Close notifications" onClick={close}><X size={15} /></button></header>
      <div className="pw-notification-tools">
        <div className="pw-chat-filters"><button aria-pressed={onlyUnread} className={onlyUnread ? "active" : ""} onClick={() => setOnlyUnread(true)}>Unread</button><button aria-pressed={!onlyUnread} className={!onlyUnread ? "active" : ""} onClick={() => setOnlyUnread(false)}>All updates</button></div>
        {count > 0 && <button className="pw-text-button" onClick={() => {
          enquiries.forEach(item => manage({type:'inquiry_read',id:item.id}))
          records.forEach(record => dispatch({ type: "read", id: record.id }))
          notifications.filter(item => !item.readBy.includes(actor)).forEach(item => dispatch({ type: "read_notification", id: item.id }))
        }}>Mark all as read</button>}
      </div>
      <div className="pw-notification-list">
        {enquiries.map(item => <button className="pw-notification-item" key={item.id} onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('stagelink:open-inquiry',{detail:item.id})); }}><MessageCircle size={18}/><span><strong>{actor === 'customer' ? item.providerName : item.customerName}</strong><small>{item.title} · Enquiry</small><span>{inquiryUnread(item,actor as MemberRole)} unread messages</span></span></button>)}
        {records.map(record => <button className="pw-notification-item" key={record.id} onClick={() => {
          setOpen(false)
          window.dispatchEvent(new CustomEvent("stagelink:open-thread", { detail: record.id }))
        }}><MessageCircle size={18} /><span><strong>{actor === "customer" ? bookingService(record).name : record.organizer ?? "Jordan Rivera"}</strong><small>{record.event}</small><span>{unreadFor(state, record, actor)} unread {unreadFor(state, record, actor) === 1 ? "message" : "messages"}</span></span></button>)}
        {shown.map(item => <button className={`pw-notification-item ${item.readBy.includes(actor) ? "is-read" : ""}`} key={item.id} onClick={() => {
          dispatch({ type: "read_notification", id: item.id })
          setOpen(false)
          window.dispatchEvent(new CustomEvent("stagelink:open-update", { detail: { id: item.bookingId, section: item.section } }))
        }}><Ticket size={18} /><span><strong>{item.title}</strong><small>{state.bookings.find(record => record.id === item.bookingId)?.event}</small><time dateTime={item.at}>{new Date(item.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span>{item.readBy.includes(actor) && <Check size={14} aria-label="Read" />}</button>)}
        {!enquiries.length && !records.length && !shown.length && <p className="pw-notification-empty">You’re all caught up. Booking, payment and message updates will appear here.</p>}
      </div>
      <footer>Demo updates · Cleared on refresh</footer>
    </section>}
  </div>
}
