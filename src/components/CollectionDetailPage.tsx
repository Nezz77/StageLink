import { CatalogDetail } from './Marketplace';
export interface CollectionListing { id: number | string; catalogId?: string; name: string; date: string; images: string[]; type: 'artist' | 'equipment' }
export default function CollectionDetailPage({ listing, onBack }: { listing: CollectionListing; onBack: () => void }) {
 return <CatalogDetail id={listing.catalogId ?? String(listing.id)} onBack={onBack} />;
}
