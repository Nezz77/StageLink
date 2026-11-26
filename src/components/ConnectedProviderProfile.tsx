import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { configuredSessionApi, type ApiAccount } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import { artistCategories, equipmentCategories, lkrToMinor, type ArtistDetails, type ProviderInput, type ProviderKind, type ProviderProfile, type RenterDetails } from '../lib/providerProfile';
import { Badge, Notice, Panel, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const statusLabels = {
  draft: 'Draft saved', pending: 'Under review', approved: 'Approved', rejected: 'Changes requested',
};

function providerInput(kind: ProviderKind, revision: number, values: FormData): ProviderInput {
  const get = (key: string) => String(values.get(key) ?? '').trim();
  const displayName = get('displayName');
  const city = get('city');
  const bio = get('bio');
  if (displayName.length < 2 || city.length < 2 || bio.length < 20) {
    throw Error('Use at least 2 characters for the name and city, and 20 characters for the biography.');
  }
  const latitude = get('latitude') === '' ? null : Number(get('latitude'));
  const longitude = get('longitude') === '' ? null : Number(get('longitude'));
  if ((latitude === null) !== (longitude === null)) throw Error('Enter both coordinates or leave them both blank.');

  let details: ArtistDetails | RenterDetails;
  if (kind === 'artist') {
    const genres = get('genres').split(',').map(value => value.trim()).filter(Boolean);
    if (!genres.length || genres.length > 8 || genres.some(genre => genre.length > 40) ||
        new Set(genres.map(genre => genre.toLowerCase())).size !== genres.length) {
      throw Error('Enter up to 8 different genres, each up to 40 characters.');
    }
    const category = artistCategories.find(value => value === get('category'));
    if (!category) throw Error('Choose an artist category.');
    details = { category, genres, experienceYears: Number(get('experience')), baseRateMinor: lkrToMinor(get('rate')), currency: 'LKR' };
  } else {
    const categories = equipmentCategories.filter(value => values.getAll('equipment').includes(value));
    if (!categories.length) throw Error('Choose at least one equipment category.');
    const operatingHours = days.map((label, day) => {
      const opens = get(`open${day}`) || null;
      const closes = get(`close${day}`) || null;
      if ((opens || closes) && (!opens || !closes || opens >= closes)) {
        throw Error(`${label}: enter opening and closing times in order, or leave both blank.`);
      }
      return { day, opens, closes };
    });
    const rentalTerms = get('terms');
    if (rentalTerms.length < 20) throw Error('Describe your rental terms in at least 20 characters.');
    details = { equipmentCategories: categories, operatingHours, rentalTerms, deliveryOffered: values.has('delivery') };
  }
  return { revision, displayName, bio, city, serviceRadiusKm: Number(get('radius')),
    address: get('address'), latitude, longitude, details };
}

export default function ConnectedProviderProfile({ kind, account }: { kind: ProviderKind; account: ApiAccount }) {
  const api = configuredSessionApi;
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<'save' | 'submit' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const guard = useDraftGuard(dirty, 'Save your provider profile or discard the unsaved changes before leaving.');
  const isArtist = kind === 'artist';
  const title = isArtist ? 'Public artist profile' : 'Public equipment provider profile';
  const artist = profile?.details && 'category' in profile.details ? profile.details : null;
  const renter = profile?.details && 'equipmentCategories' in profile.details ? profile.details : null;

  const apply = useCallback((value: ProviderProfile | null) => {
    setProfile(value);
    setLoaded(true);
    setDirty(false);
    setEditVersion(version => version + 1);
  }, []);
  const load = useCallback(async () => {
    if (!api || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const value = await api.providerProfile(kind, controller.signal);
      if (!controller.signal.aborted) apply(value);
    } catch (issue) {
      if (!controller.signal.aborted) setError(issue instanceof ApiError ? issue.message : 'The profile could not be loaded. Try again.');
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api, apply, kind]);

  useEffect(() => {
    void load();
    return () => { active.current?.abort(); active.current = null; };
  }, [load]);

  async function write(command: { action: 'save'; input: ProviderInput } | { action: 'submit'; revision: number }) {
    if (!api || active.current) return;
    const { action } = command;
    const controller = new AbortController();
    active.current = controller;
    setOperation(action);
    setError('');
    setNotice('');
    try {
      const saved = command.action === 'save'
        ? await api.saveProviderProfile(kind, command.input, controller.signal)
        : await api.submitProviderProfile(kind, command.revision, controller.signal);
      if (!saved) throw Error('StageLink did not return the saved profile.');
      if (controller.signal.aborted) return;
      apply(saved);
      setNotice(action === 'save' ? 'Draft saved to your account.' : 'Profile submitted for review.');
    } catch (issue) {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : 'The profile could not be updated.');
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setOperation(null);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !dirty) return;
    try {
      const input = providerInput(kind, profile?.revision ?? 0, new FormData(event.currentTarget));
      void write({ action: 'save', input });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Check the profile fields.');
    }
  }

  const canSubmit = profile && ['draft', 'rejected'].includes(profile.reviewStatus) && account.emailVerified && !dirty;
  return <div className="mg-page" aria-busy={loading || operation !== null}>
    <Panel title={title}>
      {profile && <Badge value={profile.reviewStatus}>{statusLabels[profile.reviewStatus]}</Badge>}
      {profile?.reviewReason && <Notice>{profile.reviewReason}</Notice>}
      {profile?.approvedRevision != null && profile.reviewStatus !== 'approved' &&
        <Notice>Your approved profile stays public while these changes are reviewed.</Notice>}
      <p>Save your details as a draft, then submit them for review. The address and coordinates stay private.</p>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      {loading && <p role="status">Loading your provider profile…</p>}
      {!loading && !loaded && <button className="btn-primary" onClick={() => void load()}>Retry loading profile</button>}
      {!loading && loaded && <form key={editVersion} onSubmit={save} onChange={() => { setDirty(true); setNotice(''); }}>
        <fieldset disabled={operation !== null} className="m-0 min-w-0 border-0 p-0">
          <div className="mg-fields">
            <label className="mg-field">Public name<input name="displayName" required minLength={2} maxLength={120} defaultValue={profile?.displayName ?? account.displayName} /></label>
            <label className="mg-field">City<input name="city" required minLength={2} maxLength={100} defaultValue={profile?.city} /></label>
            <label className="mg-field">Service radius (km)<input name="radius" type="number" required min={1} max={500} defaultValue={profile?.serviceRadiusKm ?? 25} /></label>
            <label className="mg-field">Private address<input name="address" maxLength={200} defaultValue={profile?.address} /></label>
            <label className="mg-field">Latitude<input name="latitude" type="number" min={-90} max={90} step="any" defaultValue={profile?.latitude ?? ''} /></label>
            <label className="mg-field">Longitude<input name="longitude" type="number" min={-180} max={180} step="any" defaultValue={profile?.longitude ?? ''} /></label>
          </div>
          <label className="mg-field">Public biography<textarea name="bio" required minLength={20} maxLength={2000} rows={4} defaultValue={profile?.bio} /></label>
          {isArtist ? <div className="mg-fields">
            <label className="mg-field">Artist category<select name="category" defaultValue={artist?.category ?? artistCategories[0]}>{artistCategories.map(category => <option key={category}>{category}</option>)}</select></label>
            <label className="mg-field">Genres (comma separated)<input name="genres" maxLength={327} required defaultValue={artist?.genres.join(', ')} /></label>
            <label className="mg-field">Years of experience<input name="experience" type="number" min={0} max={80} required defaultValue={artist?.experienceYears ?? 0} /></label>
            <label className="mg-field">Starting rate (LKR)<input name="rate" inputMode="decimal" maxLength={10} required defaultValue={artist ? (artist.baseRateMinor / 100).toFixed(2) : ''} /></label>
          </div> : <>
            <fieldset className="m-0 mb-5 min-w-0 border-0 p-0">
              <legend>Equipment categories</legend>
              <div className="flex flex-wrap gap-4 py-3">{equipmentCategories.map(category => <label key={category} className="flex items-center gap-2"><input type="checkbox" name="equipment" value={category} defaultChecked={renter?.equipmentCategories.includes(category)} />{category}</label>)}</div>
            </fieldset>
            <fieldset className="m-0 mb-5 min-w-0 border-0 p-0">
              <legend>Operating hours</legend>
              <p>Leave both times blank for closed days. Add at least one opening day before submitting.</p>
              {days.map((day, index) => <div className="mg-fields" key={day}>
                <label className="mg-field">{day} opens<input name={`open${index}`} type="time" defaultValue={renter?.operatingHours[index]?.opens ?? ''} /></label>
                <label className="mg-field">{day} closes<input name={`close${index}`} type="time" defaultValue={renter?.operatingHours[index]?.closes ?? ''} /></label>
              </div>)}
            </fieldset>
            <label className="mg-field">Rental terms<textarea name="terms" required minLength={20} maxLength={2000} rows={4} defaultValue={renter?.rentalTerms} /></label>
            <label className="flex items-center gap-2"><input name="delivery" type="checkbox" defaultChecked={renter?.deliveryOffered} />Delivery offered</label>
          </>}
        </fieldset>
        <div className="mg-actions">
          <button className="btn-primary" disabled={operation !== null || !dirty}>{operation === 'save' ? 'Saving…' : 'Save draft'}</button>
          <button className="btn-ghost" type="button" disabled={operation !== null || !canSubmit} onClick={() => {
            if (canSubmit) void write({ action: 'submit', revision: profile.revision });
          }}>{operation === 'submit' ? 'Submitting…' : 'Submit for review'}</button>
          <button className="btn-ghost" type="button" disabled={operation !== null} onClick={() => requestDashboardNavigation(() => { void load(); })}>Reload latest profile</button>
        </div>
        {!account.emailVerified && <Notice>Verify your email before submitting your profile for review.</Notice>}
      </form>}
    </Panel>
    {guard}
  </div>;
}
