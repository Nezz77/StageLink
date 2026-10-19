import AttachmentPreview from './AttachmentPreview'
import QuotationCard, { QuoteComposer } from './QuotationCard'
import ChatDemoControls from './ChatDemoControls'
import { negotiationOpen } from '../lib/pipeline'
import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Download,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { downloadAttachment, saveAttachment, removeAttachment } from "../lib/chatAttachments"
import {
  bookingService,
  messageSeen,
  unreadFor,
  visibleTo,
  type Attachment,
} from "../lib/pipeline"
import { DashboardIntro } from "./DashboardShell"
import { dayLabel, EmptyState, StatusPill } from "./BookingWorkspace"

export default function PipelineChat({
  initialBookingId,
  onOpenBooking,
}: {
  initialBookingId?: string
  onOpenBooking: (id: string) => void
}) {
  const { state, actor, dispatch } = useBooking()
  const records = state.bookings.filter((record) => visibleTo(record, actor))
  const [selectedId, setSelectedId] = useState(
    initialBookingId ??
      records.find((record) => unreadFor(state, record, actor) > 0)?.id ??
      records[0]?.id,
  )
  const [search, setSearch] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [mobileThread, setMobileThread] = useState(!!initialBookingId)
  const [quoting, setQuoting] = useState(false)
  const [pauseRead, setPauseRead] = useState(false)
  const [typing, setTyping] = useState(false)
  const [notice, setNotice] = useState("")
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const record = records.find((item) => item.id === selectedId)
  const messages = state.messages.filter(
    (message) => message.bookingId === selectedId,
  ).sort((a,b) => Date.parse(a.at)-Date.parse(b.at))
  const unreadChatUpdates = state.notifications.filter(note => note.bookingId === selectedId && note.section === "chat" && note.recipients.includes(actor) && !note.readBy.includes(actor)).length
  const unread = record ? unreadFor(state, record, actor) : 0
  useEffect(() => {
    const markVisible = () => {
      if (
        record &&
        (unread || unreadChatUpdates) && !pauseRead &&
        (mobileThread || window.matchMedia("(min-width: 901px)").matches) &&
        document.visibilityState === "visible"
      )
        dispatch({ type: "read", id: record.id })
    }
    markVisible()
    document.addEventListener("visibilitychange", markVisible)
    window.addEventListener("focus", markVisible)
    window.addEventListener("resize", markVisible)
    return () => {
      document.removeEventListener("visibilitychange", markVisible)
      window.removeEventListener("focus", markVisible)
      window.removeEventListener("resize", markVisible)
    }
  }, [record?.id, unread, unreadChatUpdates, mobileThread, dispatch, pauseRead])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [selectedId, messages.length])
  const threadName = (record: typeof records[number]) =>
    actor === "customer" ? bookingService(record).name : record.organizer ?? "Jordan Rivera"
  const filtered = records.filter(
    (item) =>
      `${item.event} ${item.id} ${threadName(item)}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!onlyUnread || unreadFor(state, item, actor) > 0),
  )
  const input = selectedId ? (state.messageDrafts[`${actor}:${selectedId}`] ?? "") : ""
  const file = selectedId ? files[selectedId] : undefined
  const send = async () => {
    if (!record || sending.current || (!input.trim() && !file)) return
    const bookingId = record.id
    const text = input.trim()
    const attached = file
    const messageId = crypto.randomUUID()
    sending.current = true
    setBusy(true)
    setError("")
    let savedAttachmentId: string | undefined
    let sent = false
    try {
      let attachment: Attachment | undefined
      if (attached) {
        const id = crypto.randomUUID()
        savedAttachmentId = id
        await saveAttachment(id, attached)
        attachment = {
          id,
          name: attached.name,
          size: attached.size,
          type: attached.type,
        }
      }
      if (!mounted.current) return
      if (
        !dispatch({
          type: "send",
          message: { id: messageId, bookingId, text, attachment },
        })
      )
        throw new Error("This message could not be added. Please try again.")
      sent = true
      setPauseRead(false)
      setFiles((previous) => ({ ...previous, [bookingId]: undefined }))
      if (fileInput.current) fileInput.current.value = ""
    } catch (issue) {
      if (mounted.current)
        setError(
          issue instanceof Error
            ? issue.message
            : "The attachment could not be saved. Remove it or try again.",
        )
    } finally {
      if (savedAttachmentId && !sent) removeAttachment(savedAttachmentId)
      sending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <>
      <DashboardIntro
        eyebrow="THE CONVERSATIONS BEHIND THE CURTAIN"
        title="A little closer"
        emphasis="to showtime."
        description="Keep every conversation connected to the booking it belongs to."
      />
      <div className={`pw-chat ${mobileThread ? "show-thread" : ""}`}>
        <aside className="pw-inbox">
          <div className="pw-inbox-top">
            <h2>
              Inbox <span>{records.length}</span>
            </h2>
            <label className="pw-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations…"
                aria-label="Search conversations"
              />
            </label>
            <div className="pw-chat-filters">
              <button
                className={!onlyUnread ? "active" : ""}
                onClick={() => setOnlyUnread(false)}
              >
                All messages
              </button>
              <button
                className={onlyUnread ? "active" : ""}
                onClick={() => setOnlyUnread(true)}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="pw-threads">
            {filtered.map((item) => {
              const threadMessages = state.messages.filter(
                (message) => message.bookingId === item.id,
              ).sort((a,b) => Date.parse(a.at)-Date.parse(b.at))
              const last = threadMessages[threadMessages.length - 1]
              const count = unreadFor(state, item, actor)
              return (
                <button
                  key={item.id}
                  className={`pw-thread-link ${
                    selectedId === item.id ? "selected" : ""
                  }`}
                  onClick={() => {
                    setPauseRead(false)
                    setQuoting(false)
                    setSelectedId(item.id)
                    setMobileThread(true)
                    setError("")
                  }}
                >
                  <span className="pw-avatar">
                    {actor === "customer"
                      ? bookingService(item).initials
                      : "JR"}
                  </span>
                  <span>
                    <strong>{threadName(item)}</strong>
                    <small>{item.event}</small>
                    <p>
                      {(last?.quotationId ? `Quotation v${item.quotations.find(quote => quote.id === last.quotationId)?.version ?? "—"}` : last?.text) ||
                        (last?.attachment
                          ? `Attachment: ${last.attachment.name}`
                          : "Start the conversation")}
                    </p>
                  </span>
                  {count > 0 && (
                    <b
                      className="pw-unread"
                      aria-label={`${count} unread messages`}
                    >
                      {count}
                    </b>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="pw-chat-empty">
                <MessageCircle size={24} />
                <p>
                  {onlyUnread
                    ? "You’re all caught up."
                    : "No matching conversations."}
                </p>
                <button
                  className="pw-text-button"
                  onClick={() => {
                    setSearch("")
                    setOnlyUnread(false)
                  }}
                >
                  Show all conversations
                </button>
              </div>
            )}
          </div>
          <p className="pw-chat-note">
            Temporary demo · switch roles in this tab to try both sides.
            Refreshing clears messages and attachments.
          </p>
        </aside>
        {record ? (
          <section
            className="pw-thread"
            aria-label={`Conversation for ${record.event}`}
          >
            <header className="pw-thread-header">
              <button
                className="pw-icon pw-mobile-back"
                onClick={() => setMobileThread(false)}
                aria-label="Back to inbox"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="pw-avatar">
                {actor === "customer"
                  ? bookingService(record).initials
                  : "JR"}
              </span>
              <div>
                <h2>{threadName(record)}</h2>
                <span>Booking conversation · {record.id}</span>
              </div>
              <button
                className="pw-icon"
                aria-label="View linked booking"
                onClick={() => onOpenBooking(record.id)}
              >
                <ArrowRight size={18} />
              </button>
            </header>
            <button
              className="pw-booking-pin"
              onClick={() => onOpenBooking(record.id)}
            >
              <CalendarDays size={17} />
              <span>
                <strong>{record.event}</strong>
                <small>
                  {dayLabel(record.date)} · {record.start}
                </small>
              </span>
              <StatusPill status={record.status}>{record.status}</StatusPill>
            </button>
            <div
              className="pw-messages"
              role="log"
              aria-label="Booking messages"
              aria-live="polite"
              aria-relevant="additions"
            >
              {!messages.length && (
                <EmptyState title="Start on the right note.">
                  Introduce yourself, share the plan, or ask about the little
                  details.
                </EmptyState>
              )}
              {messages.map((message, index) => {
                const mine = message.sender === actor
                const newDay =
                  index === 0 ||
                  message.at.slice(0, 10) !==
                    messages[index - 1].at.slice(0, 10)
                return (
                  <div key={message.id}>
                    {newDay && (
                      <div className="pw-message-day">
                        {new Date(message.at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    )}
                    <article className={`pw-message ${mine ? "mine" : ""}`}>
                      <div className="pw-message-meta">
                        <strong>
                          {mine
                            ? "You"
                            : message.sender === "customer"
                              ? record.organizer ?? "Jordan Rivera"
                              : bookingService(record).name}
                        </strong>
                        <time dateTime={message.at}>
                          {new Date(message.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      {message.simulated && <small className="m4-simulated">Simulated incoming reply</small>}
                      {message.quotationId && (() => { const quote = record.quotations.find(item => item.id === message.quotationId); return quote ? <QuotationCard quote={quote} record={record} onCounter={() => setQuoting(true)} onBooking={() => onOpenBooking(record.id)} /> : <p>Quotation is no longer available.</p> })()}
                      {message.text && (
                        <p className="pw-bubble">{message.text}</p>
                      )}
                      {message.attachment && <AttachmentPreview attachment={message.attachment} />}
                      {message.attachment && (
                        <button
                          className="pw-file"
                          onClick={() => {
                            void downloadAttachment(
                              message.attachment!.id,
                              message.attachment!.name,
                            ).catch((issue) =>
                              setError(
                                issue instanceof Error
                                  ? issue.message
                                  : "Unable to open this attachment.",
                              ),
                            )
                          }}
                        >
                          <Paperclip size={16} />
                          <span>
                            {message.attachment.name}
                            <small>
                              {Math.max(
                                1,
                                Math.ceil(message.attachment.size / 1024),
                              )}{" "}
                              KB · Download
                            </small>
                          </span>
                          <Download size={15} />
                        </button>
                      )}
                      {mine && (
                        <small className="pw-delivery">
                          {messageSeen(state, message, record) ? "Seen in demo" : "Sent in demo"}
                        </small>
                      )}
                    </article>
                  </div>
                )
              })}
              {typing && <p className="m4-typing" role="status">{threadName(record)} is typing… <span>Demo simulation</span></p>}
              <div ref={endRef} />
            </div>
            <ChatDemoControls key={`demo:${record.id}`} onTyping={setTyping} onReply={text => {setPauseRead(true);dispatch({type:'demo_reply',id:record.id,text})}} onSeen={() => dispatch({type:'demo_seen',id:record.id})} onUnread={() => {setPauseRead(true);dispatch({type:'demo_unread',id:record.id})}} />
            {pauseRead && <div className="m4-read-demo"><span>Unread state held for demonstration.</span><button className="pw-text-button" onClick={() => {dispatch({type:'read',id:record.id});setPauseRead(false)}}>Read this conversation</button></div>}
            {actor === bookingService(record).role && negotiationOpen(record) && <button className="btn-ghost m4-new-quote" onClick={() => setQuoting(true)}>Create quotation</button>}
            <form
              className="pw-composer"
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              {error && (
                <p className="pw-error" role="alert">
                  {error}
                </p>
              )}
              {file && (
                <div className="pw-attached">
                  <Paperclip size={13} />
                  <span>{file.name}</span>
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() =>
                      setFiles((previous) => ({
                        ...previous,
                        [record.id]: undefined,
                      }))
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="pw-compose-row">
                <textarea
                  aria-label="Message"
                  placeholder={`Message ${threadName(record)}…`}
                  maxLength={4000}
                  rows={2}
                  value={input}
                  disabled={busy}
                  onChange={(event) => {dispatch({type:'message_draft',id:record.id,text:event.target.value});setNotice('')}}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault()
                      void send()
                    }
                  }}
                />
                <button
                  type="submit"
                  className="pw-send"
                  aria-label="Send message"
                  disabled={busy || (!input.trim() && !file)}
                >
                  {busy ? (
                    <LoaderCircle size={18} className="pw-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <div className="pw-composer-tools">
                <input
                  type="file"
                  ref={fileInput}
                  className="sr-only"
                  aria-label="Choose attachment"
                  tabIndex={-1}
                  onChange={(event) => {
                    const next = event.target.files?.[0]
                    if (next && next.size > 5 * 1024 * 1024) {
                      setError("Choose an attachment smaller than 5 MB.")
                      event.target.value = ""
                      return
                    }
                    setError("")
                    setFiles((previous) => ({ ...previous, [record.id]: next }))
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (fileInput.current) {
                      fileInput.current.value = ""
                      fileInput.current.click()
                    }
                  }}
                >
                  <Paperclip size={15} /> Add attachment
                </button>
                <button type="button" onClick={() => setNotice('Message draft saved for later in this session. Attachments must be sent before leaving.')} disabled={!input.trim()}>Save for later</button>
                <span>Enter to send · up to 5 MB</span>
              </div>
              {notice && <p role="status">{notice}</p>}
            </form>
            {quoting && <QuoteComposer key={`quote:${record.id}`} record={record} onClose={() => setQuoting(false)} />}
          </section>
        ) : (
          <EmptyState title="Your inbox is ready.">
            Create a booking to start a conversation.
          </EmptyState>
        )}
      </div>
    </>
  )
}
