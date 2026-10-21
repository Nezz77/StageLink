import { useEffect, useState } from 'react'
import { Activity, BrainCircuit, Check, History, RotateCcw, Save, SlidersHorizontal, Sparkles, Unplug } from 'lucide-react'
import { useDashboard } from '../lib/DashboardContext'
import { defaultWeights, promptDefinitions, promptError, promptPreview, sampleMetrics, weightKeys, weightsError, type AIAction, type MatchWeights, type MetricsModel, type MetricsPeriod, type PromptKey } from '../lib/aiEngine'
import { DashboardIntro } from './DashboardShell'
import { Badge, Modal, Notice, Panel, Stats, useDraftGuard } from './DashboardUI'
import ConfirmDialog from './ConfirmDialog'
import '../ai-engine.css'

const weightLabels = { genre: 'Genre match', budget: 'Budget match', location: 'Location radius', rating: 'Rating score' }
const sameWeights = (a: MatchWeights, b: MatchWeights) => weightKeys.every(key => a[key] === b[key])
type Confirmation = { kind: 'publish' } | { kind: 'rollback'; version: number } | { kind: 'template'; key: PromptKey }

export default function AdminAIEngine() {
  const { state, dispatch } = useDashboard(), engine = state.aiEngine
  const [weights, setWeights] = useState<MatchWeights>({ ...engine.weights })
  const [key, setKey] = useState<PromptKey>('bio'), prompt = engine.prompts[key], current = prompt.versions[0]
  const [body, setBody] = useState(prompt.draft ?? current.body)
  const [model, setModel] = useState<MetricsModel>('all'), [period, setPeriod] = useState<MetricsPeriod>('24h')
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState<Confirmation | null>(null)
  const weightsDirty = !sameWeights(weights, engine.weights), promptDirty = body !== (prompt.draft ?? current.body)
  const guard = useDraftGuard(weightsDirty || promptDirty)
  useEffect(() => { const p = engine.prompts[key]; setBody(p.draft ?? p.versions[0].body) }, [key, engine.prompts])
  const invalidWeights = weightsError(weights), invalidPrompt = promptError(key, body), sample = sampleMetrics(model, period, engine.scenario)
  const total = weightKeys.reduce((sum, key) => sum + weights[key], 0)
  const apply = (action: AIAction, message: string) => {
    const ok = dispatch({ type: 'ai', action })
    setError(ok ? '' : 'This change could not be saved. Check the values or reload the current version.')
    setNotice(ok ? message : '')
    return ok
  }
  const runConfirmed = () => {
    if (!confirm) return
    if (confirm.kind === 'template') { setKey(confirm.key); setNotice(''); setError('') }
    else if (confirm.kind === 'publish') apply({ type: 'publish', key, body, baseVersion: current.version }, 'Demo prompt published. A new version is recorded in this session.')
    else apply({ type: 'rollback', key, version: confirm.version, baseVersion: current.version }, 'Rollback recorded as a new demo version. Previous versions remain in history.')
    setConfirm(null)
  }
  const changeTemplate = (next: PromptKey) => {
    if (next === key) return
    if (promptDirty) setConfirm({ kind: 'template', key: next })
    else { setKey(next); setNotice(''); setError('') }
  }
  const result = promptPreview(key, body)
  return <div className="mg-page ai-page">
    <DashboardIntro eyebrow="OPERATIONS / CENTRAL AI ENGINE" title="The intelligence" emphasis="behind the encore." description="Tune discovery, inspect sample service health and manage the prompts behind StageLink." action={<div className="mg-actions"><a className="btn-primary" href="#ai-prompt-studio">Prompt studio</a><button className="btn-ghost" onClick={() => apply({ type: 'scenario', scenario: engine.scenario === 'outage' ? 'healthy' : 'outage' }, engine.scenario === 'outage' ? 'Healthy sample restored. No service was contacted.' : 'Outage scenario selected. No service was contacted.')}><Unplug size={16} />{engine.scenario === 'outage' ? 'Restore sample' : 'Simulate outage'}</button></div>} />
    <div className="ai-demo"><BrainCircuit size={20} /><div><strong>Model Ops · demo control room</strong><p>Service not connected. Metrics and previews are sample data, not live usage or billing. Changes last in this tab until refresh.</p></div><Badge value="paused">Not connected</Badge></div>
    <Notice>{notice}</Notice><Notice error>{error}</Notice>
    <div className="ai-filter-row"><label className="mg-filter">Model route<select aria-label="AI model route" value={model} onChange={e => setModel(e.target.value as MetricsModel)}><option value="all">All sample models</option><option value="bio">Bio model · sample</option><option value="equipment">Equipment model · sample</option></select></label><label className="mg-filter">Sample window<select aria-label="AI metrics window" value={period} onChange={e => setPeriod(e.target.value as MetricsPeriod)}><option value="24h">Last 24 hours · sample</option><option value="7d">Last 7 days · sample</option></select></label><span className="ai-snapshot">Fixed sample · 21 Oct 2026, 08:00 UTC</span></div>
    {sample ? <Stats values={[{ label: 'FastAPI latency', value: `${sample.latency} ms`, note: 'Sample mean response time' }, { label: 'Redis cache hit ratio', value: `${sample.cache}%`, note: 'Sample cache responses' }, { label: 'LLM token usage', value: (sample.input + sample.output).toLocaleString('en-US'), note: `${sample.input.toLocaleString('en-US')} input / ${sample.output.toLocaleString('en-US')} output · sample` }, { label: 'Model requests', value: sample.requests.toLocaleString('en-US'), note: 'Sample requests in selected window' }]} /> : <div className="ai-outage" role="status"><Unplug size={24} /><div><h2>Sample service unavailable</h2><p>Latency, cache and token metrics are unavailable in this scenario. Saved configuration and drafts remain available.</p></div><button className="btn-primary" onClick={() => apply({ type: 'scenario', scenario: 'healthy' }, 'Healthy sample restored. No network request was made.')}>Retry sample connection</button></div>}
    <div className="ai-columns"><Panel eyebrow="DISCOVERY / RANKING MIX" title="Matchmaking weights" action={<SlidersHorizontal size={20} />}>
      <p className="mg-muted">Set the balance used by the sample ranking configuration. Every mix must add up to 100%.</p>
      <div className="ai-mix" aria-label={`Matchmaking weight total ${total}%`}>{weightKeys.map(k => <i key={k} style={{ flexGrow: Math.max(0, Number.isFinite(weights[k]) ? weights[k] : 0) }} />)}</div>
      <form onSubmit={e => { e.preventDefault(); if (!invalidWeights && weightsDirty) apply({ type: 'weights', weights }, 'Demo matchmaking weights saved for this session.') }}>
        {weightKeys.map(k => <div className="ai-weight" key={k}><label htmlFor={`ai-weight-${k}`}>{weightLabels[k]}</label><div><input aria-label={`${weightLabels[k]} slider`} type="range" min="0" max="100" step="1" value={Number.isFinite(weights[k]) ? weights[k] : 0} onChange={e => setWeights(w => ({ ...w, [k]: Number(e.target.value) }))} /><label className="ai-number"><span className="ai-sr-only">{weightLabels[k]} percent</span><input id={`ai-weight-${k}`} type="number" min="0" max="100" step="1" value={Number.isFinite(weights[k]) ? weights[k] : ''} onChange={e => setWeights(w => ({ ...w, [k]: e.target.value === '' ? NaN : Number(e.target.value) }))} aria-invalid={!!invalidWeights} aria-describedby="ai-weights-validation" /><span>%</span></label></div></div>)}
        <div className="ai-total"><strong>Total {Number.isFinite(total) ? total : '—'}%</strong><span>{weightsDirty ? 'Unsaved changes' : 'Saved configuration'}</span></div><p id="ai-weights-validation" className={invalidWeights ? 'mg-error' : 'ai-valid'} role={invalidWeights ? 'alert' : 'status'}>{invalidWeights || 'Ready · weights total 100%.'}</p>
        <div className="mg-actions"><button className="btn-primary" disabled={!!invalidWeights || !weightsDirty}><Save size={15} />Save demo weights</button><button type="button" className="btn-ghost" onClick={() => setWeights({ ...defaultWeights })}><RotateCcw size={15} />Reset to 40 / 30 / 20 / 10</button></div>
      </form>
    </Panel><Panel eyebrow="CENTRAL LLM / SERVICE ROUTES" title="Engine health" action={<Activity size={20} />}>
      <div className="ai-service"><BrainCircuit size={26} /><div><h3>Central LLM microservice</h3><p>FastAPI gateway · sample telemetry</p></div><Badge value={engine.scenario === 'healthy' ? 'approved' : 'rejected'}>{engine.scenario === 'healthy' ? 'Healthy sample' : 'Unavailable sample'}</Badge></div>
      <dl className="ai-route-list"><div><dt>Bio generation</dt><dd>Bio model · sample</dd></div><div><dt>Equipment specifications</dt><dd>Equipment model · sample</dd></div><div><dt>Prompt versions</dt><dd>Bio v{engine.prompts.bio.versions[0].version} / Specs v{engine.prompts.equipment.versions[0].version}</dd></div><div><dt>Provider connection</dt><dd>Not configured</dd></div></dl><p className="ai-service-note">Published demo settings do not call a model or change recommendations elsewhere in the website. They preview the controls for the future central service.</p>
    </Panel></div>
    <div id="ai-prompt-studio"><Panel eyebrow="PROMPT STUDIO / VERSIONED TEMPLATES" title="Give the engine its direction." className="ai-prompts" action={<label className="mg-filter">Template<select aria-label="Prompt template" value={key} onChange={e => changeTemplate(e.target.value as PromptKey)}><option value="bio">Artist bio generation</option><option value="equipment">Equipment spec generation</option></select></label>}>
      <div className="ai-prompt-grid"><div><div className="ai-prompt-status"><Badge value="approved">Published v{current.version}</Badge><span>{promptDirty ? 'Unsaved edits' : prompt.draft !== null ? 'Draft saved in this tab' : 'Current published prompt'}</span></div><label className="mg-field">System prompt<textarea aria-label="System prompt" rows={9} maxLength={3000} value={body} onChange={e => { setBody(e.target.value); setNotice('') }} aria-invalid={!!invalidPrompt} aria-describedby="ai-prompt-validation" /></label><div className="ai-placeholder-row">{promptDefinitions[key].fields.map(field => <code key={field}>{'{{' + field + '}}'}</code>)}<small>{body.length}/3,000</small></div><p id="ai-prompt-validation" className={invalidPrompt ? 'mg-error' : 'mg-muted'}>{invalidPrompt || 'Required placeholders are intact. Review the preview before publishing.'}</p>
      <div className="mg-actions"><button className="btn-ghost" disabled={!promptDirty} onClick={() => apply({ type: 'draft', key, body }, 'Prompt draft saved in this tab. It is not published.')}><Save size={15} />Save draft</button><button className="btn-ghost" disabled={!!invalidPrompt} onClick={() => setPreview(true)}><Sparkles size={15} />Preview sample</button><button className="btn-primary" disabled={!!invalidPrompt || body === current.body} onClick={() => setConfirm({ kind: 'publish' })}>Review & publish</button></div>
      {(promptDirty || prompt.draft !== null) && <button className="ai-text-button" onClick={() => { if (prompt.draft !== null) apply({ type: 'discard', key }, 'Saved draft discarded.'); setBody(current.body) }}>Discard prompt edits</button>}
      </div><aside className="ai-history"><h3><History size={17} />Version history</h3><p>Rollback creates a new version and keeps the original record.</p>{prompt.versions.map((version, index) => <article key={version.version}><div><strong>v{version.version}{index === 0 ? ' · current' : ''}</strong><small>{version.reason}</small><time dateTime={version.at}>{new Date(version.at).toLocaleString()}</time></div>{index > 0 && <button className="btn-ghost" disabled={version.body === current.body} onClick={() => setConfirm({ kind: 'rollback', version: version.version })}>Roll back to v{version.version}</button>}</article>)}</aside></div>
    </Panel></div>
    <Panel eyebrow="THIS TAB / CONFIGURATION ACTIVITY" title="Changes behind the scenes">{engine.activity.length ? <ol className="mg-audit">{engine.activity.map((item, i) => <li key={`${item.at}:${i}`}><span /><div><p>{item.label}</p><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></div></li>)}</ol> : <p className="mg-muted">No changes yet. Saving weights, drafts, published revisions and rollback will appear here.</p>}</Panel>
    {preview && <Modal title={`${promptDefinitions[key].title} · sample preview`} onClose={() => setPreview(false)}><p className="ai-preview-note">Deterministic sample only. No model was called. This does not validate how a model will respond.</p><h3>Sample input</h3><dl className="ai-route-list">{Object.entries(promptDefinitions[key].sample).map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><h3>Resolved system prompt</h3><pre className="ai-resolved">{result.resolved}</pre><h3>Illustrative output</h3><p>{result.output}</p><button className="btn-primary" onClick={() => { setPreview(false); setConfirm({ kind: 'publish' }) }} disabled={!!invalidPrompt || body === current.body}>Review publish</button></Modal>}
    {confirm && <ConfirmDialog title={confirm.kind === 'template' ? 'Discard unsaved prompt edits?' : confirm.kind === 'publish' ? `Publish ${promptDefinitions[key].title} v${current.version + 1}?` : `Roll back to v${confirm.version}?`} confirm={confirm.kind === 'template' ? 'Discard edits & switch' : confirm.kind === 'publish' ? 'Publish demo version' : 'Confirm demo rollback'} onClose={() => setConfirm(null)} onConfirm={runConfirmed}>{confirm.kind === 'template' ? 'Your unsaved edits to this template will be lost. Any previously saved draft remains available.' : confirm.kind === 'publish' ? 'This saves a new prompt version for this demo tab. It does not call a model or publish to a live service.' : `A new v${current.version + 1} will copy the selected version. Any saved draft will be cleared; earlier versions remain in history. No live service is changed.`}</ConfirmDialog>}
    {guard}
  </div>
}
