import { useDashboard } from "../lib/DashboardContext"
import { collectionsFor } from "../lib/catalogPresentation"
import type { CollectionListing } from "./CollectionDetailPage"
import CollectionBrowsePage from "./CollectionBrowsePage"

export default function RentEquipmentPage({
  onOpenCollection,
}: {
  onOpenCollection: (listing: CollectionListing) => void
}) {
  const { state } = useDashboard()
  return (
    <CollectionBrowsePage
      listings={collectionsFor(state, "equipment")}
      type="equipment"
      title="Rent Equipment"
      description="Top-tier audio, lighting, and stage gear for your events"
      onOpenCollection={onOpenCollection}
    />
  )
}
