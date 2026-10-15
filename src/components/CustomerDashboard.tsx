import { useState, type ReactNode } from 'react';
import { LifeBuoy } from 'lucide-react';
import { Icon } from './Icons';
import MemberProfile from './MemberProfile';
import CasePortal from './CasePortal';
import Marketplace from './Marketplace';
import { requestDashboardNavigation } from './DashboardUI';
import DashboardShell from './DashboardShell';
import CollectionDetailPage, { type CollectionListing } from './CollectionDetailPage';
const navItems = [
 {id:'home',label:'Discover',icon:Icon.Home},{id:'saved',label:'Saved listings',icon:Icon.Heart},
 {id:'booking',label:'My bookings',icon:Icon.Calendar},{id:'payments',label:'Payments',icon:Icon.DollarSign},
 {id:'messages',label:'Messages',icon:Icon.MessageCircle},{id:'profile',label:'My profile',icon:Icon.User},
 {id:'support',label:'Help & disputes',icon:LifeBuoy},
];
export default function CustomerDashboard({onOpenChat,onOpenBooking,onOpenPayments,onGoToLanding,roleControl}:{roleControl?:ReactNode;onOpenChat?:()=>void;onOpenPayments?:()=>void;onOpenBooking?:()=>void;onGoToLanding?:()=>void}) {
 const [tab,setTab]=useState('home'),[collection,setCollection]=useState<CollectionListing|null>(null);
 const navigate=(next:string)=>requestDashboardNavigation(()=>{if(next==='booking')onOpenBooking?.();else if(next==='payments')onOpenPayments?.();else if(next==='messages')onOpenChat?.();else{setTab(next);setCollection(null);}});
 return <DashboardShell controls={roleControl} role="customer" navItems={navItems} activeTab={tab} onNavigate={navigate} onGoToLanding={()=>requestDashboardNavigation(()=>onGoToLanding?.())} onOpenChat={()=>navigate('messages')}><div className="mg-page"><p className="mg-session-note">Demo workspace · Bookings, saved listings and drafts stay in this tab until refresh.</p>{tab==='profile'?<MemberProfile/>:tab==='support'?<CasePortal mode="support"/>:collection?<CollectionDetailPage listing={collection} onBack={()=>requestDashboardNavigation(()=>setCollection(null))}/>:<Marketplace key={tab} saved={tab==='saved'} onOpen={setCollection}/>}</div></DashboardShell>;
}
