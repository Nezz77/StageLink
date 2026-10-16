import { useEffect } from 'react';
import { useDashboard } from '../lib/DashboardContext';
import { useBooking } from '../lib/BookingContext';
import { serviceIdFor } from '../lib/catalog';
import type { BookingRole } from '../lib/booking';
import { requestDashboardNavigation } from './DashboardUI';

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
