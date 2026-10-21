import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEquipmentSuggestion, equipmentErrors, equipmentFixtures, lookupEquipment, suggestionChoices, validSuggestion } from '../src/lib/equipmentSpecs.ts';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
import { defaultDepositTerms } from '../src/lib/securityDeposit.ts';
const full = equipmentFixtures[0], partial = equipmentFixtures[1];
const form = () => ({ ...initialDashboard().listings.find(x => x.id === 'EQ-001'), title: full.model, depositMode: 'percentage', depositValue: '15', depositTerms: defaultDepositTerms, depositCurrency: 'USD' });
test('sample adapter has exact named matches, partial/no-match and safe failure outcomes; results are copies', async () => {
 const run = (title, scenario = 'normal') => lookupEquipment(title, scenario, new AbortController().signal, 0);
 assert.equal((await run(' Yamaha   DXR15 ')).kind, 'match');
 assert.equal((await run(partial.model)).suggestion.partial, true);
 assert.equal((await run('Yamaha DXR15 variant')).kind, 'no-match');
 assert.equal((await run(full.model, 'unavailable')).kind, 'unavailable');
 assert.equal((await run(full.model, 'invalid')).kind, 'invalid');
 const first = await run(full.model); first.suggestion.fields.specWattage = '1';
 assert.equal((await run(full.model)).suggestion.fields.specWattage, '1100');
 const abort = new AbortController(); const pending = lookupEquipment(full.model, 'normal', abort.signal, 100); abort.abort();
 await assert.rejects(pending, { name: 'AbortError' });
});
test('untrusted or invalid suggestion values never apply', () => {
 for (const value of [null, {}, {...full, fields:{specWattage:'-1'}}, {...full, fields:{unexpected:'123'}}, {...full, depositUSD:'1000001'}, {...full, fields:{description:'short'}}, {...full, fields:{specSpl:'Infinity'}}]) assert.equal(validSuggestion(value), false);
 assert.equal(validSuggestion(full), true); assert.equal(validSuggestion(partial), true);
 assert.equal(applyEquipmentSuggestion(form(), form(), full.model, {...full, fields:{specWattage:'-1'}}, ['specWattage']).patch, undefined);
});
test('default selection fills blanks only, preserves existing description and never opts into deposit replacement', () => {
 const current = {...form(), specWattage:'900'};
 const selected = suggestionChoices(current, full);
 assert.equal(selected.includes('specWattage'), false); assert.equal(selected.includes('description'), false); assert.equal(selected.includes('deposit'), false);
 const result = applyEquipmentSuggestion(current, current, full.model, full, selected);
 const merged = {...current,...result.patch};
 assert.equal(merged.specWattage,'900'); assert.equal(merged.specSpl,'133'); assert.equal(merged.price,current.price);
 assert.equal(merged.title,current.title); assert.equal(merged.quantity,current.quantity); assert.equal(merged.depositMode,'percentage'); assert.equal(merged.depositValue,'15');
});
test('explicit replacement applies only reviewed fields; separate deposit opt-in changes policy without charging', () => {
 const current = form();
 const result = applyEquipmentSuggestion(current,current,full.model,full,['description','deposit']);
 assert.deepEqual(Object.keys(result.patch).sort(), ['description','depositMode','depositValue','depositTerms','depositCurrency'].sort());
 assert.equal(result.patch.depositValue,'100.00'); assert.equal(result.patch.depositMode,'fixed');
 assert.equal(result.patch.description,full.fields.description); assert.equal(current.depositMode,'percentage');
});
test('changed names, selected-field edits, stale deposit terms and invalid selections block replacement', () => {
 const baseline = form();
 for (const [current, selected] of [[{...baseline,title:'Other unit'},['specWattage']],[{...baseline,specWattage:'500'},['specWattage']],[{...baseline,depositTerms:'Changed refund terms for this unit.'},['deposit']],[baseline,[]],[baseline,['specWattage','specWattage']],[baseline,['unknown']]])
  assert.ok(applyEquipmentSuggestion(current,baseline,full.model,full,selected).error);
 // An unrelated price edit is kept, while explicitly selected empty spec fields can still apply.
 const changed = {...baseline,price:'250'};
 assert.equal(applyEquipmentSuggestion(changed,baseline,full.model,full,['specWattage']).patch.specWattage,'1100');
});
test('partial suggestions preserve unknown specs and required manual review', () => {
 const current = {...form(),title:partial.model,specWeight:'15'};
 const result = applyEquipmentSuggestion(current,current,partial.model,partial,suggestionChoices(current,partial));
 assert.equal(result.patch.specWattage,undefined); assert.equal(result.patch.specWeight,undefined);
 assert.equal({...current,...result.patch}.specWeight,'15'); assert.ok(result.patch.packageInclusions);
});
test('optional specs validate on publication; extended listing drafts restore specs and preserve published data', () => {
 const state = initialDashboard(); const base = form();
 const listing = {...base,...full.fields,specSource:full.source};
 assert.deepEqual(equipmentErrors({}),{});
 assert.ok(equipmentErrors({specWattage:'-1',specSpl:'251',specWeight:'Infinity',specFrequency:'x'.repeat(121),packageInclusions:'x'.repeat(1001)}).specWattage);
 const bad = reduceDashboard(state,{type:'listing',listing:{...listing,specSpl:'251'}},'renter','2026-10-21T10:00:00Z'); assert.equal(bad,state);
 assert.equal(Object.keys(listing).length,20);
 const draft = reduceDashboard(state,{type:'draft',key:'listing:EQ-001',values:listing},'renter','2026-10-21T10:00:00Z');
 assert.deepEqual(draft.drafts['renter:listing:EQ-001'],listing); assert.deepEqual(draft.listings,state.listings);
 for(const role of ['artist','customer','admin']) assert.equal(reduceDashboard(draft,{type:'listing',listing},role,'2026-10-21T10:00:00Z'),draft);
 const saved = reduceDashboard(draft,{type:'listing',listing},'renter','2026-10-21T10:00:00Z');
 assert.equal(saved.listings.find(x=>x.id==='EQ-001').specWattage,'1100'); assert.equal(saved.drafts['renter:listing:EQ-001'],undefined);
});
