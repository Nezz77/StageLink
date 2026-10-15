import {
  bookingStatus,
  initialBooking,
  settlement,
  transitionBooking,
  type BookingAction,
  type BookingRole,
  type BookingState,
} from "./booking.ts"

export const services = [
  {
    id: "aria",
    name: "Aria Nova",
    detail: "Jazz & soul · live performance",
    role: "artist",
    rate: 75000,
    unit: "hour",
    initials: "AN",
  },
  {
    id: "pa",
    name: "AudioVault · PA system",
    detail: "Speakers, mixer & microphones",
    role: "renter",
    rate: 18000,
    unit: "day",
    initials: "AV",
  },
  {
    id: "lights",
    name: "AudioVault · Lighting rig",
    detail: "Moving heads & stage lighting",
    role: "renter",
    rate: 24000,
    unit: "day",
    initials: "AV",
  },
] as const
export type ServiceId = typeof services[number]["id"]
export type Status = "pending" | "accepted" | "active" | "completed" | "rejected" | "cancelled"
export type BookingForm = {
  id: string
  serviceId: ServiceId
  event: string
  date: string
  start: string
  end: string
  venue: string
  guests: string
  requirements: string
}
export type RecordBooking = BookingForm & {
  status: Status
  ledger: BookingState
  paymentMethod?: "card" | "wallet"
  createdAt: string
  demoStartedAt?: string
  refund?: {
    reason: string; at: string; status: "requested" | "refunded" | "declined"
    amountCents: number; previousHold: boolean; decidedAt?: string; decisionReason?: string
  }
  activity: { label: string; at: string }[]
}
export type Attachment = { id: string; name: string; size: number; type: string }
export type Message = {
  id: string
  bookingId: string
  sender: BookingRole
  text: string
  at: string
  attachment?: Attachment
}
export type BookingNotification = {
  id: string; bookingId: string; title: string; at: string
  section: "bookings" | "payments"; recipients: BookingRole[]; readBy: BookingRole[]
}
export type PipelineState = {
  notifications: BookingNotification[]
  bookings: RecordBooking[]
  drafts: BookingForm[]
  messages: Message[]
  read: Record<string, string>
}
export type PipelineAction = { type: "read_notification"; id: string }
  | { type: "demo_start" | "demo_finish"; id: string }
  | { type: "resolve_refund"; id: string; approve: boolean; reason: string }
  | { type: "save_draft"; form: BookingForm } | {
  type: "delete_draft"
  id: string
} | { type: "submit"; form: BookingForm } | {
  type: "respond"
  id: string
  accept: boolean
} | { type: "cancel"; id: string } | { type: "agree"; id: string } | {
  type: "pay"
  id: string
  quoteVersion: number
  totalCents: number
  method?: "card" | "wallet"
} | { type: "complete"; id: string } | {
  type: "refund"
  id: string
  reason: string
} | { type: "send"; message: Omit<Message, "sender" | "at"> } | {
  type: "read"
  id: string
} | { type: "settle"; id: string; action: BookingAction } | { type: "legacy"; action: BookingAction }
export type PipelineEvent = {
  action: PipelineAction
  actor: BookingRole
  at: string
}
export const PIPELINE_KEY = "stagelink:pipeline:v1"
export const serviceFor = (id: ServiceId) =>
  services.find((service) => service.id === id)!
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
export const blankForm = (): BookingForm => ({
  id: `BK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  serviceId: "aria",
  event: "",
  date: "",
  start: "19:00",
  end: "22:00",
  venue: "",
  guests: "",
  requirements: "",
})
export const quoteFor = (form: BookingForm) =>
  Math.round(
    serviceFor(form.serviceId).rate *
      (form.serviceId === "aria"
        ? (minutes(form.end) - minutes(form.start)) / 60
        : 1),
  )
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const active = (record: RecordBooking) =>
  !["rejected", "cancelled", "completed"].includes(record.status)
export const visibleTo = (record: RecordBooking, actor: BookingRole) =>
  actor === "customer" ||
  actor === "admin" ||
  serviceFor(record.serviceId).role === actor
export const conflicts = (form: BookingForm, bookings: RecordBooking[]) =>
  bookings.filter(
    (record) =>
      record.id !== form.id &&
      active(record) &&
      record.date === form.date &&
      record.serviceId === form.serviceId &&
      (form.serviceId !== "aria" ||
        (form.start < record.end && form.end > record.start)),
  )
export function validateForm(
  form: BookingForm,
  bookings: RecordBooking[],
  now = new Date(),
) {
  const errors: Partial<Record<keyof BookingForm, string>> = {}
  if (!form.event.trim()) errors.event = "Give your event a name."
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
    dateKey(new Date(`${form.date}T12:00:00`)) !== form.date
  )
    errors.date = "Choose a valid event date."
  else if (form.date < dateKey(now))
    errors.date = "Choose today or a future date."
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.start))
    errors.start = "Choose a start time."
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.end) || form.end <= form.start)
    errors.end = "End time must be after the start, on the same day."
  if (
    !errors.date &&
    !errors.start &&
    new Date(`${form.date}T${form.start}`) <= now
  )
    errors.start = "Choose a future start time."
  if (!form.venue.trim()) errors.venue = "Add a venue or location."
  if (
    !/^\d+$/.test(form.guests) ||
    Number(form.guests) < 1 ||
    Number(form.guests) > 100000
  )
    errors.guests = "Enter 1–100,000 guests."
  if (conflicts(form, bookings).length)
    errors.date = "This service already has a booking in that time slot."
  return errors
}
function seedRecord(
  id: string,
  event: string,
  serviceId: ServiceId,
  date: string,
  status: Status,
  payment: BookingState["payment"],
): RecordBooking {
  return {
    id,
    event,
    serviceId,
    date,
    start: "19:00",
    end: "22:00",
    venue: "The Grand Hall, Los Angeles",
    guests: "250",
    requirements:
      "Load-in access from 5 PM. Please coordinate the soundcheck in booking chat.",
    status,
    createdAt: "2026-10-10T10:00:00.000Z",
    ledger: {
      ...initialBooking,
      quoteCents: serviceFor(serviceId).rate * (serviceId === "aria" ? 3 : 1),
      quoteStatus: status === "pending" ? "awaiting_artist" : "accepted",
      payment,
      performance: status === "completed" ? "confirmed" : "upcoming",
      advance: payment === "unpaid" ? "offered" : "skipped",
      installments: payment === "unpaid" ? [] : [{
        kind: "legacy", grossCents: serviceFor(serviceId).rate * (serviceId === "aria" ? 3 : 1) * 1.05,
        legacySurchargeCents: Math.round(serviceFor(serviceId).rate * (serviceId === "aria" ? 3 : 1) * .05),
        paidAt: "2026-09-10T10:00:00Z", method: "card",
        ...(payment === "released" ? { releasedAt: "2026-09-29T10:00:00Z", feeCents: 11250, payoutCents: 225000 } : {}),
      }],
      history: [],
    },
    activity: [
      { label: "Booking request created", at: "2026-10-10T10:00:00.000Z" },
    ],
  }
}
export function initialPipeline(): PipelineState {
  const headline = seedRecord(
    "BK-2901",
    "TechVentures Corporate Gala",
    "aria",
    "2026-10-18",
    "accepted",
    "unpaid",
  )
  headline.ledger = { ...initialBooking, history: [] }
  const refunded = seedRecord(
    "BK-2780",
    "Studio launch",
    "lights",
    "2026-09-15",
    "cancelled",
    "held",
  )
  refunded.refund = {
    reason: "Event cancelled",
    at: "2026-09-12T10:00:00Z",
    status: "refunded", amountCents: settlement(refunded.ledger).heldCents,
    previousHold: false, decidedAt: "2026-09-12T12:00:00Z", decisionReason: "Cancellation approved before the event.",
  }
  refunded.ledger = { ...refunded.ledger, payment: "refunded", installments: refunded.ledger.installments.map(item => ({ ...item, refundedAt: refunded.refund!.decidedAt })) }
  return {
    bookings: [
      headline,
      seedRecord(
        "BK-2902",
        "Afterglow rooftop sessions",
        "pa",
        "2026-10-23",
        "pending",
        "unpaid",
      ),
      seedRecord(
        "BK-2898",
        "Founders’ evening",
        "lights",
        "2026-10-16",
        "active",
        "held",
      ),
      seedRecord(
        "BK-2803",
        "Golden hour wedding",
        "aria",
        "2026-09-28",
        "completed",
        "released",
      ),
      refunded,
    ],
    drafts: [],
    notifications: [],
    messages: [
      {
        id: "welcome-1",
        bookingId: "BK-2901",
        sender: "artist",
        text: "Your three-hour jazz & soul set is ready to review. Shall we coordinate the soundcheck here?",
        at: "2026-10-12T09:00:00Z",
      },
      {
        id: "welcome-2",
        bookingId: "BK-2902",
        sender: "renter",
        text: "Thanks for the request! Will there be vehicle access to the rooftop loading bay?",
        at: "2026-10-13T09:00:00Z",
      },
    ],
    read: {},
  }
}
export const unreadFor = (
  state: PipelineState,
  record: RecordBooking,
  actor: BookingRole,
) =>
  state.messages.filter(
    (message) =>
      message.bookingId === record.id &&
      message.sender !== actor &&
      Date.parse(message.at) > Date.parse(state.read[`${actor}:${record.id}`] ?? "1970-01-01T00:00:00Z"),
  ).length
export const performanceEndsAt = (record: RecordBooking) => new Date(
  new Date(`${record.date}T${record.end}`).getTime() + record.ledger.overtime.filter(item => item.status === "accepted").reduce((minutes, item) => minutes + item.minutes, 0) * 60_000,
)
export const refundBlocks = (record: RecordBooking) =>
  record.refund?.status === "requested" || record.refund?.status === "refunded"
export const performanceStarted = (record: RecordBooking, now = new Date()) =>
  !!record.demoStartedAt || new Date(`${record.date}T${record.start}`) <= now
export const canCancel = (record: RecordBooking, now = new Date()) =>
  ["pending", "accepted", "active"].includes(record.status) && record.ledger.payment === "unpaid" && !performanceStarted(record, now)
export const messageSeen = (state: PipelineState, message: Message, record: RecordBooking) => {
  const recipient = message.sender === "customer" ? serviceFor(record.serviceId).role : "customer"
  return Date.parse(state.read[`${recipient}:${record.id}`] ?? "") >= Date.parse(message.at)
}
export const notificationsFor = (state: PipelineState, actor: BookingRole) =>
  state.notifications.filter(item => item.recipients.includes(actor))
export const canRefund = (record: RecordBooking, now = new Date()) =>
  record.ledger.payment === "held" &&
  !record.refund &&
  !["completed", "rejected"].includes(record.status) &&
  record.ledger.performance === "upcoming" &&
  !performanceStarted(record, now)
export const paymentLabel = (record: RecordBooking) =>
  record.refund?.status === "refunded" ? "Refunded" : record.refund?.status === "requested" ? "Refund requested" : bookingStatus(record.ledger)
function notificationFor(record: RecordBooking, action: PipelineAction, actor: BookingRole, title: string, at: string): BookingNotification {
  const inner = action.type === "settle" || action.type === "legacy" ? action.action.type : action.type
  const payment = ["collect", "release", "refund", "resolve_refund", "toggle_hold", "confirm_performance", "pay"].includes(inner)
  const recipients: BookingRole[] = ["customer", serviceFor(record.serviceId).role]
  if (["collect", "refund", "complete", "demo_finish", "report_performance", "pay"].includes(inner)) recipients.push("admin")
  return { id: `${record.id}:${record.activity.length}:${action.type}`, bookingId: record.id, title, at,
    section: payment ? "payments" : "bookings", recipients: recipients.filter(role => role !== actor), readBy: [] }
}
function safeForm(value: unknown): value is BookingForm {
  if (!value || typeof value !== "object") return false
  const form = value as BookingForm
  return (
    [
      "id",
      "event",
      "date",
      "start",
      "end",
      "venue",
      "guests",
      "requirements",
    ].every(
      (key) =>
        typeof form[(key as keyof BookingForm)] === "string" &&
        form[(key as keyof BookingForm)].length <=
          (key === "requirements" ? 3000 : 200),
    ) &&
    services.some((service) => service.id === form.serviceId) &&
    /^BK-[a-zA-Z0-9-]+$/.test(form.id)
  )
}
export function reducePipeline(
  state: PipelineState,
  action: PipelineAction,
  actor: BookingRole,
  at = new Date().toISOString(),
  replayLegacy = false,
): PipelineState {
  if (
    !action ||
    !["customer", "artist", "renter", "admin"].includes(actor) ||
    !Number.isFinite(Date.parse(at))
  )
    return state
  if (action.type === "read_notification") {
    const item = state.notifications.find(item => item.id === action.id && item.recipients.includes(actor) && !item.readBy.includes(actor))
    if (!item) return state
    return { ...state, notifications: state.notifications.map(note => note.id === item.id ? { ...note, readBy: [...note.readBy, actor] } : note) }
  }
  if (action.type === "save_draft" || action.type === "submit") {
    if (
      actor !== "customer" ||
      !safeForm(action.form) ||
      state.bookings.some((record) => record.id === action.form.id)
    )
      return state
    const form = { ...action.form }
    if (action.type === "save_draft")
      return {
        ...state,
        drafts: [form, ...state.drafts.filter((draft) => draft.id !== form.id)],
      }
    if (Object.keys(validateForm(form, state.bookings, new Date(at))).length)
      return state
    const record: RecordBooking = {
      ...form,
      event: form.event.trim(),
      venue: form.venue.trim(),
      status: "pending",
      createdAt: at,
      ledger: {
        ...initialBooking,
        quoteCents: quoteFor(form),
        quoteStatus: "awaiting_artist",
        history: [],
      },
      activity: [{ label: "Request sent to provider", at }],
    }
    return {
      ...state,
      bookings: [record, ...state.bookings],
      notifications: [notificationFor(record, action, actor, "New booking request", at), ...state.notifications],
      drafts: state.drafts.filter((draft) => draft.id !== form.id),
    }
  }
  if (action.type === "delete_draft")
    return actor === "customer"
      ? {
          ...state,
          drafts: state.drafts.filter((draft) => draft.id !== action.id),
        }
      : state
  if (action.type === "send") {
    const message = action.message
    const record = state.bookings.find(
      (record) => record.id === message?.bookingId,
    )
    if (
      !record ||
      !visibleTo(record, actor) ||
      actor === "admin" ||
      typeof message.id !== "string" ||
      state.messages.some((item) => item.id === message.id) ||
      typeof message.text !== "string" ||
      message.text.length > 4000 ||
      (!message.text.trim() && !message.attachment)
    )
      return state
    if (
      message.attachment &&
      (typeof message.attachment.id !== "string" ||
        typeof message.attachment.name !== "string" ||
        typeof message.attachment.type !== "string" ||
        !Number.isSafeInteger(message.attachment.size) ||
        message.attachment.size < 0 ||
        message.attachment.size > 5 * 1024 * 1024)
    )
      return state
    return {
      ...state,
      messages: [
        ...state.messages,
        { ...message, text: message.text.trim(), sender: actor, at },
      ],
    }
  }
  const id = action.type === "legacy" ? "BK-2901" : action.id
  const record = state.bookings.find((record) => record.id === id)
  if (!record || !visibleTo(record, actor)) return state
  if (action.type === "read")
    return { ...state, read: { ...state.read, [`${actor}:${id}`]: at } }
  let patch: Partial<RecordBooking> = {}
  let label = ""
  switch (action.type) {
    case "respond":
      if (
        actor !== serviceFor(record.serviceId).role ||
        record.status !== "pending" ||
        (action.accept && conflicts(record, state.bookings).length)
      )
        return state
      patch = {
        status: action.accept ? "accepted" : "rejected",
        ledger: {
          ...record.ledger,
          quoteStatus: action.accept ? "accepted" : "declined",
        },
      }
      label = action.accept
        ? "Provider accepted the request"
        : "Provider declined the request"
      break
    case "agree":
      if (
        actor !== "customer" ||
        record.status !== "accepted" ||
        record.ledger.quoteStatus !== "awaiting_customer"
      )
        return state
      patch = {
        ledger: transitionBooking(record.ledger, { type: "accept" }, actor, at),
      }
      label = "Customer agreed to the quote"
      break
    case "cancel":
      if (
        actor !== "customer" ||
        !canCancel(record, new Date(at))
      )
        return state
      patch = { status: "cancelled" }
      label = "Customer cancelled the booking"
      break
    case "pay": {
      if (!replayLegacy || record.status !== "accepted" || refundBlocks(record)) return state
      const ledger = transitionBooking(record.ledger, action, actor, at, replayLegacy)
      if (ledger === record.ledger) return state
      patch = {
        ledger,
        status: "active",
        paymentMethod: action.method === "wallet" ? "wallet" : "card",
      }
      label = "Demo payment received · funds held"
      break
    }
    case "complete":
      if (
        actor !== serviceFor(record.serviceId).role ||
        !["active", "accepted"].includes(record.status) ||
        record.ledger.quoteStatus !== "accepted" ||
        refundBlocks(record) ||
        performanceEndsAt(record) > new Date(at)
      )
        return state
      patch = {
        status: "completed",
        ledger: { ...record.ledger, performance: "reported" },
      }
      label = "Provider reported completion · awaiting payout review"
      break
    case "refund":
      if (
        actor !== "customer" ||
        !canRefund(record, new Date(at)) ||
        typeof action.reason !== "string" ||
        action.reason.trim().length < 10 ||
        action.reason.length > 2000
      )
        return state
      patch = {
        refund: { reason: action.reason.trim(), at, status: "requested", amountCents: settlement(record.ledger).heldCents, previousHold: record.ledger.payoutBlocked },
        ledger: { ...record.ledger, payoutBlocked: true },
      }
      label = "Refund requested · payout paused for review"
      break
    case "resolve_refund": {
      if (actor !== "admin" || record.refund?.status !== "requested" || typeof action.approve !== "boolean" ||
        typeof action.reason !== "string" || action.reason.trim().length < 10 || action.reason.length > 2000) return state
      const totals = settlement(record.ledger)
      if (action.approve && (!totals.heldCents || totals.heldCents !== record.refund.amountCents || record.ledger.installments.some(item => item.releasedAt))) return state
      patch = {
        refund: { ...record.refund, status: action.approve ? "refunded" : "declined", decidedAt: at, decisionReason: action.reason.trim() },
        ...(action.approve ? { status: "cancelled" as const } : {}),
        ledger: action.approve ? { ...record.ledger, payment: "refunded", payoutBlocked: false,
          installments: record.ledger.installments.map(item => ({ ...item, refundedAt: at })) }
          : { ...record.ledger, payoutBlocked: record.refund.previousHold },
      }
      label = action.approve ? "Admin approved refund to original payment method · booking cancelled (demo)" : "Admin declined refund · booking continues"
      break
    }
    case "demo_start":
    case "demo_finish": {
      if (actor !== serviceFor(record.serviceId).role || !["active", "accepted"].includes(record.status) ||
        record.ledger.quoteStatus !== "accepted" || record.ledger.performance !== "upcoming" || refundBlocks(record)) return state
      if (action.type === "demo_start") {
        if (record.demoStartedAt) return state
        patch = { demoStartedAt: at, status: "active" }
        label = record.serviceId === "aria" ? "Provider started the demo event · overtime is available" : "Provider started the demo rental event"
      } else {
        if (!record.demoStartedAt || record.ledger.overtime.some(item => item.status === "pending")) return state
        patch = { status: "completed", ledger: { ...record.ledger, performance: "reported" } }
        label = "Provider finished the demo event · final payment due"
      }
      break
    }
    case "settle":
    case "legacy": {
      if (refundBlocks(record) || ["rejected", "cancelled"].includes(record.status))
        return state
      const inner = action.action
      if (action.type === "settle" && (record.status === "pending" || !["collect", "skip_advance", "propose_overtime", "resolve_overtime", "confirm_performance", "toggle_hold", "release"].includes(inner.type))) return state
      if (inner.type === "pay" && !replayLegacy) return state
      if (["propose_overtime", "resolve_overtime"].includes(inner.type) && (record.serviceId !== "aria" || !performanceStarted(record, new Date(at)))) return state
      if (inner.type === "report_performance" && !replayLegacy && (actor !== serviceFor(record.serviceId).role || performanceEndsAt(record) > new Date(at))) return state
      const ledger = transitionBooking(record.ledger, inner, actor, at, replayLegacy)
      if (ledger === record.ledger) return state
      patch = {
        ledger,
        status:
          ledger.performance !== "upcoming"
            ? "completed"
            : ledger.installments.length > 0 || ledger.advance === "skipped"
              ? "active"
              : record.status,
      }
      label =
        ledger.history[ledger.history.length - 1]?.label ?? "Booking updated"
      break
    }
    default:
      return state
  }
  return {
    ...state,
    notifications: [notificationFor({ ...record, ...patch }, action, actor, label, at), ...state.notifications],
    bookings: state.bookings.map((item) =>
      item.id === id
        ? { ...item, ...patch, activity: [...item.activity, { label, at }] }
        : item,
    ),
  }
}
export function restorePipeline(
  raw: string | null,
): { state: PipelineState; events: PipelineEvent[]; damaged: boolean } {
  try {
    const events: PipelineEvent[] = JSON.parse(raw ?? "[]")
    if (!Array.isArray(events) || events.length > 10000)
      throw new Error("Invalid history")
    let state = initialPipeline()
    for (const event of events) {
      const next = reducePipeline(state, event.action, event.actor, event.at, true)
      if (next === state) throw new Error("Invalid event")
      state = next
    }
    return { state, events, damaged: false }
  } catch {
    return { state: initialPipeline(), events: [], damaged: true }
  }
}
