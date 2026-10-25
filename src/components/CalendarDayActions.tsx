import { useState } from 'react';
import { CalendarOff, LockKeyhole, Trash2 } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { useDashboard } from '../lib/DashboardContext';
import { bookingService } from '../lib/pipeline';
import { calendarBlockError, calendarImpacts, isFullDayBlock, localCalendarDate, scheduleRevision, type CalendarBlock } from '../lib/calendar';
import { Modal, Notice } from './DashboardUI';
import '../calendar.css';

const label=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'});
export default function CalendarDayActions({date,onClose,onSaved}:{date:string;onClose:()=>void;onSaved:(message:string)=>void}) {
  const {actor,state:bookings,now}=useBooking();const {state,dispatch}=useDashboard();
  const role=actor==='renter'?'renter':'artist',schedule=state.availability[role],revision=scheduleRevision(schedule);
  const [stage,setStage]=useState<'actions'|'edit'|'review'|'remove'>('actions');
  const [mode,setMode]=useState<'day'|'time'>('day'),[start,setStart]=useState('18:00'),[end,setEnd]=useState('22:00'),[reason,setReason]=useState(''),[error,setError]=useState('');
  const [review,setReview]=useState<{block:CalendarBlock;revision:string;impact:string}|null>(null),[removal,setRemoval]=useState<{block:CalendarBlock;revision:string}|null>(null),[ack,setAck]=useState(false);
  if(actor!=='artist'&&actor!=='renter')return null;
  const blocks=schedule.blocks.filter(block=>block.date===date).sort((a,b)=>a.start.localeCompare(b.start));
  const records=bookings.bookings.map(record=>({...record,role:bookingService(record).role}));
  const candidate=review?.block??{id:'preview',date,start:mode==='day'?'00:00':start,end:mode==='day'?'23:59':end,reason};
  const impacts=calendarImpacts(candidate,records,role),impact=JSON.stringify(impacts.map(r=>[r.id,r.status,r.date,r.start,r.end]));
  const changed=!!review&&(review.revision!==revision||review.impact!==impact);
  const past=date<localCalendarDate(now);
  const back=()=>{setStage('actions');setError('');setReview(null);setRemoval(null);setAck(false);};
  const complete=(message:string)=>{onSaved(message);onClose();};
  return <Modal title={stage==='review'?'Review blocked time':stage==='remove'?'Remove this blocked period?':stage==='edit'?'Mark as unavailable':label(date)} onClose={onClose}>
    <div className="sl-calendar-dialog">
      <span className="sl-eyebrow">YOUR TIME / YOUR CALL</span>
      {stage!=='actions'&&<p className="sl-calendar-date">{label(date)}</p>}
      {stage==='actions'?<>
        <p>Block personal time across all your {role==='artist'?'gigs':'equipment listings'}. Existing bookings stay on your calendar.</p>
        {blocks.length>0?<div className="sl-calendar-blocks">{blocks.map(block=><div className="sl-calendar-block" key={block.id}><LockKeyhole size={17}/><div><strong>{isFullDayBlock(block)?'All day':`${block.start}–${block.end}`}</strong><p>{block.reason}</p></div><button className="btn-ghost" aria-label={`Remove ${isFullDayBlock(block)?'all-day':`${block.start} to ${block.end}`} block: ${block.reason}`} onClick={()=>{setRemoval({block,revision});setStage('remove');}}><Trash2 size={15}/>Remove</button></div>)}</div>:<p className="sl-calendar-note">No blocked periods on this date.</p>}
        {past?<p className="sl-calendar-note">Past dates are read-only for new blocks. You can remove a saved period.</p>:<button className="btn-primary" disabled={schedule.blocks.length>=10} onClick={()=>{setReview(null);setStage('edit');}}><CalendarOff size={16}/>Block date or time</button>}
        {schedule.blocks.length>=10&&<p className="sl-calendar-note">10 of 10 periods saved. Remove one to make room.</p>}
      </>:stage==='edit'?<form onSubmit={event=>{event.preventDefault();const block={id:crypto.randomUUID(),date,start:mode==='day'?'00:00':start,end:mode==='day'?'23:59':end,reason:reason.trim()};const issue=calendarBlockError(schedule,block,localCalendarDate(now));setError(issue);if(issue)return;const affected=calendarImpacts(block,records,role);setReview({block,revision,impact:JSON.stringify(affected.map(r=>[r.id,r.status,r.date,r.start,r.end]))});setAck(false);setStage('review');}}>
        <fieldset className="sl-calendar-mode"><legend>Block duration</legend><label><input type="radio" name="calendar-mode" checked={mode==='day'} onChange={()=>setMode('day')}/>All day</label><label><input type="radio" name="calendar-mode" checked={mode==='time'} onChange={()=>setMode('time')}/>Specific time</label></fieldset>
        {mode==='time'&&<div className="sl-calendar-times"><label className="mg-field">Block starts<input type="time" required value={start} onChange={event=>setStart(event.target.value)}/></label><label className="mg-field">Block ends<input type="time" required value={end} onChange={event=>setEnd(event.target.value)}/></label></div>}
        <label className="mg-field">Private reason<textarea autoFocus required maxLength={160} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Personal leave, rehearsal or maintenance…"/></label><p className="sl-calendar-note">The reason is visible to your provider role in this demo. Customers only see that the time is unavailable. All times use the event’s local time.</p>
        <Notice error>{error}</Notice><div className="mg-actions"><button className="btn-ghost" type="button" onClick={back}>Back</button><button className="btn-primary" type="submit">Review block</button></div>
      </form>:stage==='review'&&review?<>
        <div className="sl-calendar-summary"><LockKeyhole size={22}/><div><strong>{isFullDayBlock(review.block)?'All day':`${review.block.start}–${review.block.end}`}</strong><p>{review.block.reason}</p></div></div>
        {impacts.length>0?<div className="sl-calendar-warning"><strong>{impacts.length} existing {impacts.length===1?'booking overlaps':'bookings overlap'} this period</strong><p>These bookings will stay unchanged. Coordinate any schedule change with the customer in booking chat.</p><ul>{impacts.map(record=><li key={record.id}>{record.id} · {record.event}<span>{record.start}–{record.end} · {record.status==='pending'?'Pending request — acceptance will be blocked':record.status}</span></li>)}</ul><label><input type="checkbox" checked={ack} onChange={event=>setAck(event.target.checked)}/>I understand these bookings remain on the calendar.</label></div>:<p>No active bookings overlap this period. New requests for it will be blocked.</p>}
        {changed&&<Notice error>Availability or bookings changed while this review was open. Go back and review the block again.</Notice>}
        <Notice error>{error}</Notice><div className="mg-actions"><button className="btn-ghost" onClick={()=>{setReview(null);setStage('edit');setError('');}}>Edit block</button><button className="btn-primary" disabled={changed||(impacts.length>0&&!ack)} onClick={()=>{if(changed||(impacts.length>0&&!ack))return;const issue=calendarBlockError(schedule,review.block,localCalendarDate(now));if(issue){setError(issue);return;}if(dispatch({type:'calendar_block',block:review.block,revision:review.revision}))complete('Blocked period saved. Calendar and Availability are updated for this session.');else setError('The schedule changed. Review the block again.');}}>Save blocked period</button></div>
      </>:stage==='remove'&&removal?<>
        <div className="sl-calendar-summary"><CalendarOff size={22}/><div><strong>{isFullDayBlock(removal.block)?'All day':`${removal.block.start}–${removal.block.end}`}</strong><p>{removal.block.reason}</p></div></div><p>This removes only this block. Regular hours, other blocked periods and existing bookings still apply. It does not guarantee the date is available.</p><Notice error>{error}</Notice><div className="mg-actions"><button className="btn-ghost" onClick={back}>Keep blocked</button><button className="btn-primary" onClick={()=>{if(dispatch({type:'calendar_unblock',id:removal.block.id,revision:removal.revision}))complete('Blocked period removed. Other availability rules still apply.');else setError('The schedule changed. Close this panel and review the date again.');}}>Remove blocked period</button></div>
      </>:null}
      <p className="sl-calendar-note">Demo session · changes reset on refresh.</p>
    </div>
  </Modal>;
}
