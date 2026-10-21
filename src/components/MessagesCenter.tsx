import { useEffect, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { useDashboard } from '../lib/DashboardContext';
import { inquiryUnread, type Inquiry } from '../lib/community';
import { draftKey, type MemberRole } from '../lib/dashboard';
import PipelineChat from './PipelineChat';
import { Badge, Empty, Notice, Panel, SearchField, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

function InquiryThread({ item }: { item: Inquiry }) {
 const { actor } = useBooking(); const { state, dispatch } = useDashboard();
 const draft = state.drafts[draftKey(actor, `inquiry:${item.id}`)];
 const [text, setText] = useState(draft?.text ?? ''), [dirty, setDirty] = useState(false), [notice,setNotice]=useState(''), [error,setError]=useState('');
 const guard=useDraftGuard(dirty);
 const unread=inquiryUnread(item,actor as MemberRole);
 useEffect(()=>{if(unread)dispatch({type:'inquiry_read',id:item.id});},[unread,item.id,dispatch]);
 return <Panel title={actor==='customer'?item.providerName:item.customerName} eyebrow={item.title}>
  <p className="mg-muted">Enquiry · No booking or payment has been created.</p>
  <div className="mg-case-thread inquiry-thread" role="log" aria-label="Enquiry messages" aria-live="polite">{item.messages.length?item.messages.map((message,index)=><article key={`${message.at}-${index}`} className={`mg-case-note ${message.sender===actor?'inquiry-mine':''}`}><header><strong>{message.sender===actor?'You':message.sender==='customer'?item.customerName:item.providerName}</strong><time dateTime={message.at}>{new Date(message.at).toLocaleString()}</time></header><p>{message.text}</p></article>):<Empty title="Start with a hello.">Ask about the event, equipment or requirements before booking.</Empty>}</div>
  <form onSubmit={event=>{event.preventDefault();if(dispatch({type:'inquiry_send',id:item.id,text})){dispatch({type:'discard_draft',key:`inquiry:${item.id}`});setText('');setDirty(false);setError('');setNotice('Message sent in this demo.');}else setError('Write a message with 1–4,000 characters.');}}><label className="mg-field">Enquiry message<textarea aria-label="Enquiry message" rows={3} value={text} maxLength={4000} onChange={event=>{setText(event.target.value);setDirty(true);setNotice('');}} /></label><Notice error>{error}</Notice><Notice>{notice}</Notice><div className="mg-actions"><button type="button" className="btn-ghost" onClick={()=>{if(dispatch({type:'draft',key:`inquiry:${item.id}`,values:{text}})){setDirty(false);setNotice('Message draft saved for later in this session.');}else setError('Keep a saved draft to 3,000 characters or fewer.');}}>Save for later</button><button className="btn-primary"><Send size={16}/>Send enquiry</button></div></form>{guard}
 </Panel>;
}
export default function MessagesCenter({initialBookingId,initialInquiryId,onOpenBooking,onOpenCheckout}:{initialBookingId?:string;initialInquiryId?:string;onOpenBooking:(id:string)=>void;onOpenCheckout:(id:string)=>void}) {
 const {actor}=useBooking();const {state}=useDashboard();const [tab,setTab]=useState(initialInquiryId?'enquiries':'bookings'),[selected,setSelected]=useState(initialInquiryId),[query,setQuery]=useState('');
 const items=state.inquiries.filter(item=>actor==='customer'||item.provider===actor);
 const unread=items.reduce((sum,item)=>sum+inquiryUnread(item,actor as MemberRole),0);
 const item=items.find(item=>item.id===selected);
 return <div className="mg-page"><div className="mg-tabs" aria-label="Message type"><button aria-pressed={tab==='bookings'} onClick={()=>requestDashboardNavigation(()=>setTab('bookings'))}>Booking conversations</button><button aria-pressed={tab==='enquiries'} onClick={()=>requestDashboardNavigation(()=>setTab('enquiries'))}>Enquiries {unread>0&&<Badge value="pending">{unread}</Badge>}</button></div>{tab==='bookings'?<PipelineChat initialBookingId={initialBookingId} onOpenBooking={onOpenBooking} onOpenCheckout={onOpenCheckout}/>:<><div className="mg-toolbar"><SearchField label="Search enquiries" value={query} onChange={setQuery}/><span className="sl-eyebrow"><MessageCircle size={16}/> BEFORE THE BOOKING</span></div><div className="mg-review-layout"><Panel title="Enquiries"><div className="mg-case-list">{items.filter(item=>`${item.title} ${item.customerName} ${item.providerName}`.toLowerCase().includes(query.toLowerCase())).map(item=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>requestDashboardNavigation(()=>setSelected(item.id))}><h3>{actor==='customer'?item.providerName:item.customerName}</h3><p>{item.title}</p>{inquiryUnread(item,actor as MemberRole)>0&&<Badge value="pending">{inquiryUnread(item,actor as MemberRole)} unread</Badge>}</button>)}</div>{!items.length&&<Empty title="No enquiries yet.">Customers can open a conversation from a marketplace listing.</Empty>}</Panel>{item?<InquiryThread key={item.id} item={item}/>:<Panel><Empty title="A good show starts with a conversation.">Select an enquiry to see the conversation.</Empty></Panel>}</div></>}</div>;
}
