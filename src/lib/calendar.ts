import type { Availability } from './catalog.ts';

export type CalendarBlock = Availability['blocks'][number];
export type CalendarBooking = { id: string; event: string; date: string; start: string; end: string; status: string; role: 'artist' | 'renter' };
export const scheduleRevision = (schedule: Availability) => JSON.stringify(schedule);
export const localCalendarDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function calendarBlockError(schedule: Availability, block: CalendarBlock, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(block.date) || Number.isNaN(Date.parse(block.date)) || new Date(block.date).toISOString().slice(0,10)!==block.date) return 'Choose a valid date.';
  if (block.date < today) return 'Choose today or a future date to block.';
  const time=(value:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!time(block.start)||!time(block.end)||block.start>=block.end) return 'The blocked period must end after it starts.';
  if (!block.reason.trim() || block.reason.length>160) return 'Add a short reason (up to 160 characters).';
  if (!block.id || schedule.blocks.some(item=>item.id===block.id)) return 'This blocked period has already been saved.';
  if (schedule.blocks.length>=10) return 'You can save up to 10 blocked periods. Remove one before adding another.';
  if (schedule.blocks.some(item=>item.date===block.date && item.start<block.end && item.end>block.start)) return 'This time overlaps an existing blocked period. Review or remove that period first.';
  return '';
}
export function calendarImpacts(block: Pick<CalendarBlock,'date'|'start'|'end'>, records: CalendarBooking[], role: 'artist'|'renter') {
  return records.filter(record=>record.role===role && ['pending','accepted','active'].includes(record.status) && record.date===block.date && record.start<block.end && record.end>block.start);
}
export const isFullDayBlock = (block: CalendarBlock) => block.start==='00:00' && block.end==='23:59';
