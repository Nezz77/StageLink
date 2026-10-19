import { Heart } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { useDashboard } from "../lib/DashboardContext"
export default function SaveListingButton({ id }: { id: string }) {
  const { actor } = useBooking()
  const { state, dispatch } = useDashboard()
  if (actor !== "customer") return null
  const saved = state.savedListings.includes(id)
  const item = state.listings.find((item) => item.id === id)
  return (
    <button
      type="button"
      className="btn-ghost sl-action m4-save"
      aria-label={`${saved ? "Unsave" : "Save"} ${item?.title ?? "listing"}`}
      aria-pressed={saved}
      disabled={!saved && item?.status !== "live"}
      onClick={() => dispatch({ type: "save_listing", id })}
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save item"}
    </button>
  )
}
