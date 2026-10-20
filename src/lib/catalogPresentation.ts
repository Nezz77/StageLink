import type { DashboardState } from './dashboard';
import type { CollectionListing } from '../components/CollectionDetailPage';
// Original collection imagery, independent of booking availability.
const artistArtwork = [
  {
    "images": [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552346154-21d32810baa3?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=500&h=600&fit=crop"
    ]
  },
  {
    "images": [
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=600&fit=crop"
    ]
  },
  {
    "images": [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1485230895905-ef31ba762ee5?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&h=600&fit=crop"
    ]
  }
];
const equipmentArtwork = [
  {
    "images": [
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&h=600&fit=crop"
    ]
  },
  {
    "images": [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=600&fit=crop"
    ]
  },
  {
    "images": [
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=600&fit=crop"
    ]
  }
];
export function collectionsFor(state: DashboardState, type?: 'artist' | 'equipment'): CollectionListing[] {
  const uploaded = state.media.filter(item => item.type === 'image' && item.src.startsWith('blob:')).sort((a,b) => Number(b.featured)-Number(a.featured)).map(item => item.src);
  const ownerIndices = { artist: 0, renter: 0 };
  return state.listings.filter(item => item.status === 'live' && (!type || item.owner === (type === 'artist' ? 'artist' : 'renter'))).map(item => {
    const artwork = (item.owner === 'artist' ? artistArtwork : equipmentArtwork)[ownerIndices[item.owner]++ % 3];
    return { id: item.id, catalogId: item.id, name: item.title, description: item.description, type: item.owner === 'artist' ? 'artist' : 'equipment', images: item.owner === 'artist' && uploaded.length ? [...uploaded, ...artwork.images].slice(0,5) : artwork.images };
  });
}
