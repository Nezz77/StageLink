import { useEffect, useState } from 'react';
import { ArrowUpRight, Heart, Music2, Package, MessageCircle } from 'lucide-react';
import { useDashboard } from '../lib/DashboardContext';
import { useBooking } from '../lib/BookingContext';
import { catalogFor, serviceIdFor } from '../lib/catalog';
import { money } from '../lib/booking';
import type { BookingRole } from '../lib/booking';
import { bookingService } from '../lib/pipeline';
import type { CollectionListing } from './CollectionDetailPage';
import { Badge, Empty, Notice, Panel, SearchField, requestDashboardNavigation } from './DashboardUI';
import { DashboardIntro } from './DashboardShell';
import BookingReview from './BookingReview';

export type MarketIntent = { listingId: string; action: 'book' | 'message' };
export const marketAction=(listingId:string,action:MarketIntent['action'])=>window.dispatchEvent(new CustomEvent('stagelink:marketplace',{detail:{listingId,action}}));
export function MarketplaceBridge({ actor, pending, onNeedCustomer, onDone, onBook, onChat }: {actor:BookingRole;pending:MarketIntent|null;onNeedCustomer:(intent:MarketIntent)=>void;onDone:()=>void;onBook:(serviceId:string)=>void;onChat:(bookingId?:string,inquiryId?:string)=>void}) {
 const {state,dispatch}=useDashboard();const {state:bookings}=useBooking();
 useEffect(()=>{
  const run=(intent:MarketIntent)=>{
   const listing=state.listings.find(item=>item.id===intent.listingId&&item.status==='live');if(!listing||!['book','message'].includes(intent.action))return;
   if(actor!=='customer'){onNeedCustomer(intent);return;}
   onDone();const serviceId=serviceIdFor(listing.id);
   if(intent.action==='book'){onBook(serviceId);return;}
   const existing=bookings.bookings.find(record=>record.serviceId===serviceId&&!['rejected','cancelled'].includes(record.status));
   if(existing){onChat(existing.id);return;}
   dispatch({type:'inquiry',listingId:listing.id});onChat(undefined,`INQ-${listing.id}`);
  };
  const handler=(event:Event)=>{const intent=(event as CustomEvent<MarketIntent>).detail;if(intent&&typeof intent.listingId==='string')requestDashboardNavigation(()=>run(intent));};
  window.addEventListener('stagelink:marketplace',handler);
  if(pending&&actor==='customer')run(pending);
  return()=>window.removeEventListener('stagelink:marketplace',handler);
 },[actor,pending,state.listings,bookings.bookings,dispatch,onNeedCustomer,onDone,onBook,onChat]);
 return null;
}
export default function Marketplace({ filter='all', saved=false, onOpen }: {filter?:'artist'|'renter'|'all';saved?:boolean;onOpen:(listing:CollectionListing)=>void}) {
 const {state,dispatch}=useDashboard();const {actor,state:bookingState}=useBooking();const [query,setQuery]=useState('');const [kind,setKind]=useState(filter);
 const listings=state.listings.filter(item=>item.status==='live'&&(kind==='all'||item.owner===kind)&&(!saved||state.savedListings.includes(item.id))&&`${item.title} ${item.category} ${state.profiles[item.owner].name}`.toLowerCase().includes(query.toLowerCase()));
 const cover=state.media.find(item=>item.featured&&item.type==='image')?.src??'/dashboard-stage-fallback.svg';
 return <div className="mg-page market-page"><DashboardIntro eyebrow={saved?'YOUR SAVED LINEUP':'THE PEOPLE & EQUIPMENT BEHIND THE NIGHT'} title={saved?'Keep them':'Find your'} emphasis={saved?'on the list.':'next headliner.'} description="Explore performances and equipment. Choose a listing to plan your event or start a conversation." />
  <div className="mg-toolbar"><SearchField label="Search marketplace" value={query} onChange={setQuery} placeholder="Artist, equipment or occasion…" />{filter==='all'&&<label className="mg-filter">Show<select aria-label="Marketplace category" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="all">All listings</option><option value="artist">Performances</option><option value="renter">Equipment</option></select></label>}</div>
  <div className="mg-catalog">{listings.map(item=>{const profile=state.profiles[item.owner],reviews=bookingState.bookings.filter(record=>record.serviceId===serviceIdFor(item.id)&&record.review);return <article className="mg-catalog-card market-card" key={item.id}><div className="market-cover">{item.owner==='artist'?<img src={cover} alt="" />:<Package size={54}/>}<Badge value="live">{item.category}</Badge></div><span className="sl-eyebrow">{profile.name} · {profile.city}</span><h2>{item.title}</h2><p>{item.description}</p>{reviews.length>0&&<p>★ {(reviews.reduce((sum,record)=>sum+record.review!.rating,0)/reviews.length).toFixed(1)} · {reviews.length} verified booking {reviews.length===1?'review':'reviews'}</p>}<strong className="mg-price">{money(Math.round(Number(item.price)*100))}<small> / {item.unit}</small></strong><div className="mg-actions"><button className="btn-primary" onClick={()=>onOpen({id:item.id,catalogId:item.id,name:item.title,date:'This demo',images:[cover],type:item.owner==='artist'?'artist':'equipment'})}>View {item.owner==='artist'?'gig':'equipment'}<ArrowUpRight size={16}/></button>{actor==='customer'&&<button className="mg-icon" aria-label={`${state.savedListings.includes(item.id)?'Unsave':'Save'} ${item.title}`} aria-pressed={state.savedListings.includes(item.id)} onClick={()=>dispatch({type:'save_listing',id:item.id})}><Heart size={17} fill={state.savedListings.includes(item.id)?'currentColor':'none'}/></button>}</div></article>;})}</div>
  {!listings.length&&<Empty title={saved?'Your shortlist starts here.':'No listings match.'}>Try another search or return after a provider publishes a listing.</Empty>}
 </div>;
}
export function CatalogDetail({id,onBack}:{id:string;onBack:()=>void}) {
 const {state}=useDashboard();const {actor,state:bookings}=useBooking();const [tab,setTab]=useState('details');const item=state.listings.find(item=>item.id===id);
 if(!item)return <div className="mg-page market-page"><button className="mg-back" onClick={onBack}>← Back to listings</button><Empty title="This listing is no longer available.">Existing bookings remain in your booking desk.</Empty></div>;
 const profile=state.profiles[item.owner],service=catalogFor(state).find(service=>service.listingId===id)!;
 const records=bookings.bookings.filter(record=>record.serviceId===service.id);const reviews=records.filter(record=>record.review);
 const approved=state.cases.some(row=>row.kind==='verification'&&row.owner===item.owner&&row.status==='approved');
 return <div className="mg-page market-page"><button className="mg-back" onClick={onBack}>← Back to listings</button><DashboardIntro eyebrow={`${profile.name} / ${item.category}`} title={item.title} emphasis="" description={`${profile.specialty} · ${profile.city}`} />
  <div className="mg-split"><div><div className="market-detail-art">{item.owner==='artist'?<Music2 size={72}/>:<Package size={72}/>}<span>STAGELINK / {item.owner==='artist'?'LIVE':'BACKSTAGE'}</span></div><div className="mg-tabs" role="tablist" aria-label="Listing information">{['details','gallery','reviews'].map(value=><button role="tab" aria-selected={tab===value} key={value} onClick={()=>setTab(value)}>{value==='reviews'?`Reviews (${reviews.length})`:value}</button>)}</div>
   {tab==='details'&&<Panel title="A little more about the show"><p>{item.description}</p><h3>Meet {profile.name}</h3><p>{profile.bio||'Contact the provider to discuss your event.'}</p>{approved&&<Badge value="approved">Profile reviewed in demo</Badge>}{item.owner==='renter'&&<p>{item.quantity} units · {item.condition}. Availability is checked for the requested event date.</p>}<p className="mg-muted">Your quote is fixed when the request is created. Later catalog edits do not alter an existing booking.</p></Panel>}
   {tab==='gallery'&&<Panel title="From the portfolio">{item.owner==='artist'?<div className="mg-media-grid">{!state.media.length&&<Empty title="The portfolio is still coming together.">Ask the performer about their recent work.</Empty>}{state.media.map(media=><figure key={media.id}>{media.type==='image'?<img className="mg-full-media" src={media.src} alt={media.caption}/>:<video className="mg-full-media" src={media.src} controls/>}<figcaption>{media.caption}</figcaption></figure>)}</div>:<Empty title="Talk through your setup.">Use Message to ask about delivery, equipment and stage requirements.</Empty>}</Panel>}
   {tab==='reviews'&&<Panel title="After the encore">{reviews.map(record=><article className="mg-case-note" key={record.id}><strong>{'★'.repeat(record.review!.rating)} · {record.organizer??'Jordan Rivera'}</strong><p>{record.review!.text}</p><small>Completed booking · {record.event}</small></article>)}{!reviews.length&&<p>No reviews yet. Only customers with completed bookings can review this listing.</p>}{actor==='customer'&&records.filter(record=>record.status==='completed'&&!record.review).map(record=><BookingReview key={record.id} record={record}/>)}</Panel>}
  </div><Panel title="Make it part of your event" eyebrow="YOUR NEXT GREAT NIGHT" className="mg-profile-pass"><strong className="mg-price">{money(service.rate)}<small> / {service.unit}</small></strong><p>{profile.name}</p><Badge value={item.status}/>{item.status!=='live'&&<Notice>This listing is not accepting new requests.</Notice>}<div className="mg-actions"><button className="btn-primary" disabled={item.status!=='live'} onClick={()=>marketAction(item.id,'book')}>{item.owner==='artist'?'Book Now':'Request Rental'}<ArrowUpRight size={16}/></button><button className="btn-ghost" disabled={item.status!=='live'} onClick={()=>marketAction(item.id,'message')}><MessageCircle size={16}/>Message</button></div><p className="mg-muted">Optional 10% advance. Pay the balance and approved overtime after the event. All payments stay within StageLink.</p></Panel></div>
 </div>;
}
