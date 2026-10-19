import { useState } from "react"
import { Heart, Package, Music } from "lucide-react"
import { useDashboard } from "../lib/DashboardContext"
import { collectionsFor } from "../lib/catalogPresentation"
import { money } from "../lib/booking"
import { marketAction } from "./Marketplace"
import { DashboardIntro } from "./DashboardShell"
import { Empty, SearchField } from "./DashboardUI"
import type { CollectionListing } from "./CollectionDetailPage"

export default function SavedItems({
  onOpen,
  onBrowse,
}: {
  onOpen: (item: CollectionListing) => void
  onBrowse: () => void
}) {
  const { state, dispatch } = useDashboard()
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("")
  const catalog = collectionsFor(state)
  const items = state.savedListings
    .map((id) => ({
      id,
      listing: state.listings.find((item) => item.id === id),
    }))
    .filter(
      ({ id, listing }) =>
        (filter === "all" ||
          (filter === "unavailable"
            ? !listing || listing.status !== "live"
            : listing?.owner === filter)) &&
        `${listing?.title ?? "Unavailable listing"} ${listing?.category ?? ""} ${
          listing ? state.profiles[listing.owner].name : ""
        } ${id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
  return (
    <div className="mg-page">
      <DashboardIntro
        eyebrow="YOUR PERSONAL LINEUP"
        title="Saved for"
        emphasis="a great night."
        description="Artists, gigs and rental equipment in one shortlist. Saving does not reserve availability or create a booking. Saved items and form drafts are separate; both clear on refresh."
      />
      <div className="mg-toolbar">
        <div className="mg-tabs" aria-label="Saved item categories">
          {[
            ["all", "All items"],
            ["artist", "Artists & gigs"],
            ["renter", "Equipment"],
            ["unavailable", "Unavailable"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchField
          label="Search saved items"
          value={search}
          onChange={setSearch}
        />
      </div>
      <p className="mg-muted" aria-live="polite">
        {items.length} matching items · {state.savedListings.length} saved
      </p>
      <div className="m4-saved-grid">
        {items.map(({ id, listing }) => {
          const detail = catalog.find((item) => item.catalogId === id)
          return (
            <article className="pw-panel pw-review m4-saved-card" key={id}>
              {listing?.owner === "renter" ? (
                <Package />
              ) : listing ? (
                <Music />
              ) : (
                <Heart />
              )}
              <span className="sl-eyebrow">
                {id} / {listing?.category ?? "ARCHIVED REFERENCE"}
              </span>
              <h2>{listing?.title ?? "This listing is no longer available"}</h2>
              <p>
                {listing
                  ? state.profiles[listing.owner].name
                  : "The provider removed this listing. You can remove its saved reference."}
              </p>
              {listing && (
                <strong>
                  {money(Math.round(Number(listing.price) * 100))} /{" "}
                  {listing.unit}
                </strong>
              )}
              {!detail && (
                <p className="pw-alert">
                  {listing
                    ? "This listing is paused or under maintenance. Booking is unavailable."
                    : "No current listing details are available."}
                </p>
              )}
              <div className="pw-actions">
                <button
                  className="btn-ghost"
                  disabled={!detail}
                  onClick={() => detail && onOpen(detail)}
                >
                  View details
                </button>
                <button
                  className="btn-primary"
                  disabled={!detail}
                  onClick={() => marketAction(id, "book")}
                >
                  {listing?.owner === "renter"
                    ? "Start rental booking"
                    : "Start booking"}
                </button>
                <button
                  className="pw-text-button"
                  aria-label={`Remove ${listing?.title ?? id} from saved items`}
                  onClick={() => dispatch({ type: "save_listing", id })}
                >
                  Remove
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {!items.length && (
        <Empty
          title={
            state.savedListings.length
              ? "No matching saved items."
              : "Your shortlist starts here."
          }
        >
          Save an artist or equipment listing from Discover, Browse or its
          details page.
          <span className="pw-actions">
            <button className="btn-primary" onClick={onBrowse}>
              Browse listings
            </button>
            {state.savedListings.length > 0 && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setSearch("")
                  setFilter("all")
                }}
              >
                Clear filters
              </button>
            )}
          </span>
        </Empty>
      )}
    </div>
  )
}
