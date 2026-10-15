import Marketplace from './Marketplace';
import type { CollectionListing } from './CollectionDetailPage';
export default function RentEquipmentPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
 return <Marketplace filter="renter" onOpen={onOpenCollection} />;
}
