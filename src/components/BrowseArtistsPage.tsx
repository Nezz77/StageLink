import Marketplace from './Marketplace';
import type { CollectionListing } from './CollectionDetailPage';
export default function BrowseArtistsPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
 return <Marketplace filter="artist" onOpen={onOpenCollection} />;
}
