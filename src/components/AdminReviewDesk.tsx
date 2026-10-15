import { useState } from 'react';
import { ArrowUpRight, FileCheck2, FileText, MessageSquare, Save, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../lib/DashboardContext';
import { draftKey, terminalCase, type CaseKind, type ReviewCase } from '../lib/dashboard';
import { DashboardIntro } from './DashboardShell';
import { EvidencePreview } from './CasePortal';
import ConfirmDialog from './ConfirmDialog';
import { Badge, Empty, Modal, Notice, Panel, SearchField, Stats, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

function CaseDetail({ item, onPayment }: { item: ReviewCase; onPayment: (id: string) => void }) {
  const { state, dispatch } = useDashboard();
  const draft = state.drafts[draftKey('admin', `case:${item.id}`)];
  const [text, setText] = useState(draft?.text ?? ''), [kind, setKind] = useState<'reply' | 'internal'>(draft?.kind === 'internal' ? 'internal' : 'reply');
  const [reviewed, setReviewed] = useState(false), [document, setDocument] = useState<string | null>(null);
  const [viewed, setViewed] = useState<string[]>([]), [dirty, setDirty] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'resolved' | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(draft ? 'Saved response draft restored.' : '');
  const guard = useDraftGuard(dirty);
  const attachment = state.evidence.find(file => item.evidenceIds?.includes(file.id) && file.name === document);
  const closed = terminalCase(item), verification = item.kind === 'verification';
  const ready = !verification || (reviewed && item.documents.every(name => viewed.includes(name)));
  const prepare = (status: typeof decision) => {
    if (text.trim().length < 10) { setError('Add at least 10 characters explaining your decision.'); return; }
    if (!ready) { setError('Open each document and confirm that you reviewed the information.'); return; }
    setError(''); setDecision(status);
  };
  return <Panel title={item.name} eyebrow={item.id} className="mg-case-detail">
    <div className="mg-actions"><Badge value={item.status} /><Badge value={item.priority}>{item.priority} priority</Badge></div>
    <h3>{item.subject}</h3><p>{item.body}</p><p className="mg-muted">Submitted {new Date(item.submitted).toLocaleDateString()}</p>
    {item.bookingId && <button className="btn-ghost" onClick={() => onPayment(item.bookingId!)}>Review linked payment · {item.bookingId}<ArrowUpRight size={15} /></button>}
    {!!item.documents.length && <div className="mg-document-list">{item.documents.map(name => <button key={name} onClick={() => { setDocument(name); setViewed(previous => [...new Set([...previous, name])]); }}><FileText size={19} /><span>{name}<small>{item.owner ? 'Attached document · open to review' : 'Sample document · open to review'}</small></span>{viewed.includes(name) && <FileCheck2 size={18} />}</button>)}</div>}
    {verification && !closed && <label className="mg-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I have reviewed the documents and profile information.</label>}
    <div className="mg-rule" /><h3>{verification ? 'Review history' : 'Case conversation'}</h3>
    <div className="mg-case-thread">{!item.notes.length && <p className="mg-muted">No notes yet. Record the first update below.</p>}{item.notes.map((note, index) => <article key={`${note.at}:${index}`} className={`mg-case-note mg-note-${note.kind}`}><header><strong>{note.kind === 'reply' ? note.author && note.author !== 'admin' ? `${item.name} · member reply` : 'Admin reply · demo thread' : note.kind === 'internal' ? 'Internal admin note' : 'Admin decision'}</strong><time dateTime={note.at}>{new Date(note.at).toLocaleString()}</time></header><p>{note.text}</p></article>)}</div>
    <Notice>{notice}</Notice><Notice error>{error}</Notice>
    {!closed ? <div className="mg-response"><label className="mg-field">{verification ? 'Review notes / decision reason' : 'Reply or resolution notes'}<textarea aria-label={verification ? 'Review notes / decision reason' : 'Reply or resolution notes'} value={text} onChange={event => { setText(event.target.value); setDirty(true); setError(''); setNotice(''); }} maxLength={2000} rows={5} placeholder="Explain the outcome or the next step…" /></label>
      <label className="mg-field">Note visibility<select aria-label="Note visibility" value={kind} onChange={event => { setKind(event.target.value as 'reply' | 'internal'); setDirty(true); }}><option value="reply">Reply in demo thread</option><option value="internal">Internal admin note</option></select></label>
      <div className="mg-actions"><button className="btn-ghost" onClick={() => { if (dispatch({ type: 'draft', key: `case:${item.id}`, values: { text, kind } })) { setDirty(false); setNotice('Response saved for later in this session.'); } }}><Save size={15} />Save for later</button><button className="btn-ghost" onClick={() => {
        if (dispatch({ type: 'case_note', id: item.id, text, kind })) { setText(''); setDirty(false); setNotice(kind === 'reply' ? 'Reply added to the demo thread. No email or external message was sent.' : 'Internal note added.'); setError(''); } else setError('Write a note with 10–2,000 characters.');
      }}><MessageSquare size={15} />{kind === 'reply' ? 'Add demo reply' : 'Add internal note'}</button></div>
      <div className="mg-rule" /><div className="mg-actions">{verification ? <><button className="btn-ghost" onClick={() => prepare('rejected')}>Reject profile</button><button className="btn-primary" onClick={() => prepare('approved')}><ShieldCheck size={15} />Approve profile</button></> : <button className="btn-primary" onClick={() => prepare('resolved')}>{item.kind === 'disputes' ? 'Record resolution' : 'Resolve ticket'}</button>}</div>
      <p className="mg-muted">{verification ? 'Documents stay in this tab. Review decisions are simulated.' : item.kind === 'disputes' ? 'A resolution records the agreed outcome. Refunds and transfers are handled separately in Payments.' : 'Replies stay in this demo conversation. No external messaging service is connected.'}</p>
    </div> : <div className="mg-closed"><Badge value={item.status} /><p>This review is complete. Its notes remain available in this session.</p>{item.status === 'resolved' && <button className="btn-ghost" onClick={() => dispatch({ type: 'reopen_case', id: item.id })}>Reopen case</button>}</div>}
    {document && attachment && <EvidencePreview file={attachment} onClose={() => setDocument(null)} />}
    {document && !attachment && <Modal title={document} onClose={() => setDocument(null)}><div className="mg-sample-document"><span className="sl-eyebrow">STAGELINK / DEMONSTRATION COPY</span><FileText size={42} /><h3>{document}</h3><dl><div><dt>Applicant / case</dt><dd>{item.name}</dd></div><div><dt>Reference</dt><dd>{item.id}</dd></div><div><dt>Purpose</dt><dd>UI review demonstration</dd></div></dl><p>Sample content only. No genuine identity document, license or personal record is included.</p></div><button className="btn-primary" onClick={() => setDocument(null)}>Done reviewing</button></Modal>}
    {decision && <ConfirmDialog title={decision === 'approved' ? 'Approve this profile?' : decision === 'rejected' ? 'Reject this profile?' : 'Close this case?'} confirm={decision === 'approved' ? 'Confirm approval' : decision === 'rejected' ? 'Confirm rejection' : 'Confirm resolution'} onClose={() => setDecision(null)} onConfirm={() => {
      if (dispatch({ type: 'decide_case', id: item.id, status: decision, reason: text, documentsReviewed: ready })) { setDirty(false); setText(''); setNotice('Decision recorded in this demo session.'); } else setError('This case changed. Review its current status.');
      setDecision(null);
    }}>Your decision and reason will be kept in the case history. This does not move money or send a real message.</ConfirmDialog>}{guard}
  </Panel>;
}
export default function AdminReviewDesk({ kind, onPayment }: { kind: CaseKind; onPayment: (id: string) => void }) {
  const { state, dispatch } = useDashboard();
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('open'), [id, setId] = useState<string | null>(null);
  const items = state.cases.filter(item => item.kind === kind);
  const selected = items.find(item => item.id === id);
  const rows = items.filter(item => (filter === 'all' || (filter === 'open' ? !terminalCase(item) : terminalCase(item))) && `${item.id} ${item.name} ${item.subject}`.toLowerCase().includes(search.toLowerCase()));
  const title = kind === 'verification' ? ['Trust starts', 'with a review.'] : kind === 'disputes' ? ['Find a fair', 'way forward.'] : ['A little help,', 'behind the scenes.'];
  return <div className="mg-page"><DashboardIntro eyebrow={kind === 'verification' ? 'IDENTITY / VERIFICATION DESK' : kind === 'disputes' ? 'DISPUTES / CASE MANAGEMENT' : 'SUPPORT / YOUR RESPONSE DESK'} title={title[0]} emphasis={title[1]} description={kind === 'verification' ? 'Review sample submissions, record decisions, and track every outcome.' : kind === 'disputes' ? 'Review the context, document next steps, and record a resolution.' : 'Open a conversation, save a response draft, and resolve the request.'} />
    <Stats values={[{ label: 'Awaiting review', value: items.filter(item => item.status === 'pending').length }, { label: 'In progress', value: items.filter(item => item.status === 'reviewing').length }, { label: 'Completed', value: items.filter(terminalCase).length }]} />
    <div className="mg-toolbar"><SearchField value={search} onChange={setSearch} label="Search cases" placeholder="Search names, references or subjects…" /><label className="mg-filter">Case status<select aria-label="Case status" value={filter} onChange={event => setFilter(event.target.value)}><option value="open">Open cases</option><option value="closed">Completed</option><option value="all">All cases</option></select></label></div>
    <div className="mg-review-layout"><Panel title={kind === 'verification' ? 'Verification queue' : kind === 'disputes' ? 'Disputes' : 'Support tickets'}>{rows.length ? <div className="mg-case-list">{rows.map(item => <button key={item.id} aria-pressed={id === item.id} className={id === item.id ? 'selected' : ''} onClick={() => requestDashboardNavigation(() => { setId(item.id); dispatch({ type: 'review_case', id: item.id }); })}><div><span className="sl-eyebrow">{item.id}</span><Badge value={item.status} /></div><h3>{item.name}</h3><p>{item.subject}</p>{state.drafts[draftKey('admin', `case:${item.id}`)] && <small>Saved response draft</small>}</button>)}</div> : <Empty title="The queue is clear.">Try another filter or search.</Empty>}</Panel>
      {selected ? <CaseDetail key={selected.id} item={selected} onPayment={onPayment} /> : <Panel><Empty title="Choose a case to begin.">The full context, documents, conversation and actions will appear here.</Empty></Panel>}
    </div>
  </div>;
}
