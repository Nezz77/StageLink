import { useState } from "react"
import { useBooking } from "../lib/BookingContext"
import { useDashboard } from "../lib/DashboardContext"
import type { RecordBooking } from "../lib/pipeline"
import { Notice, Panel, useDraftGuard } from "./DashboardUI"
import { Icon } from "./Icons"
export default function BookingReview({ record }: { record: RecordBooking }) {
  const { actor, dispatch } = useBooking()
  const { state, dispatch: manage } = useDashboard()
  const key = `review:${record.id}`,
    draft = state.drafts[`customer:${key}`]
  const [text, setText] = useState(draft?.text ?? ""),
    [rating, setRating] = useState(draft?.rating ?? "5"),
    [dirty, setDirty] = useState(false),
    [notice, setNotice] = useState("")
  const guard = useDraftGuard(dirty)
  if (actor !== "customer" || record.status !== "completed") return null
  return (
    <div className="mg-page booking-review">
      <Panel
        title={record.review ? "Your review" : "How was the performance?"}
        eyebrow={record.event}
      >
        {record.review ? (
          <>
            <strong>{"★".repeat(record.review.rating)}</strong>
            <p>{record.review.text}</p>
            <p>Review linked to this completed booking.</p>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (
                dispatch({
                  type: "review",
                  id: record.id,
                  text,
                  rating: Number(rating),
                })
              ) {
                setDirty(false)
                manage({ type: "discard_draft", key })
              } else
                setNotice(
                  "Write 10–2,000 characters and choose 1–5 stars. Each completed booking can be reviewed once.",
                )
            }}
          >
            <fieldset className="mg-field mg-rating">
              <legend>Rating</legend>
              <div
                className="mg-rating-stars"
                role="group"
                aria-label="Review rating"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`mg-rating-star ${value <= Number(rating) ? "is-active" : ""}`}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                    aria-pressed={Number(rating) === value}
                    onClick={() => {
                      setRating(String(value))
                      setDirty(true)
                    }}
                  >
                    <Icon.Star
                      filled={value <= Number(rating)}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <span className="mg-rating-value" aria-live="polite">
                {rating} of 5 stars
              </span>
            </fieldset>
            <label className="mg-field">
              Your experience
              <textarea
                aria-label="Review text"
                value={text}
                maxLength={2000}
                onChange={(e) => {
                  setText(e.target.value)
                  setDirty(true)
                }}
              />
            </label>
            <Notice>{notice}</Notice>
            <div className="mg-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  manage({ type: "draft", key, values: { text, rating } })
                  setDirty(false)
                  setNotice("Review saved for later.")
                }}
              >
                Save review for later
              </button>
              <button className="btn-primary">Submit booking review</button>
            </div>
          </form>
        )}
        {guard}
      </Panel>
    </div>
  )
}
