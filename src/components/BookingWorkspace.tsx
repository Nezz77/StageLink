import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Download,
  FileText,
  History,
  Inbox,
  LoaderCircle,
  MessageCircle,
  Music2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  X,
} from "lucide-react"
import DashboardShell, {
  DashboardIntro,
  type DashboardNav,
} from "./DashboardShell"
import PaymentCheckout from "./PaymentCheckout"
import { useBooking } from "../lib/BookingContext"
import { amounts, money } from "../lib/booking"
import {
  blankForm,
  canRefund,
  conflicts,
  dateKey,
  paymentLabel,
  quoteFor,
  serviceFor,
  services,
  unreadFor,
  validateForm,
  visibleTo,
  type BookingForm,
  type RecordBooking,
  type Status,
} from "../lib/pipeline"
import PipelineChat from "./PipelineChat"
import "../pipeline.css"

export type WorkspaceSection = "bookings" | "calendar" | "history" | "requests" | "payments" | "chat"
type Screen = { kind: "list" } | { kind: "form"; form: BookingForm } | {
  kind: "review"
  form: BookingForm
} | { kind: "details" | "checkout" | "payment"; id: string }
const statusLabel: Record<Status, string> = {
  pending: "Pending",
  accepted: "Accepted",
  active: "Active",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
}
export const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
export function StatusPill({
  status,
  children,
}: {
  status: string
  children?: ReactNode
}) {
  return (
    <span className={`pw-status pw-${status}`}>
      <i />
      {children ?? status}
    </span>
  )
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="pw-empty">
      <Ticket size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}
function ConfirmDialog({
  title,
  children,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string
  children: ReactNode
  confirm: string
  onClose: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement
    const dialog = ref.current!
    dialog.showModal()
    return () => {
      dialog.close()
      trigger?.focus()
    }
  }, [])
  return (
    <dialog
      className="pw-dialog"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby="pw-dialog-title"
    >
      <div className="pw-dialog-content">
        <button
          className="pw-icon pw-dialog-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <span className="sl-eyebrow">ONE LAST CHECK</span>
        <h2 id="pw-dialog-title">{title}</h2>
        <p>{children}</p>
        <div className="pw-actions">
          <button className="btn-ghost" onClick={onClose}>
            Go back
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}
function Summary({ form }: { form: BookingForm }) {
  const service = serviceFor(form.serviceId)
  const quote = Math.max(0, quoteFor(form) || 0)
  const { feeCents, totalCents } = amounts(quote)
  return (
    <aside className="pw-pass">
      <div className="sl-eyebrow">YOUR EVENT / IN THE MAKING</div>
      <div className="pw-pass-art" aria-hidden="true">
        <Music2 size={48} />
        <span>✳</span>
      </div>
      <h2>{form.event || "A night to remember."}</h2>
      <p>{service.name}</p>
      <div className="pw-perforation" />
      <dl>
        <div>
          <dt>When</dt>
          <dd>{form.date ? dayLabel(form.date) : "Pick your date"}</dd>
        </div>
        <div>
          <dt>On stage</dt>
          <dd>
            {form.start}–{form.end}
          </dd>
        </div>
        <div>
          <dt>
            {service.unit === "hour" ? "Performance" : "Equipment · 1 day"}
          </dt>
          <dd>{money(quote)}</dd>
        </div>
        <div>
          <dt>Service fee · 5%</dt>
          <dd>{money(feeCents)}</dd>
        </div>
        <div className="pw-total">
          <dt>Estimated total</dt>
          <dd>{money(totalCents)}</dd>
        </div>
      </dl>
      <p className="pw-caption">
        Demo USD pricing. The provider confirms availability before checkout.
      </p>
      <div className="pw-barcode" />
      <span className="pw-mono">{form.id}</span>
    </aside>
  )
}
function BookingEditor({
  initial,
  onReview,
  onSaved,
  onBack,
}: {
  initial: BookingForm
  onReview: (form: BookingForm) => void
  onSaved: () => void
  onBack: () => void
}) {
  const { state, dispatch, storageUnavailable } = useBooking()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] =
    useState<Partial<Record<keyof BookingForm, string>>>({})
  const [notice, setNotice] = useState("")
  const [leave, setLeave] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const update = (key: keyof BookingForm, value: string) => {
    setForm((valueForm) => ({ ...valueForm, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setNotice("")
    setDirty(true)
  }
  const save = () => {
    if (dispatch({ type: "save_draft", form })) {
      setDirty(false)
      onSaved()
    } else setNotice("This draft could not be saved. Please try again.")
  }
  const field = (
    key: keyof BookingForm,
    label: string,
    type = "text",
    placeholder?: string,
  ) => (
    <label className="pw-field">
      {label}
      <input
        name={key}
        aria-label={label}
        type={type}
        value={form[key]}
        placeholder={placeholder}
        min={
          type === "date"
            ? dateKey(new Date())
            : type === "number"
              ? "1"
              : undefined
        }
        max={type === "number" ? "100000" : undefined}
        maxLength={type === "text" ? 200 : undefined}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
        onChange={(event) => update(key, event.target.value)}
      />
      {errors[key] && (
        <small id={`error-${key}`} className="pw-error">
          {errors[key]}
        </small>
      )}
    </label>
  )
  return (
    <>
      <button
        className="pw-back"
        onClick={() => (dirty ? setLeave(true) : onBack())}
      >
        <ArrowLeft size={15} /> Booking desk
      </button>
      <DashboardIntro
        eyebrow="01 / PLAN THE MOMENT"
        title="Set the"
        emphasis="scene."
        description="A few details today. An unforgettable event tomorrow."
      />
      <div className="pw-two-col">
        <form
          className="pw-panel pw-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const formElement = event.currentTarget
            const next = validateForm(form, state.bookings)
            setErrors(next)
            if (Object.keys(next).length) {
              setNotice("Check the highlighted details before continuing.")
              requestAnimationFrame(() =>
                formElement
                  .querySelector<HTMLInputElement>('[aria-invalid="true"]')
                  ?.focus(),
              )
            } else {
              setDirty(false)
              onReview(form)
            }
          }}
        >
          <div className="pw-section-label">
            <span>01</span>
            <h2>Choose your headliner</h2>
          </div>
          <div
            className="pw-service-options"
            role="group"
            aria-label="Artist or equipment"
          >
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => update("serviceId", service.id)}
                aria-pressed={form.serviceId === service.id}
                className={form.serviceId === service.id ? "selected" : ""}
              >
                <span className="pw-avatar">{service.initials}</span>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
                <span>
                  {money(service.rate)} / {service.unit}
                </span>
                {form.serviceId === service.id && <Check size={15} />}
              </button>
            ))}
          </div>
          <div className="pw-section-label">
            <span>02</span>
            <h2>The occasion & the essentials</h2>
          </div>
          {field("event", "Event name", "text", "e.g. A rooftop evening")}
          <div className="pw-fields">
            {field("date", "Event date", "date")}
            {field("guests", "Guest count", "number")}
            {field("start", "Start time", "time")}
            {field("end", "End time", "time")}
          </div>
          <p className="pw-caption">
            Times use your local timezone. Bookings must start and end on the
            same day.
          </p>
          {field(
            "venue",
            "Venue / location",
            "text",
            "Venue name, city & access details",
          )}
          <div className="pw-section-label">
            <span>03</span>
            <h2>Make it yours</h2>
          </div>
          <label className="pw-field">
            Requirements <span className="pw-muted">Optional</span>
            <textarea
              value={form.requirements}
              rows={4}
              maxLength={3000}
              placeholder="Set list, setup, accessibility, equipment needs…"
              onChange={(event) => update("requirements", event.target.value)}
            />
          </label>
          {notice && (
            <p className="pw-alert" role="alert">
              {notice}
            </p>
          )}
          <div className="pw-form-footer">
            <button
              type="button"
              className="btn-ghost sl-action"
              onClick={save}
            >
              <Save size={15} /> Save for later
            </button>
            <button className="btn-primary sl-action" type="submit">
              Review booking <ArrowRight size={15} />
            </button>
          </div>
          <p className="pw-caption">
            {storageUnavailable
              ? "Saving is currently limited to this session."
              : "Saved drafts stay in this browser, even after you close the tab."}
          </p>
        </form>
        <Summary form={form} />
      </div>
      {leave && (
        <ConfirmDialog
          title="Leave this draft?"
          confirm="Leave without saving"
          onClose={() => setLeave(false)}
          onConfirm={onBack}
        >
          Your latest edits have not been saved. Go back and choose Save for
          later to keep them.
        </ConfirmDialog>
      )}
    </>
  )
}
function BookingReview({
  form,
  onBack,
  onDone,
}: {
  form: BookingForm
  onBack: () => void
  onDone: (id: string) => void
}) {
  const { dispatch } = useBooking()
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  return (
    <>
      <button className="pw-back" onClick={onBack}>
        <ArrowLeft size={15} /> Edit details
      </button>
      <DashboardIntro
        eyebrow="02 / THE FINAL REHEARSAL"
        title="Everything,"
        emphasis="in tune."
        description="Review your request. Payment follows after your provider accepts."
      />
      <div className="pw-two-col">
        <section className="pw-panel pw-review">
          <span className="sl-eyebrow">BOOKING CONFIRMATION</span>
          <h2>{form.event}</h2>
          <dl className="pw-detail-grid">
            {[
              ["Provider", serviceFor(form.serviceId).name],
              ["Date", dayLabel(form.date)],
              ["Time", `${form.start}–${form.end}`],
              ["Guests", form.guests],
              ["Venue", form.venue],
              ["Organizer", "Jordan Rivera"],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3>Your requirements</h3>
          <p className="pw-prewrap">
            {form.requirements || "No extra requirements added."}
          </p>
          <label className="pw-check">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            I have reviewed the details and understand this is a demo booking
            request.
          </label>
          {error && (
            <p role="alert" className="pw-error">
              {error}
            </p>
          )}
          <div className="pw-actions">
            <button className="btn-ghost" onClick={onBack}>
              Edit details
            </button>
            <button
              className="btn-primary sl-action"
              disabled={!agreed}
              onClick={() => {
                if (dispatch({ type: "submit", form })) onDone(form.id)
                else
                  setError(
                    "The date or availability has changed. Return to the form and review your details.",
                  )
              }}
            >
              Send booking request <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <Summary form={form} />
      </div>
    </>
  )
}
function BookingDetails({
  record,
  onBack,
  onChat,
  onPay,
  onPayment,
}: {
  record: RecordBooking
  onBack: () => void
  onChat: () => void
  onPay: () => void
  onPayment: () => void
}) {
  const { actor, state, dispatch } = useBooking()
  const [confirm, setConfirm] = useState<"cancel" | "reject" | null>(null)
  const [error, setError] = useState("")
  const apply = (action: Parameters<typeof dispatch>[0]) => {
    if (!dispatch(action))
      setError(
        "This action is no longer available. Review the latest booking status.",
      )
  }
  const service = serviceFor(record.serviceId)
  const provider = actor === service.role
  const steps = [
    "Request sent",
    "Provider accepted",
    "Payment held",
    "Event complete",
  ]
  const step =
    record.status === "completed"
      ? 3
      : record.ledger.payment !== "unpaid"
        ? 2
        : record.status === "accepted"
          ? 1
          : 0
  return (
    <>
      <button className="pw-back" onClick={onBack}>
        <ArrowLeft size={15} /> All bookings
      </button>
      <DashboardIntro
        eyebrow={`${record.id} / BOOKING DETAILS`}
        title="Your next"
        emphasis="great night."
        description="The people, the plan, and every step along the way."
        action={
          <StatusPill status={record.status}>
            {statusLabel[record.status]}
          </StatusPill>
        }
      />
      <div className="pw-two-col">
        <div className="pw-stack">
          <section className="pw-panel pw-review">
            <div className="pw-panel-heading">
              <span className="sl-eyebrow">THE EVENT</span>
              <StatusPill status={record.ledger.payment}>
                {paymentLabel(record)}
              </StatusPill>
            </div>
            <h2>{record.event}</h2>
            <dl className="pw-detail-grid">
              {[
                ["Provider", service.name],
                ["Organizer", "Jordan Rivera"],
                ["Date", dayLabel(record.date)],
                ["Time", `${record.start}–${record.end}`],
                ["Venue", record.venue],
                ["Guests", record.guests],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <h3>Requirements</h3>
            <p className="pw-prewrap">
              {record.requirements || "No additional requirements."}
            </p>
            <div className="pw-actions">
              <button className="btn-ghost sl-action" onClick={onChat}>
                <MessageCircle size={15} /> Booking chat
              </button>
              {actor === "customer" &&
                record.status === "accepted" &&
                record.ledger.payment === "unpaid" && (
                  <button
                    className="btn-primary sl-action"
                    onClick={() => {
                      if (
                        record.ledger.quoteStatus === "awaiting_customer" &&
                        !dispatch({ type: "agree", id: record.id })
                      ) {
                        setError("This quote changed. Please review it again.")
                        return
                      }
                      onPay()
                    }}
                  >
                    {record.ledger.quoteStatus === "awaiting_customer"
                      ? "Agree to quote & checkout"
                      : "Continue to payment"}
                    <ArrowRight size={15} />
                  </button>
                )}
              {record.ledger.payment !== "unpaid" && (
                <button className="btn-primary" onClick={onPayment}>
                  Payment details
                </button>
              )}
            </div>
            {provider && record.status === "pending" && (
              <div className="pw-callout">
                <h3>A new request for your calendar</h3>
                <p>Review the timing and requirements before accepting.</p>
                {!!conflicts(record, state.bookings).length && (
                  <p role="alert" className="pw-error">
                    This request conflicts with another booking.
                  </p>
                )}
                <div className="pw-actions">
                  <button
                    className="btn-ghost"
                    onClick={() => setConfirm("reject")}
                  >
                    Decline request
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!!conflicts(record, state.bookings).length}
                    onClick={() =>
                      apply({ type: "respond", id: record.id, accept: true })
                    }
                  >
                    Accept request
                  </button>
                </div>
              </div>
            )}
            {provider && record.status === "active" && (
              <div className="pw-callout">
                <button
                  className="btn-ghost"
                  disabled={
                    !!record.refund ||
                    new Date(`${record.date}T${record.end}`) > new Date()
                  }
                  onClick={() => apply({ type: "complete", id: record.id })}
                >
                  Mark event complete
                </button>
                <p className="pw-caption">
                  Available after the event ends. Completion is followed by
                  payout review.
                </p>
              </div>
            )}
            {actor === "customer" &&
              ["pending", "accepted"].includes(record.status) &&
              record.ledger.payment === "unpaid" && (
                <button
                  className="pw-danger"
                  onClick={() => setConfirm("cancel")}
                >
                  Cancel booking
                </button>
              )}
            {error && (
              <p className="pw-error" role="alert">
                {error}
              </p>
            )}
          </section>
          <section className="pw-panel pw-review">
            <span className="sl-eyebrow">FROM HELLO TO ENCORE</span>
            <ol className="pw-journey">
              {steps.map((label, index) => (
                <li
                  key={label}
                  className={
                    index <= step &&
                    !["rejected", "cancelled"].includes(record.status)
                      ? "done"
                      : ""
                  }
                >
                  <span>
                    {index <= step ? <Check size={15} /> : `0${index + 1}`}
                  </span>
                  <strong>{label}</strong>
                </li>
              ))}
            </ol>
            {["rejected", "cancelled"].includes(record.status) && (
              <p className="pw-alert">This booking was {record.status}.</p>
            )}
            <h3>Activity</h3>
            <ul className="pw-activity">
              {record.activity
                .slice()
                .reverse()
                .map((activity, i) => (
                  <li key={`${activity.at}-${i}`}>
                    <span>{activity.label}</span>
                    <time>{new Date(activity.at).toLocaleString()}</time>
                  </li>
                ))}
            </ul>
          </section>
        </div>
        <Summary form={record} />
      </div>
      {confirm && (
        <ConfirmDialog
          title={
            confirm === "cancel"
              ? "Cancel this booking?"
              : "Decline this request?"
          }
          confirm={confirm === "cancel" ? "Cancel booking" : "Decline request"}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            apply(
              confirm === "cancel"
                ? { type: "cancel", id: record.id }
                : { type: "respond", id: record.id, accept: false },
            )
            setConfirm(null)
          }}
        >
          The booking history will keep this decision. A new request is needed
          if plans change.
        </ConfirmDialog>
      )}
    </>
  )
}
function CalendarView({
  bookings,
  open,
  create,
}: {
  bookings: RecordBooking[]
  open: (id: string) => void
  create?: (date: string) => void
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [selected, setSelected] = useState(dateKey(new Date()))
  const [service, setService] = useState("all")
  const records = bookings.filter(
    (record) =>
      !["rejected", "cancelled"].includes(record.status) &&
      (service === "all" || record.serviceId === service),
  )
  const offset = (month.getDay() + 6) % 7
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days = Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, i) => i - offset + 1,
  )
  return (
    <>
      <DashboardIntro
        eyebrow="YOUR PRODUCTION CALENDAR"
        title="Make room"
        emphasis="for the moment."
        description="See your schedule at a glance. Select a day to explore its bookings."
      />
      <div className="pw-calendar-layout">
        <section className="pw-panel pw-calendar">
          <div className="pw-panel-heading">
            <div className="pw-actions">
              <button
                className="pw-icon"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <h2>
                {month.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                className="pw-icon"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="pw-text-button"
              onClick={() => {
                const now = new Date()
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                setSelected(dateKey(now))
              }}
            >
              Today
            </button>
          </div>
          <label className="pw-field">
            Availability for
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              <option value="all">All services</option>
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="pw-calendar-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span className="pw-weekday" key={day}>
                {day}
              </span>
            ))}
            {days.map((day, index) => {
              if (day < 1 || day > count)
                return (
                  <span className="pw-calendar-blank" key={`blank-${index}`} />
                )
              const date = dateKey(
                new Date(month.getFullYear(), month.getMonth(), day),
              )
              const items = records.filter((record) => record.date === date)
              const conflict = items.some(
                (record) => conflicts(record, records).length,
              )
              return (
                <button
                  key={date}
                  className={`pw-day ${selected === date ? "selected" : ""} ${
                    date === dateKey(new Date()) ? "today" : ""
                  }`}
                  aria-label={`${dayLabel(date)}, ${items.length} bookings${
                    conflict ? ", conflict" : ""
                  }`}
                  aria-pressed={selected === date}
                  onClick={() => setSelected(date)}
                >
                  <span>{day}</span>
                  <div className="pw-date-dots">
                    {items.slice(0, 3).map((record) => (
                      <i
                        key={record.id}
                        className={`pw-dot-${record.status}`}
                      />
                    ))}
                  </div>
                  {items.length > 0 && (
                    <small>
                      {conflict ? "Conflict" : `${items.length} booked`}
                    </small>
                  )}
                </button>
              )
            })}
          </div>
          <div className="pw-calendar-legend">
            <span>
              <i className="pw-dot-active" /> Scheduled
            </span>
            <span>
              <i className="pw-dot-pending" /> Pending
            </span>
            <span>Empty days: no bookings in this demo</span>
          </div>
        </section>
        <aside className="pw-panel pw-agenda">
          <span className="sl-eyebrow">ON THE CALL SHEET</span>
          <h2>{dayLabel(selected)}</h2>
          {records
            .filter((record) => record.date === selected)
            .map((record) => (
              <button
                className="pw-agenda-item"
                key={record.id}
                onClick={() => open(record.id)}
              >
                <time>
                  {record.start}–{record.end}
                </time>
                <strong>{record.event}</strong>
                <span>{serviceFor(record.serviceId).name}</span>
                <StatusPill status={record.status}>
                  {statusLabel[record.status]}
                </StatusPill>
              </button>
            ))}
          {!records.some((record) => record.date === selected) && (
            <p className="pw-muted">
              A little space for something great. No bookings on this date.
            </p>
          )}
          {create && selected >= dateKey(new Date()) && (
            <button
              className="btn-primary sl-action"
              onClick={() => create(selected)}
            >
              <Plus size={15} /> Plan an event
            </button>
          )}
          <p className="pw-caption">
            Availability reflects bookings in this browser. Artist time slots
            cannot overlap; equipment is reserved for the day.
          </p>
        </aside>
      </div>
    </>
  )
}
function PaymentDetails({
  record,
  onBack,
  onBooking,
}: {
  record: RecordBooking
  onBack: () => void
  onBooking: () => void
}) {
  const { actor, dispatch } = useBooking()
  const [showRefund, setShowRefund] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const { feeCents, totalCents } = amounts(record.ledger.quoteCents)
  const refundEligible = canRefund(record)
  const paymentTime =
    record.ledger.history.find((event) => event.label.includes("received"))
      ?.at ?? record.createdAt
  const receipt = () => {
    const text = [
      "STAGELINK · DEMO RECEIPT",
      `Receipt: TX-${record.id}`,
      `Booking: ${record.id}`,
      `Event: ${record.event}`,
      `Provider: ${serviceFor(record.serviceId).name}`,
      `Date: ${dayLabel(record.date)}`,
      `Performance / rental: ${money(record.ledger.quoteCents)}`,
      `Service fee: ${money(feeCents)}`,
      `Total: ${money(totalCents)}`,
      `Status: ${paymentLabel(record)}`,
      "Demo record only. No real payment was made.",
    ].join("\n")
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `StageLink-${record.id}-receipt.txt`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <button className="pw-back" onClick={onBack}>
        <ArrowLeft size={15} /> All transactions
      </button>
      <DashboardIntro
        eyebrow={`TX-${record.id} / PAYMENT DETAILS`}
        title="Every payment,"
        emphasis="accounted for."
        description="Your receipt, holding status, and next steps in one place."
      />
      <div className="pw-two-col">
        <div className="pw-stack">
          <section className="pw-panel pw-review">
            <div className="pw-panel-heading">
              <span className="sl-eyebrow">DEMO TRANSACTION</span>
              <StatusPill
                status={record.refund ? "pending" : record.ledger.payment}
              >
                {paymentLabel(record)}
              </StatusPill>
            </div>
            <h2>{money(totalCents)}</h2>
            <p>{record.event}</p>
            <dl className="pw-detail-grid">
              {[
                ["Transaction", `TX-${record.id}`],
                ["Recorded", new Date(paymentTime).toLocaleString()],
                ["Provider", serviceFor(record.serviceId).name],
                [
                  "Method",
                  record.paymentMethod === "wallet"
                    ? "Demo wallet"
                    : "Demo card · 4242",
                ],
                ["Service", money(record.ledger.quoteCents)],
                ["Platform fee", money(feeCents)],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="pw-actions">
              <button className="btn-primary sl-action" onClick={receipt}>
                <Download size={15} /> Download receipt
              </button>
              <button className="btn-ghost" onClick={onBooking}>
                View booking
              </button>
            </div>
          </section>
          <section className="pw-panel pw-review">
            <span className="sl-eyebrow">REFUND REQUEST</span>
            <h2>Plans can change.</h2>
            {record.refund ? (
              <div className="pw-callout">
                <StatusPill status="pending">{paymentLabel(record)}</StatusPill>
                <p>{record.refund.reason}</p>
                <p className="pw-caption">
                  {record.refund.status === "requested"
                    ? "Your request is recorded. Funds stay on hold pending review; this is not an approved refund."
                    : "This seeded demo transaction illustrates a completed refund."}
                </p>
              </div>
            ) : actor !== "customer" ? (
              <p>Only the event organizer can request a refund.</p>
            ) : !refundEligible ? (
              <p>
                A refund can be requested before the event starts while funds
                are held and completion has not been reported.
              </p>
            ) : showRefund ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (reason.trim().length < 10) {
                    setError(
                      "Add at least 10 characters so the reviewer understands your request.",
                    )
                    return
                  }
                  if (!dispatch({ type: "refund", id: record.id, reason }))
                    setError(
                      "This payment is no longer eligible. Review its current status.",
                    )
                }}
              >
                <label className="pw-field">
                  Reason for refund
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Tell us what changed…"
                  />
                </label>
                <p className="pw-caption">
                  Submitting a request pauses payout for review. No funds move
                  in this demo.
                </p>
                {error && (
                  <p role="alert" className="pw-error">
                    {error}
                  </p>
                )}
                <div className="pw-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowRefund(false)}
                  >
                    Back
                  </button>
                  <button className="btn-primary">Submit refund request</button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  Eligible for a refund request under the demo policy: before
                  the event, with funds still held.
                </p>
                <button
                  className="btn-ghost"
                  onClick={() => setShowRefund(true)}
                >
                  Request a refund
                </button>
              </>
            )}
          </section>
        </div>
        <aside className="pw-pass">
          <ShieldCheck size={32} />
          <span className="sl-eyebrow">ESCROW TRACKING</span>
          <h2>
            Protected until
            <br />
            <em>the encore.</em>
          </h2>
          <ol className="pw-escrow">
            <li className="done">
              <Check size={16} />
              <div>
                <strong>Payment received</strong>
                <p>Added to the demo holding balance.</p>
              </div>
            </li>
            <li
              className={record.ledger.payment === "held" ? "current" : "done"}
            >
              <ShieldCheck size={16} />
              <div>
                <strong>
                  {record.refund ? paymentLabel(record) : "Held by StageLink"}
                </strong>
                <p>
                  {record.refund
                    ? "Refund review and payment status are recorded together."
                    : "Waiting for event completion and payout approval."}
                </p>
              </div>
            </li>
            <li className={record.ledger.payment === "released" ? "done" : ""}>
              <Check size={16} />
              <div>
                <strong>Released to provider</strong>
                <p>
                  {record.ledger.payment === "released"
                    ? "Payout complete in this demo record."
                    : "Funds have not been released."}
                </p>
              </div>
            </li>
          </ol>
          <p className="pw-caption">
            Frontend simulation. Payment processing and refund review require
            the production payment service.
          </p>
        </aside>
      </div>
    </>
  )
}

export default function BookingWorkspace({
  initialSection = "bookings",
  initialBookingId,
  onBack,
  onGoToLanding,
  roleControl,
}: {
  initialSection?: WorkspaceSection
  initialBookingId?: string
  roleControl?: ReactNode
  onBack: () => void
  onGoToLanding: () => void
}) {
  const { actor, state, dispatch, storageError, retryStorage } = useBooking()
  const [section, setSection] = useState<WorkspaceSection>(initialSection)
  const [screen, setScreen] = useState<Screen>({ kind: "list" })
  const [chatId, setChatId] = useState(initialBookingId)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [notice, setNotice] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formGuard, setFormGuard] = useState<{ run: () => void } | null>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [screen.kind])
  const requestNavigation = (run: () => void) => {
    if (screen.kind === "form" || screen.kind === "review")
      setFormGuard({ run })
    else run()
  }
  const role = actor === "artist" || actor === "renter" ? actor : "customer"
  const bookings = state.bookings.filter((record) => visibleTo(record, actor))
  const unread = bookings.reduce(
    (sum, record) => sum + unreadFor(state, record, actor),
    0,
  )
  const navItems: DashboardNav[] = [
    { id: "bookings", label: "Booking desk", icon: Ticket },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    ...(actor !== "customer"
      ? [
          {
            id: "requests",
            label: "Booking requests",
            icon: Inbox,
            count: bookings.filter((record) => record.status === "pending")
              .length,
          },
        ]
      : []),
    { id: "history", label: "Booking history", icon: History },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "chat", label: "Messages", icon: MessageCircle, count: unread },
  ]
  const navigate = (target: WorkspaceSection, targetChatId?: string) => {
    setChatId(target === "chat" ? targetChatId : undefined)
    setSection(target)
    setScreen({ kind: "list" })
    setSearch("")
    setFilter("all")
    setNotice("")
  }
  const open = (id: string) => {
    if (section === "chat") setSection("bookings")
    setScreen({ kind: "details", id })
  }
  const openChat = (id: string) => navigate("chat", id)
  const selected =
    "id" in screen
      ? bookings.find((record) => record.id === screen.id)
      : undefined
  const transactions = bookings.filter(
    (record) => record.ledger.payment !== "unpaid",
  )
  const shown = (section === "payments" ? transactions : bookings)
    .filter(
      (record) =>
        (section !== "history" ||
          ["completed", "rejected", "cancelled"].includes(record.status)) &&
        (section !== "requests" || record.status === "pending") &&
        (filter === "all" ||
          (section === "payments"
            ? paymentLabel(record) === filter
            : filter === "upcoming"
              ? ["accepted", "active"].includes(record.status) &&
                record.date >= dateKey(new Date())
              : record.status === filter)) &&
        `${record.id} ${record.event} ${serviceFor(record.serviceId).name} ${record.date}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (section === "history" || section === "payments")
        return b.date.localeCompare(a.date)
      const archived = (record: RecordBooking) =>
        ["completed", "cancelled", "rejected"].includes(record.status) ? 1 : 0
      return archived(a) - archived(b) || a.date.localeCompare(b.date)
    })
  return (
    <DashboardShell
      controls={roleControl}
      role={role}
      navItems={navItems}
      activeTab={section}
      onNavigate={(target) =>
        requestNavigation(() => navigate(target as WorkspaceSection))
      }
      onGoToLanding={() => requestNavigation(onGoToLanding)}
      onOpenChat={() => requestNavigation(() => navigate("chat"))}
    >
      <div className="pw-workspace">
        <div className="pw-workspace-top">
          <button
            className="pw-text-button"
            onClick={() => requestNavigation(onBack)}
          >
            <ArrowLeft size={13} />{" "}
            {role === "customer" ? "Discover" : "Your studio"}
          </button>
          <span>BOOK · PAY · CONNECT</span>
        </div>
        {storageError && (
          <div role="alert" className="pw-alert">
            <CircleAlert size={16} />
            <span>{storageError}</span>
            <button onClick={retryStorage}>Retry saving</button>
          </div>
        )}
        {notice && (
          <p className="pw-notice" role="status">
            <Check size={15} />
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={14} />
            </button>
          </p>
        )}
        {screen.kind === "form" ? (
          <BookingEditor
            key={screen.form.id}
            initial={screen.form}
            onReview={(form) => setScreen({ kind: "review", form })}
            onBack={() => setScreen({ kind: "list" })}
            onSaved={() => {
              setScreen({ kind: "list" })
              setNotice("Draft saved. Resume it from Saved for later.")
            }}
          />
        ) : screen.kind === "review" ? (
          <BookingReview
            form={screen.form}
            onBack={() => setScreen({ kind: "form", form: screen.form })}
            onDone={(id) => {
              open(id)
              setNotice(
                "Booking request sent. Your provider can now accept or decline.",
              )
            }}
          />
        ) : screen.kind === "details" && selected ? (
          <BookingDetails
            key={selected.id}
            record={selected}
            onBack={() => setScreen({ kind: "list" })}
            onChat={() => openChat(selected.id)}
            onPay={() => {
              setSection("payments")
              setScreen({ kind: "checkout", id: selected.id })
            }}
            onPayment={() => {
              setSection("payments")
              setScreen({ kind: "payment", id: selected.id })
            }}
          />
        ) : screen.kind === "checkout" && selected ? (
          <PaymentCheckout
            key={selected.id}
            bookingId={selected.id}
            artist={serviceFor(selected.serviceId).name}
            event={selected.event}
            quoteCents={selected.ledger.quoteCents}
            feeCents={amounts(selected.ledger.quoteCents).feeCents}
            onPaid={(method) =>
              dispatch({
                type: "pay",
                method,
                id: selected.id,
                quoteVersion: selected.ledger.quoteVersion,
                totalCents: amounts(selected.ledger.quoteCents).totalCents,
              })
            }
            onBack={() => open(selected.id)}
            onViewBooking={() => open(selected.id)}
          />
        ) : screen.kind === "payment" && selected ? (
          <PaymentDetails
            key={selected.id}
            record={selected}
            onBack={() => navigate("payments")}
            onBooking={() => open(selected.id)}
          />
        ) : section === "chat" ? (
          <PipelineChat initialBookingId={chatId} onOpenBooking={open} />
        ) : section === "calendar" ? (
          <CalendarView
            bookings={bookings}
            open={open}
            create={
              actor === "customer"
                ? (date) =>
                    setScreen({ kind: "form", form: { ...blankForm(), date } })
                : undefined
            }
          />
        ) : (
          <>
            <DashboardIntro
              eyebrow={
                section === "payments"
                  ? "THE BUSINESS BEHIND THE MOMENT"
                  : section === "history"
                    ? "YOUR PAST PRODUCTIONS"
                    : section === "requests"
                      ? "WAITING IN THE WINGS"
                      : "YOUR EVENT DESK"
              }
              title={
                section === "payments"
                  ? "Good nights."
                  : section === "history"
                    ? "Worth"
                    : section === "requests"
                      ? "Your next"
                      : "Great nights,"
              }
              emphasis={
                section === "payments"
                  ? "Clear payments."
                  : section === "history"
                    ? "remembering."
                    : section === "requests"
                      ? "encore awaits."
                      : "in the making."
              }
              description={
                section === "payments"
                  ? "Every transaction, receipt, and holding status. All accounted for."
                  : section === "history"
                    ? "Revisit completed events, declined requests, and cancelled plans."
                    : section === "requests"
                      ? "Review the details and make room for your next performance."
                      : "From the first idea to the final encore. Keep it all together."
              }
              action={
                actor === "customer" && section !== "payments" ? (
                  <button
                    className="btn-primary sl-action"
                    onClick={() =>
                      setScreen({ kind: "form", form: blankForm() })
                    }
                  >
                    <Plus size={16} /> Create booking
                  </button>
                ) : undefined
              }
            />
            {section === "bookings" && (
              <>
                <div className="pw-stats">
                  {([
                    ["upcoming", "Upcoming", CalendarDays],
                    ["pending", "Pending", Clock3],
                    ["active", "Active", Music2],
                    ["completed", "Completed", Check],
                  ] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      className={`pw-stat ${filter === key ? "selected" : ""}`}
                      onClick={() => setFilter(filter === key ? "all" : key)}
                      aria-pressed={filter === key}
                    >
                      <div>
                        <span>{label}</span>
                        <Icon size={17} />
                      </div>
                      <strong>
                        {bookings
                          .filter((record) =>
                            key === "upcoming"
                              ? ["accepted", "active"].includes(
                                  record.status,
                                ) && record.date >= dateKey(new Date())
                              : record.status === key,
                          )
                          .length.toString()
                          .padStart(2, "0")}
                      </strong>
                      <small>
                        {key === "pending"
                          ? "Awaiting a response"
                          : key === "active"
                            ? "Payment held · getting ready"
                            : key === "completed"
                              ? "A moment well made"
                              : "Next on your calendar"}
                        <ArrowRight size={13} />
                      </small>
                    </button>
                  ))}
                </div>
                {actor === "customer" && state.drafts.length > 0 && (
                  <section className="pw-drafts">
                    <div className="pw-panel-heading">
                      <h2>
                        <Save size={17} /> Saved for later{" "}
                        <span>{state.drafts.length}</span>
                      </h2>
                      <small>Only in this browser</small>
                    </div>
                    {state.drafts.map((draft) => (
                      <div className="pw-draft" key={draft.id}>
                        <div>
                          <strong>{draft.event || "Untitled event"}</strong>
                          <span>
                            {serviceFor(draft.serviceId).name} ·{" "}
                            {draft.date
                              ? dayLabel(draft.date)
                              : "Date to be decided"}
                          </span>
                        </div>
                        <button
                          className="btn-ghost"
                          onClick={() =>
                            setScreen({ kind: "form", form: draft })
                          }
                        >
                          Resume draft <ArrowRight size={13} />
                        </button>
                        <button
                          className="pw-icon"
                          aria-label={`Delete draft ${draft.event || "Untitled event"}`}
                          onClick={() => setDeleteId(draft.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
            {section === "payments" && (
              <div className="pw-stats pw-payment-stats">
                {[
                  [
                    "Held in escrow",
                    transactions.filter(
                      (record) =>
                        record.ledger.payment === "held" && !record.refund,
                    ),
                  ],
                  [
                    "Released",
                    transactions.filter(
                      (record) => record.ledger.payment === "released",
                    ),
                  ],
                  ["Refunds", transactions.filter((record) => !!record.refund)],
                ].map(([label, items]) => (
                  <div className="pw-stat" key={label as string}>
                    <div>
                      <span>{label as string}</span>
                      <ShieldCheck size={17} />
                    </div>
                    <strong>
                      {money(
                        (items as RecordBooking[]).reduce(
                          (sum, record) =>
                            sum + amounts(record.ledger.quoteCents).totalCents,
                          0,
                        ),
                      )}
                    </strong>
                    <small>
                      {(items as RecordBooking[]).length} demo transactions
                    </small>
                  </div>
                ))}
              </div>
            )}
            <section className="pw-panel pw-booking-list">
              <div className="pw-list-heading">
                <div>
                  <span className="sl-eyebrow">
                    {section === "payments"
                      ? "YOUR TRANSACTIONS"
                      : "THE CALL SHEET"}
                  </span>
                  <h2>
                    {section === "payments"
                      ? "Payment history"
                      : section === "requests"
                        ? "Incoming requests"
                        : section === "history"
                          ? "Booking history"
                          : "Your bookings"}{" "}
                    <span>{shown.length}</span>
                  </h2>
                </div>
                <div className="pw-filters">
                  <label className="pw-search">
                    <Search size={16} />
                    <input
                      aria-label={
                        section === "payments"
                          ? "Search transactions"
                          : "Search bookings"
                      }
                      placeholder="Search name, ID, date…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter status"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {(section === "payments"
                      ? [
                          "Held in escrow",
                          "Released",
                          "Refund requested",
                          "Refunded",
                        ]
                      : section === "history"
                        ? ["completed", "cancelled", "rejected"]
                        : section === "requests"
                          ? ["pending"]
                          : [
                              "upcoming",
                              "pending",
                              "accepted",
                              "active",
                              "completed",
                              "rejected",
                              "cancelled",
                            ]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {shown.length ? (
                shown.map((record) => (
                  <button
                    className="pw-booking-row"
                    key={record.id}
                    onClick={() =>
                      section === "payments"
                        ? setScreen({ kind: "payment", id: record.id })
                        : open(record.id)
                    }
                  >
                    <span className="pw-date-block">
                      <small>
                        {new Date(`${record.date}T12:00:00`).toLocaleString(
                          "en",
                          { month: "short" },
                        )}
                      </small>
                      <strong>{Number(record.date.slice(-2))}</strong>
                    </span>
                    <span className="pw-booking-info">
                      <small>
                        {record.id} ·{" "}
                        {record.serviceId === "aria"
                          ? "PERFORMANCE"
                          : "EQUIPMENT"}
                      </small>
                      <strong>{record.event}</strong>
                      <span>
                        {serviceFor(record.serviceId).name} <i>·</i>{" "}
                        {record.start}–{record.end}
                      </span>
                    </span>
                    <StatusPill
                      status={
                        section === "payments"
                          ? record.refund
                            ? "pending"
                            : record.ledger.payment
                          : record.status
                      }
                    >
                      {section === "payments"
                        ? paymentLabel(record)
                        : statusLabel[record.status]}
                    </StatusPill>
                    <span className="pw-row-price">
                      <strong>
                        {money(amounts(record.ledger.quoteCents).totalCents)}
                      </strong>
                      <small>
                        {section === "payments"
                          ? "View transaction"
                          : paymentLabel(record)}
                      </small>
                    </span>
                    <ArrowRight size={17} className="pw-row-arrow" />
                  </button>
                ))
              ) : (
                <EmptyState
                  title={
                    search || filter !== "all"
                      ? "No matches this time."
                      : section === "requests"
                        ? "You’re all caught up."
                        : "A little room for your next event."
                  }
                  action={
                    search || filter !== "all" ? (
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setSearch("")
                          setFilter("all")
                        }}
                      >
                        Clear filters
                      </button>
                    ) : undefined
                  }
                >
                  {search || filter !== "all"
                    ? "Try another search or clear your filters."
                    : section === "payments"
                      ? "Paid bookings will appear here with receipts and escrow tracking."
                      : "Your bookings will appear here as your plans take shape."}
                </EmptyState>
              )}
            </section>
            <div className="pw-bottom-note">
              <ShieldCheck size={15} />
              <span>
                Demo workspace · saved in this browser · switch roles to try
                both sides of a booking.
              </span>
            </div>
          </>
        )}
        {deleteId && (
          <ConfirmDialog
            title="Delete this draft?"
            confirm="Delete draft"
            onClose={() => setDeleteId(null)}
            onConfirm={() => {
              dispatch({ type: "delete_draft", id: deleteId })
              setDeleteId(null)
            }}
          >
            This removes the saved form from your browser. Existing bookings
            stay in your history.
          </ConfirmDialog>
        )}
        {formGuard && (
          <ConfirmDialog
            title="Save before you go?"
            confirm="Leave this form"
            onClose={() => setFormGuard(null)}
            onConfirm={() => {
              formGuard.run()
              setFormGuard(null)
            }}
          >
            Return to the form and choose Save for later to keep your latest
            changes.
          </ConfirmDialog>
        )}
      </div>
    </DashboardShell>
  )
}
