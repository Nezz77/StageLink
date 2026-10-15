import { useState } from 'react';
import { Activity, BellRing, Database, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../lib/DashboardContext';
import { DashboardIntro } from './DashboardShell';
import ConfirmDialog from './ConfirmDialog';
import { Badge, Empty, Notice, Panel, useDraftGuard } from './DashboardUI';

export default function SystemControls() {
  const { state, dispatch } = useDashboard();
  const draft = state.drafts['admin:announcement'];
  const [announcement, setAnnouncement] = useState(draft?.text ?? state.announcement);
  const [dirty, setDirty] = useState(false), [notice, setNotice] = useState(draft ? 'Saved announcement draft restored.' : '');
  const [confirm, setConfirm] = useState<'maintenance' | 'cache' | 'sessions' | 'announcement' | null>(null);
  const guard = useDraftGuard(dirty);
  const run = () => {
    if (confirm === 'maintenance') dispatch({ type: 'maintenance', enabled: !state.maintenance });
    if (confirm === 'cache' || confirm === 'sessions') dispatch({ type: 'system_action', command: confirm });
    if (confirm === 'announcement') { dispatch({ type: 'announcement', text: announcement }); setDirty(false); }
    setNotice('Demo control updated. See the activity log below.'); setConfirm(null);
  };
  return <div className="mg-page"><DashboardIntro eyebrow="OPERATIONS / SYSTEM CONTROLS" title="Keep the" emphasis="show running." description="Preview workspace controls and announcements in this temporary demo." />
    <div className="mg-system-health">{[{ icon: Activity, label: 'Frontend workspace', status: 'Ready', value: 'live' }, { icon: Database, label: 'Persistent backend', status: 'Not connected', value: 'paused' }, { icon: ShieldCheck, label: 'Bank transfers', status: 'Simulated', value: 'pending' }].map(item => <Panel key={item.label}><item.icon size={24} /><h3>{item.label}</h3><Badge value={item.value}>{item.status}</Badge></Panel>)}</div>
    <Notice>{notice}</Notice><div className="mg-split"><Panel title="Workspace controls" eyebrow="SIMULATED OPERATIONS"><div className="mg-control"><div><h3>Maintenance mode</h3><p>Show a maintenance notice across the signed-in demo dashboards. Navigation remains available for testing.</p></div><button type="button" className={`mg-switch ${state.maintenance ? 'on' : ''}`} role="switch" aria-label="Maintenance mode" aria-checked={state.maintenance} onClick={() => setConfirm('maintenance')}><span /></button></div>
      <div className="mg-control"><div><KeyRound size={20} /><h3>Refresh user sessions</h3><p>Record a simulated re-authentication action. No real sessions are ended.</p></div><button className="btn-ghost" onClick={() => setConfirm('sessions')}>Simulate refresh</button></div>
      <div className="mg-control"><div><Database size={20} /><h3>Clear delivery cache</h3><p>Preview a cache purge and record it in the operations log. No network cache is changed.</p></div><button className="btn-ghost" onClick={() => setConfirm('cache')}>Simulate purge</button></div>
    </Panel><Panel title="A note for the whole crew" eyebrow="WORKSPACE ANNOUNCEMENT"><form onSubmit={event => { event.preventDefault(); setConfirm('announcement'); }}><label className="mg-field">Announcement<textarea aria-label="Announcement" rows={5} value={announcement} maxLength={500} onChange={event => { setAnnouncement(event.target.value); setDirty(true); setNotice(''); }} placeholder="Share an update with the demo workspace…" /><small>{announcement.length}/500 characters</small></label><div className="mg-actions"><button type="button" className="btn-ghost" onClick={() => { dispatch({ type: 'draft', key: 'announcement', values: { text: announcement } }); setDirty(false); setNotice('Announcement draft saved for later.'); }}><Save size={15} />Save for later</button><button className="btn-primary" disabled={!announcement.trim() && !state.announcement}><BellRing size={15} />{announcement.trim() ? 'Publish demo announcement' : 'Remove announcement'}</button></div><p className="mg-muted">Shown to roles in this tab. No email, SMS or push notification is sent.</p></form>{state.announcement && <div className="mg-suggestion"><Badge value="live">Currently shown</Badge><p>{state.announcement}</p></div>}</Panel></div>
    <Panel title="Operations log" eyebrow="THIS DEMO SESSION">{state.audit.length ? <ol className="mg-audit">{state.audit.map((item, index) => <li key={`${item.at}:${index}`}><span /><div><p>{item.label}</p><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></div></li>)}</ol> : <Empty title="No admin changes yet.">Actions taken in this session will appear here.</Empty>}</Panel>
    {confirm && <ConfirmDialog title={confirm === 'maintenance' ? `${state.maintenance ? 'Disable' : 'Enable'} demo maintenance mode?` : confirm === 'announcement' ? announcement.trim() ? 'Show this announcement?' : 'Remove this announcement?' : confirm === 'cache' ? 'Simulate a cache purge?' : 'Simulate a session refresh?'} confirm="Confirm demo action" onClose={() => setConfirm(null)} onConfirm={run}>This changes only the current demo workspace and records an activity entry. Refresh resets all demo controls.</ConfirmDialog>}{guard}
  </div>;
}
