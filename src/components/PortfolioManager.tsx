import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Play, Star, Trash2, Upload } from 'lucide-react';
import { useDashboard } from '../lib/DashboardContext';
import { DashboardIntro } from './DashboardShell';
import ConfirmDialog from './ConfirmDialog';
import { Badge, Empty, Modal, Notice, Panel } from './DashboardUI';

export default function PortfolioManager() {
  const { state, dispatch } = useDashboard();
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null), [remove, setRemove] = useState<string | null>(null);
  const [caption, setCaption] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false);
  const item = state.media.find(item => item.id === selected);
  const upload = async (files: File[]) => {
    setError(''); setNotice('');
    if (state.media.length + files.length > 30) { setError('Keep up to 30 portfolio items. Remove an item before adding more.'); return; }
    const invalid = files.find(file => !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type) || !file.size || file.size > (file.type.startsWith('image/') ? 5 : 20) * 1024 * 1024);
    if (invalid) { setError(`${invalid.name}: choose JPG, PNG or WebP up to 5 MB, or MP4/WebM up to 20 MB.`); return; }
    setLoading(true); let added = 0;
    for (const file of files) {
      const src = URL.createObjectURL(file);
      try {
        if (file.type.startsWith('image/')) { const image = new Image(); image.src = src; await image.decode(); }
        const accepted = dispatch({ type: 'add_media', item: { id: crypto.randomUUID(), src, type: file.type.startsWith('video/') ? 'video' : 'image', caption: file.name.slice(0, 160), fileName: file.name, featured: false } });
        if (accepted) added++; else URL.revokeObjectURL(src);
      } catch { URL.revokeObjectURL(src); setError(`${file.name} could not be read. Choose a valid image file.`); }
    }
    setLoading(false); if (added) setNotice(`${added} portfolio ${added === 1 ? 'item' : 'items'} added for this session.`);
  };
  return <div className="mg-page"><DashboardIntro eyebrow="LET YOUR WORK TAKE THE STAGE" title="Moments worth" emphasis="showing." description="Your photos, reels and performances, collected in one place." action={<button className="btn-primary" disabled={loading} onClick={() => input.current?.click()}>{loading ? <LoaderCircle className="mg-spin" size={16} /> : <Upload size={16} />}{loading ? 'Adding media…' : 'Upload media'}</button>} />
    <input ref={input} hidden type="file" multiple aria-label="Choose portfolio files" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(files); }} />
    <Notice>{notice}</Notice><Notice error>{error}</Notice>
    <Panel title="Your visual signature" eyebrow={`${state.media.length}/30 ITEMS · SESSION PORTFOLIO`}><p className="mg-muted">Images up to 5 MB · videos up to 20 MB. Files stay in this demo tab and clear on refresh.</p><div className="mg-media-grid">{[...state.media].sort((a, b) => Number(b.featured) - Number(a.featured)).map((item, index) => <article className={`mg-media-card mg-media-${index % 3}`} key={item.id}><button className="mg-media-preview" aria-label={`Preview ${item.caption}`} onClick={() => { setSelected(item.id); setCaption(item.caption); setError(''); }}>{item.type === 'image' ? <img src={item.src} alt={item.caption} /> : <><video src={item.src} preload="metadata" muted /><Play size={32} /></>}{item.featured && <Badge value="live">Featured</Badge>}</button><div><h3>{item.caption}</h3><div className="mg-actions"><button className="btn-ghost" aria-label={`Feature ${item.caption}`} disabled={item.featured} onClick={() => dispatch({ type: 'feature_media', id: item.id })}><Star size={14} />{item.featured ? 'Featured' : 'Feature'}</button><button className="mg-icon" aria-label={`Remove ${item.caption}`} onClick={() => setRemove(item.id)}><Trash2 size={16} /></button></div></div></article>)}<button className="mg-upload-tile" disabled={loading} onClick={() => input.current?.click()}><ImagePlus size={32} /><strong>Add your next moment</strong><span>Choose photos or videos</span></button></div>
      {!state.media.length && <Empty title="Your story starts here.">Upload your first performance photo or demo reel.</Empty>}
    </Panel>
    {item && <Modal title="Portfolio preview" onClose={() => setSelected(null)}>{item.type === 'video' ? <video className="mg-full-media" src={item.src} controls /> : <img className="mg-full-media" src={item.src} alt={item.caption} />}<form onSubmit={event => { event.preventDefault(); if (dispatch({ type: 'edit_media', id: item.id, caption })) { setSelected(null); setNotice('Portfolio caption updated.'); } else setError('Add a caption with 1–160 characters.'); }}><label className="mg-field">Caption<input value={caption} maxLength={160} onChange={event => setCaption(event.target.value)} required /></label><Notice error>{error}</Notice><button className="btn-primary">Save caption</button></form></Modal>}
    {remove && <ConfirmDialog title="Remove this portfolio item?" confirm="Remove media" onClose={() => setRemove(null)} onConfirm={() => { dispatch({ type: 'remove_media', id: remove }); setRemove(null); }}>The item is removed from this demo portfolio. Your original file stays on your device.</ConfirmDialog>}
  </div>;
}
