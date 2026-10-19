import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDashboard, reduceDashboard, draftKey, profileErrors, listingErrors } from '../src/lib/dashboard.ts';
import { collectionsFor } from '../src/lib/catalogPresentation.ts';
const at = '2026-10-15T09:00:00Z';
const run = (state, action, actor = 'artist') => reduceDashboard(state, action, actor, at);
const validListing = () => ({ ...initialDashboard().listings[0], id: 'GIG-NEW', title: 'An acoustic evening' });
const getCase = (state, id = 'VRF-881') => state.cases.find(item => item.id === id);

test('initial demo catalog populates artist and equipment collection pages', () => {
  const state = initialDashboard();
  assert.equal(collectionsFor(state, 'artist').length, 5);
  assert.equal(collectionsFor(state, 'equipment').length, 5);
});

test('profile validation rejects invalid details and a member can change only their own profile', () => {
  const state = initialDashboard(), profile = { ...state.profiles.artist, name: '  Aria Live  ' };
  for (const actor of ['visitor', 'admin']) assert.equal(run(state, { type: 'profile', profile }, actor), state);
  for (const patch of [{ name: '' }, { email: 'bad' }, { city: '' }, { phone: 'not-a-number' }, { bio: 'a'.repeat(2001) }]) {
    assert.ok(Object.keys(profileErrors({ ...profile, ...patch })).length);
    assert.equal(run(state, { type: 'profile', profile: { ...profile, ...patch } }), state);
  }
  const next = run(state, { type: 'profile', profile });
  assert.equal(next.profiles.artist.name, 'Aria Live');
  assert.equal(next.profiles.customer, state.profiles.customer);
  assert.equal(next.profiles.renter, state.profiles.renter);
  assert.equal(state.profiles.artist.name, 'Aria Nova');
});

test('partial drafts survive other role edits and published data changes only on valid save', () => {
  const original = initialDashboard(), listing = original.listings[0], key = `listing:${listing.id}`;
  let state = run(original, { type: 'draft', key, values: { ...listing, title: 'Unfinished edit', price: '' } });
  state = run(state, { type: 'draft', key: 'profile', values: { name: 'Customer draft' } }, 'customer');
  assert.equal(state.listings[0], listing);
  assert.equal(state.drafts[draftKey('artist', key)].price, '');
  state = run(state, { type: 'listing', listing: { ...listing, title: 'Finished edit' } });
  assert.equal(state.listings[0].title, 'Finished edit');
  assert.equal(state.drafts[draftKey('artist', key)], undefined);
  assert.equal(state.drafts['customer:profile'].name, 'Customer draft');
  state = run(state, { type: 'discard_draft', key: 'profile' });
  assert.ok(state.drafts['customer:profile']);
  state = run(state, { type: 'profile', profile: state.profiles.customer }, 'customer');
  assert.equal(state.drafts['customer:profile'], undefined);
});

test('listing writes, status and deletion are restricted to their provider, with validated price and quantity', () => {
  const state = initialDashboard(), listing = validListing();
  for (const actor of ['visitor', 'customer', 'renter', 'admin']) assert.equal(run(state, { type: 'listing', listing }, actor), state);
  for (const patch of [{ price: '-1' }, { price: '0' }, { price: '1.234' }, { price: '1000001' }, { quantity: '1.5' }, { quantity: '0' }, { description: 'too short' }, { status: 'maintenance' }]) {
    assert.ok(Object.keys(listingErrors({ ...listing, ...patch })).length);
    assert.equal(run(state, { type: 'listing', listing: { ...listing, ...patch } }), state);
  }
  let next = run(state, { type: 'listing', listing });
  assert.equal(next.listings.length, state.listings.length + 1);
  for (const actor of ['renter', 'admin', 'customer', 'visitor']) {
    assert.equal(run(next, { type: 'remove_listing', id: listing.id }, actor), next);
    assert.equal(run(next, { type: 'listing_status', id: listing.id, status: 'paused' }, actor), next);
  }
  next = run(next, { type: 'listing_status', id: listing.id, status: 'paused' });
  assert.equal(next.listings[0].status, 'paused');
  assert.equal(run(next, { type: 'listing', listing: { ...listing, id: 'EQ-001' } }), next);
  next = run(next, { type: 'remove_listing', id: listing.id });
  assert.deepEqual(next.listings, state.listings);
  const equipment = { ...state.listings[2], quantity: '12', status: 'maintenance' };
  assert.equal(run(state, { type: 'listing', listing: equipment }, 'renter').listings.find(item => item.id === equipment.id).quantity, '12');
});

test('favorites are customer scoped and toggle without mutating the initial session', () => {
  const state = initialDashboard();
  for (const actor of ['visitor', 'artist', 'renter', 'admin']) assert.equal(run(state, { type: 'favorite', id: 1 }, actor), state);
  for (const id of [0, -1, 1.5, NaN]) assert.equal(run(state, { type: 'favorite', id }, 'customer'), state);
  const next = run(state, { type: 'favorite', id: 1 }, 'customer');
  assert.deepEqual(next.savedArtists, [1]);
  assert.deepEqual(run(next, { type: 'favorite', id: 1 }, 'customer').savedArtists, []);
  assert.deepEqual(state.savedArtists, []);
});

test('portfolio media stays artist scoped, rejects duplicate IDs and keeps exactly one featured item', () => {
  const state = initialDashboard(), item = { id: 'MEDIA-NEW', caption: 'Rehearsal', src: 'blob:demo', type: 'image', fileName: 'demo.png', featured: true };
  for (const actor of ['visitor', 'customer', 'renter', 'admin']) assert.equal(run(state, { type: 'add_media', item }, actor), state);
  assert.equal(run(state, { type: 'add_media', item: { ...item, src: 'https://invalid.test/image' } }), state);
  let next = run(state, { type: 'add_media', item });
  assert.equal(next.media.at(-1).featured, false);
  assert.equal(run(next, { type: 'add_media', item }), next);
  next = run(next, { type: 'feature_media', id: item.id });
  assert.equal(next.media.filter(row => row.featured).length, 1);
  assert.equal(next.media.find(row => row.featured).id, item.id);
  assert.equal(run(next, { type: 'edit_media', id: item.id, caption: ' ' }), next);
  next = run(next, { type: 'edit_media', id: item.id, caption: '  Rehearsal night  ' });
  assert.equal(next.media.at(-1).caption, 'Rehearsal night');
  next = run(next, { type: 'remove_media', id: item.id });
  assert.equal(next.media.filter(row => row.featured).length, 1);
  assert.equal(state.media.length, 2);
});

test('verification requires admin, a reason, document review and a valid one-time decision', () => {
  const state = initialDashboard(), action = { type: 'decide_case', id: 'VRF-881', status: 'approved', reason: 'The sample documents match the submitted profile.', documentsReviewed: true };
  for (const actor of ['visitor', 'customer', 'artist', 'renter']) assert.equal(run(state, action, actor), state);
  for (const patch of [{ reason: 'short' }, { documentsReviewed: false }, { status: 'resolved' }]) assert.equal(run(state, { ...action, ...patch }, 'admin'), state);
  let next = run(state, { type: 'review_case', id: action.id }, 'admin');
  assert.equal(getCase(next).status, 'reviewing');
  next = run(next, { type: 'draft', key: `case:${action.id}`, values: { text: action.reason } }, 'admin');
  next = run(next, action, 'admin');
  assert.equal(getCase(next).status, 'approved'); assert.equal(getCase(next).notes[0].kind, 'decision');
  assert.equal(next.drafts[`admin:case:${action.id}`], undefined);
  assert.equal(run(next, { ...action, status: 'rejected' }, 'admin'), next);
  assert.equal(run(next, { type: 'reopen_case', id: action.id }, 'admin'), next);
  assert.equal(run(next, { type: 'case_note', id: action.id, text: 'Additional note after approval.', kind: 'reply' }, 'admin'), next);
});

test('support and disputes retain note types and resolution history when reopened', () => {
  for (const id of ['SUP-001', 'DSP-114']) {
    let state = initialDashboard();
    for (const kind of ['internal', 'reply']) state = run(state, { type: 'case_note', id, kind, text: `A ${kind} update on the proposed next steps.` }, 'admin');
    assert.deepEqual(getCase(state, id).notes.map(note => note.kind), ['internal', 'reply']);
    const action = { type: 'decide_case', id, status: 'resolved', reason: 'Both parties agreed on the next steps.' };
    assert.equal(run(state, { ...action, status: 'approved', documentsReviewed: true }, 'admin'), state);
    state = run(state, action, 'admin'); assert.equal(getCase(state, id).status, 'resolved');
    assert.equal(run(state, action, 'admin'), state);
    state = run(state, { type: 'reopen_case', id }, 'admin');
    assert.equal(getCase(state, id).status, 'reviewing'); assert.equal(getCase(state, id).notes.length, 3);
    assert.equal(getCase(state, id).bookingId, 'BK-2901');
  }
});

test('system controls are admin-only, logged and cleared by a fresh session', () => {
  const initial = initialDashboard(); let state = initial;
  const actions = [{ type: 'maintenance', enabled: true }, { type: 'announcement', text: 'A rehearsal update for the crew.' }, { type: 'system_action', command: 'cache' }, { type: 'system_action', command: 'sessions' }];
  for (const action of actions) {
    for (const actor of ['visitor', 'artist', 'customer', 'renter']) assert.equal(run(state, action, actor), state);
    state = run(state, action, 'admin');
  }
  assert.equal(state.maintenance, true); assert.equal(state.audit.length, 4);
  assert.equal(state.announcement, 'A rehearsal update for the crew.');
  assert.equal(state.listings, initial.listings); assert.equal(state.cases, initial.cases);
  assert.equal(run(state, { type: 'announcement', text: 'a'.repeat(501) }, 'admin'), state);
  assert.equal(run(state, { type: 'system_action', command: 'delete' }, 'admin'), state);
  assert.deepEqual(initialDashboard(), initial);
});
