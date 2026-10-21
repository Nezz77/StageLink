import BookingDocuments from './BookingDocuments'
import BookingMilestones from './BookingMilestones'
import CompletedBookingReview from './BookingReview'
import { useEffect, useState, type ReactNode } from "react"
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
import ConfirmDialog from "./ConfirmDialog"
import DemoPerformance from "./DemoPerformance"
import PaymentCheckout from "./PaymentCheckout"
import { useBooking } from "../lib/BookingContext"
import { amounts, checkoutFor, money, settlement, type PaymentKind } from "../lib/booking"
import {
  blankForm,
  canRefund,
  canCancel,
  refundBlocks,
  conflicts,
  availabilityError,
  dateKey,
  paymentLabel,
  performanceEndsAt,
  quoteFor,
  bookingService, serviceFor,
  services as seedServices,
  unreadFor,
  validateForm,
  visibleTo,
  type BookingForm,
  type RecordBooking,
  type Status,
} from "../lib/pipeline"
import MessagesCenter from "./MessagesCenter"
import { InstallmentHistory, OvertimePanel, PaymentChoice, SettlementSummary } from "./BookingSettlement"
import "../pipeline.css"

export type WorkspaceSection = "bookings" | "calendar" | "history" | "requests" | "payments" | "chat"
type Screen = { kind: "list" } | { kind: "form"; form: BookingForm } | {
  kind: "review"
  form: BookingForm
} | { kind: "details" | "payment"; id: string } | { kind: "checkout"; id: string; fromChat?: boolean; offer: { kind: PaymentKind; amountCents: number; version: number; paidCents: number; overtimeCents: number } }
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
function Summary({ form }: { form: BookingForm }) {
  const { options } = useBooking()
  const service = serviceFor(form.serviceId, options.catalog)
  const quote = Math.max(0, quoteFor(form, options.catalog) || 0)
  const { totalCents } = amounts(quote)
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
            {service.role === "artist" ? "Performance" : `Equipment · ${form.quantity ?? 1} units`}
          </dt>
          <dd>{money(quote)}</dd>
        </div>
        <div>
          <dt>Optional advance · 10%</dt>
          <dd>{money(Math.round(quote * .1))}</dd>
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
  const { state, dispatch, options } = useBooking()
  const services = (options.catalog ?? seedServices).filter(item => item.available)
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
            const next = validateForm(form, state.bookings, new Date(), options)
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
          {!services.length && <p className="pw-alert">No listings are currently available. You can save a draft and return later.</p>}
          {errors.serviceId && <p className="pw-alert" role="alert">{errors.serviceId}</p>}
          {serviceFor(form.serviceId, options.catalog).role === 'renter' && field('quantity', 'Equipment quantity', 'number')}
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
            Saved drafts stay available while you navigate this demo. Refreshing
            or closing the page clears them.
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
  const { dispatch, options } = useBooking()
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
        description="Review your request. An optional 10% advance follows acceptance; the balance is due after the event."
      />
      <div className="pw-two-col">
        <section className="pw-panel pw-review">
          <span className="sl-eyebrow">BOOKING CONFIRMATION</span>
          <h2>{form.event}</h2>
          <dl className="pw-detail-grid">
            {[
              ["Provider", serviceFor(form.serviceId, options.catalog).name],
              ["Date", dayLabel(form.date)],
              ["Time", `${form.start}–${form.end}`],
              ["Guests", form.guests],
              ["Venue", form.venue],
              ["Organizer", options.organizer ?? "Jordan Rivera"],
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
  const { actor, state, dispatch, options } = useBooking()
  const [confirm, setConfirm] = useState<"cancel" | "reject" | null>(null)
  const [error, setError] = useState("")
  const apply = (action: Parameters<typeof dispatch>[0]) => {
    if (!dispatch(action))
      setError(
        "This action is no longer available. Review the latest booking status.",
      )
  }
  const service = bookingService(record)
  const provider = actor === service.role
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
                ["Organizer", record.organizer ?? "Jordan Rivera"],
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
              {actor === "customer" && record.status === "accepted" && record.ledger.quoteStatus === "awaiting_customer" && <button className="btn-primary" onClick={() => apply({ type: "agree", id: record.id })}>Agree to booking price</button>}
              <button className="btn-ghost" onClick={onPayment}>Payment details</button>
            </div>
            <PaymentChoice record={record} onPay={onPay} />
            {provider && record.status === "pending" && (
              <div className="pw-callout">
                <h3>A new request for your calendar</h3>
                <p>Review the timing and requirements before accepting.</p>
                {!!(conflicts(record, state.bookings, options.catalog).length || !!availabilityError(record, options)) && (
                  <p role="alert" className="pw-error">
                    This request conflicts with another booking or the provider’s availability.
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
                    disabled={!!(conflicts(record, state.bookings, options.catalog).length || !!availabilityError(record, options))}
                    onClick={() =>
                      apply({ type: "respond", id: record.id, accept: true })
                    }
                  >
                    Accept request
                  </button>
                </div>
              </div>
            )}
            {provider && ["active", "accepted"].includes(record.status) && record.ledger.quoteStatus === "accepted" && (
              <div className="pw-callout">
                <button
                  className="btn-ghost"
                  disabled={
                    refundBlocks(record) ||
                    performanceEndsAt(record) > new Date()
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
              canCancel(record) && (
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
          <DemoPerformance record={record} />
            <CompletedBookingReview record={record} />
          <OvertimePanel record={record} />
          <BookingMilestones record={record} />
          <BookingDocuments record={record} />
        </div>
        <SettlementSummary record={record} />
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
  const { options } = useBooking()
  const services = options.catalog ?? seedServices
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
                (record) => conflicts(record, records, services).length,
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
                <span>{bookingService(record).name}</span>
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
  onPay,
}: {
  record: RecordBooking
  onBack: () => void
  onBooking: () => void
  onPay: () => void
}) {
  const { actor, dispatch } = useBooking()
  const [showRefund, setShowRefund] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const totals = settlement(record.ledger)
  const refundEligible = canRefund(record)
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
            <h2>{record.event}</h2>
            <p>{bookingService(record).name} · {record.id}</p>
            <PaymentChoice record={record} onPay={onPay} />
            <div className="pw-actions">
              <button className="btn-ghost" onClick={onBooking}>View booking</button>
            </div>
          </section>
          <BookingDocuments record={record} />
          <InstallmentHistory record={record} />
          <DemoPerformance record={record} />
            <CompletedBookingReview record={record} />
          <OvertimePanel record={record} />
          <section className="pw-panel pw-review">
            <span className="sl-eyebrow">REFUND REQUEST</span>
            <h2>Plans can change.</h2>
            {record.refund ? (
              <div className="pw-callout">
                <StatusPill status={record.refund.status}>{record.refund.status === "declined" ? "Refund declined" : paymentLabel(record)}</StatusPill>
                <p>{record.refund.reason}</p>
                {record.refund.decisionReason && <p><strong>Admin decision:</strong> {record.refund.decisionReason}</p>}
                {record.refund.decidedAt && <time className="pw-caption" dateTime={record.refund.decidedAt}>{new Date(record.refund.decidedAt).toLocaleString()}</time>}
                <p className="pw-caption">
                  {record.refund.status === "requested"
                    ? "Your request is recorded. Funds stay on hold pending review; this is not an approved refund."
                    : record.refund.status === "refunded" ? `${money(record.refund.amountCents)} returned to the original payment method (demo). This booking is cancelled.` : "The refund was declined. Your booking and payment schedule continue."}
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
        <SettlementSummary record={record} />
      </div>
    </>
  )
}

export default function BookingWorkspace({
  initialSection = "bookings",
  initialBookingId,
  initialServiceId,
  initialInquiryId,
  onBack,
  onGoToLanding,
  roleControl,
}: {
  initialSection?: WorkspaceSection
  initialBookingId?: string
  initialServiceId?: string
  initialInquiryId?: string
  roleControl?: ReactNode
  onBack: () => void
  onGoToLanding: () => void
}) {
  const { actor, state, dispatch, options, getBooking } = useBooking()
  const [section, setSection] = useState<WorkspaceSection>(initialSection)
  const [screen, setScreen] = useState<Screen>(() => initialServiceId ? { kind: "form", form: { ...blankForm(), serviceId: initialServiceId, quantity: "1" } } : initialBookingId && initialSection !== "chat"
    ? { kind: initialSection === "payments" ? "payment" : "details", id: initialBookingId } : { kind: "list" })
  const [chatId, setChatId] = useState(initialBookingId)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [notice, setNotice] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formGuard, setFormGuard] = useState<{ run: () => void } | null>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [screen.kind])
  useEffect(() => {
    const guard = (event: Event) => {
      if (screen.kind !== "form" && screen.kind !== "review") return
      event.preventDefault()
      setFormGuard({ run: (event as CustomEvent<() => void>).detail })
    }
    window.addEventListener("stagelink:before-navigation", guard)
    return () => window.removeEventListener("stagelink:before-navigation", guard)
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
  const dashboardLabel = role === "artist" ? "Artist dashboard" : role === "renter" ? "Equipment dashboard" : "Customer dashboard"
  const navItems: DashboardNav[] = [
    { id: "dashboard", label: dashboardLabel, icon: ArrowLeft },
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
  const openCheckout = (record: RecordBooking, fromChat = false) => {
    const due = checkoutFor(record.ledger)
    if (!due) return
    const totals = settlement(record.ledger)
    setSection("payments")
    setScreen({ kind: "checkout", id: record.id, fromChat, offer: { ...due, version: record.ledger.quoteVersion, paidCents: totals.receivedCents, overtimeCents: totals.overtimeCents } })
  }
  const transactions = bookings.filter(record => record.ledger.quoteStatus === "accepted")
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
        `${record.id} ${record.event} ${bookingService(record).name} ${record.date}`
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
        requestNavigation(target === "dashboard" ? onBack : () => navigate(target as WorkspaceSection))
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
            Back to {dashboardLabel}
          </button>
          <span>BOOK · PAY · CONNECT</span>
        </div>
        <p className="pw-caption">Temporary demo · refreshing resets bookings, payments, saved drafts and chat. Switch roles in this tab to continue the same session.</p>
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
              setNotice("Draft saved for this session. Resume it from Saved for later before refreshing.")
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
            onPay={() => openCheckout(selected)}
            onPayment={() => {
              setSection("payments")
              setScreen({ kind: "payment", id: selected.id })
            }}
          />
        ) : screen.kind === "checkout" && selected ? (
          <PaymentCheckout
            key={selected.id}
            bookingId={selected.id}
            artist={bookingService(selected).name}
            event={selected.event}
            quoteCents={selected.ledger.quoteCents}
            feeCents={amounts(selected.ledger.quoteCents).feeCents}
            paymentKind={screen.offer.kind}
            advancePercent={selected.ledger.advancePolicy === "escrow-50" ? 50 : 10}
            paymentCents={screen.offer.amountCents}
            paidCents={screen.offer.paidCents}
            overtimeCents={screen.offer.overtimeCents}
            onFailed={() => dispatch({type:"payment_failed",id:selected.id,version:screen.offer.version,amountCents:screen.offer.amountCents})}
            onPaid={(method) => dispatch({ type: "settle", id: selected.id, action: { type: "collect", kind: screen.offer.kind, method, quoteVersion: screen.offer.version, totalCents: screen.offer.amountCents } })}
            onBack={() => screen.fromChat ? openChat(selected.id) : open(selected.id)}
            onViewBooking={() => open(selected.id)}
          />
        ) : screen.kind === "payment" && selected ? (
          <PaymentDetails
            key={selected.id}
            record={selected}
            onBack={() => navigate("payments")}
            onBooking={() => open(selected.id)}
            onPay={() => openCheckout(selected)}
          />
        ) : section === "chat" ? (
          <MessagesCenter initialBookingId={chatId} initialInquiryId={initialInquiryId} onOpenBooking={open} onOpenCheckout={id => { const record = getBooking(id); if (record) openCheckout(record, true); }} />
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
                            ? "Confirmed · getting ready"
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
                      <small>This session only · cleared on refresh</small>
                    </div>
                    {state.drafts.map((draft) => (
                      <div className="pw-draft" key={draft.id}>
                        <div>
                          <strong>{draft.event || "Untitled event"}</strong>
                          <span>
                            {serviceFor(draft.serviceId, options.catalog).name} ·{" "}
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
            {section === "payments" && <div className="pw-stats pw-payment-stats">{[
              ["Held by StageLink", transactions.reduce((sum, record) => sum + (record.refund?.status === "refunded" ? 0 : settlement(record.ledger).heldCents), 0)],
              ["Transferred to providers", transactions.reduce((sum, record) => sum + settlement(record.ledger).paidOutCents, 0)],
              ["Final payments due", transactions.reduce((sum, record) => sum + (record.ledger.performance !== "upcoming" && !refundBlocks(record) ? settlement(record.ledger).remainingCents : 0), 0)],
            ].map(([label, value]) => <div className="pw-stat" key={label}><div><span>{label}</span><ShieldCheck size={17} /></div><strong>{money(value as number)}</strong><small>All transactions through StageLink</small></div>)}</div>}
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
                      ? [...new Set(transactions.map(paymentLabel))]
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
                        {bookingService(record).role === "artist"
                          ? "PERFORMANCE"
                          : "EQUIPMENT"}
                      </small>
                      <strong>{record.event}</strong>
                      <span>
                        {bookingService(record).name} <i>·</i>{" "}
                        {record.start}–{record.end}
                      </span>
                    </span>
                    <StatusPill
                      status={
                        section === "payments"
                          ? record.refund?.status === "requested"
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
                        {money(settlement(record.ledger).totalCents)}
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
                Demo workspace · refresh to reset · switch roles in this tab to try
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
            This removes the saved form from this demo session. Existing bookings
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
