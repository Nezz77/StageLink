import { useDashboard } from "../lib/DashboardContext"
import { collectionsFor } from "../lib/catalogPresentation"
import type { CollectionListing } from "./CollectionDetailPage"
import CollectionBrowsePage from "./CollectionBrowsePage"

export default function BrowseArtistsPage({
  onOpenCollection,
}: {
  onOpenCollection: (listing: CollectionListing) => void
}) {
  const { state } = useDashboard()
  return (
    <CollectionBrowsePage
      listings={collectionsFor(state, "artist")}
      type="artist"
      title="Browse Collections"
      description="Curated artist portfolios and recent drops"
      onOpenCollection={onOpenCollection}
    />
  )
}
