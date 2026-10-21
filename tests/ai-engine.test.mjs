import test from 'node:test'
import assert from 'node:assert/strict'
import { initialAIEngine, reduceAIEngine, weightsError, promptError, promptPreview, sampleMetrics } from '../src/lib/aiEngine.ts'
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts'
const at = '2026-10-21T10:00:00Z'
const run = (s, a) => reduceAIEngine(s, a, at)

test('weights reject out-of-range, fractional, nonfinite and invalid totals; valid settings are copied', () => {
  const s=initialAIEngine()
  for(const genre of [-1,101,0.5,NaN,Infinity]) { const weights={...s.weights,genre};assert.ok(weightsError(weights));assert.equal(run(s,{type:'weights',weights}),s) }
  assert.equal(run(s,{type:'weights',weights:{genre:50,budget:30,location:20,rating:10}}),s)
  const weights={genre:35,budget:35,location:20,rating:10},next=run(s,{type:'weights',weights});weights.genre=99
  assert.equal(next.weights.genre,35);assert.equal(s.weights.genre,40);assert.equal(next.activity.length,1)
})
test('only admin can change AI state and saved configuration persists through other dashboard actions', () => {
  const s=initialDashboard(),a={type:'ai',action:{type:'weights',weights:{genre:35,budget:35,location:20,rating:10}}}
  for(const role of ['customer','artist','renter'])assert.equal(reduceDashboard(s,a,role,at),s)
  const next=reduceDashboard(s,a,'admin',at);assert.equal(next.aiEngine.weights.genre,35)
  const another=reduceDashboard(next,{type:'maintenance',enabled:true},'admin',at);assert.equal(another.aiEngine,next.aiEngine)
})
test('drafts are separate from published prompts and can preserve incomplete edits', () => {
  const s=initialAIEngine(),draft=run(s,{type:'draft',key:'bio',body:'Incomplete draft'})
  assert.equal(draft.prompts.bio.draft,'Incomplete draft');assert.equal(draft.prompts.bio.versions[0].version,2)
  assert.equal(run(draft,{type:'publish',key:'bio',body:'Incomplete draft',baseVersion:2}),draft)
  const discard=run(draft,{type:'discard',key:'bio'});assert.equal(discard.prompts.bio.draft,null);assert.deepEqual(discard.prompts.bio.versions,s.prompts.bio.versions)
})
test('publishing validates placeholders and optimistic versions without changing other templates', () => {
  const s=initialAIEngine(),body=s.prompts.bio.versions[0].body+' Keep the tone warm.'
  assert.ok(promptError('bio','Use {{artist_name}} and {{unknown}} in this longer prompt.'))
  assert.ok(promptError('bio',body+' {{unsupported}}'))
  assert.equal(run(s,{type:'publish',key:'bio',body,baseVersion:1}),s)
  const next=run(s,{type:'publish',key:'bio',body,baseVersion:2});assert.equal(next.prompts.bio.versions[0].version,3);assert.equal(next.prompts.bio.draft,null);assert.equal(next.prompts.equipment,s.prompts.equipment);assert.equal(s.prompts.bio.versions.length,2)
  assert.equal(run(next,{type:'publish',key:'bio',body,baseVersion:3}),next)
})
test('rollback appends a new version, clears draft and preserves immutable history; stale targets fail', () => {
  const s=run(initialAIEngine(),{type:'draft',key:'bio',body:'Saved draft'})
  const next=run(s,{type:'rollback',key:'bio',version:1,baseVersion:2})
  assert.equal(next.prompts.bio.versions[0].version,3);assert.equal(next.prompts.bio.versions[0].body,s.prompts.bio.versions[1].body);assert.equal(next.prompts.bio.draft,null);assert.equal(next.prompts.bio.versions[1],s.prompts.bio.versions[0]);assert.equal(next.prompts.bio.versions[0].reason,'Rollback from v1')
  assert.equal(run(s,{type:'rollback',key:'bio',version:99,baseVersion:2}),s);assert.equal(run(next,{type:'rollback',key:'bio',version:2,baseVersion:2}),next)
})
test('sample preview resolves supported placeholders and preserves literal content without calling a model', () => {
  const s=initialAIEngine(),body=s.prompts.bio.versions[0].body+' <script>literal text</script>',p=promptPreview('bio',body)
  assert.equal(p.error,'');assert.ok(p.resolved.includes('Aria Nova'));assert.ok(p.resolved.includes('<script>literal text</script>'));assert.ok(p.output.includes('Aria Nova'))
  assert.ok(promptPreview('equipment','invalid').error);assert.ok(promptPreview('equipment',s.prompts.equipment.versions[0].body).output.includes('unknown'))
})
test('model and time filters derive matching sample totals; outage hides metrics and retains configuration', () => {
  const all=sampleMetrics('all','24h','healthy'),bio=sampleMetrics('bio','24h','healthy'),spec=sampleMetrics('equipment','24h','healthy')
  assert.equal(all.input,bio.input+spec.input);assert.equal(all.output,bio.output+spec.output);assert.equal(all.requests,bio.requests+spec.requests);assert.equal(sampleMetrics('all','7d','healthy').requests,all.requests*7)
  const s=initialAIEngine(),off=run(s,{type:'scenario',scenario:'outage'});assert.equal(sampleMetrics('all','24h',off.scenario),null);assert.equal(off.prompts,s.prompts);assert.equal(off.weights,s.weights);assert.equal(run(off,{type:'scenario',scenario:'healthy'}).scenario,'healthy')
})
