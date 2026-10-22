import { demoWaveforms } from './demoWaveforms.ts';
export type MediaItem = { id: string; caption: string; src: string; type: 'image' | 'video' | 'audio' | 'embed'; fileName: string; featured: boolean; duration?: number; waveform?: number[]; transcript?: string; demo?: boolean };
export const PREVIEW_SECONDS = 30;
export const previewLimit = (duration: number) => Number.isFinite(duration) && duration > 0 ? Math.min(PREVIEW_SECONDS, duration) : PREVIEW_SECONDS;
export const clampSeek = (seconds: number, duration: number) => Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, previewLimit(duration))) : 0;
export const clockLabel = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds)) % 60).padStart(2, '0')}`;
export function reelLink(raw: string): { embed: string; watch: string; provider: 'YouTube' | 'Vimeo' } | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
    const host = url.hostname.toLowerCase(); let id = '';
    if (['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be'].includes(host)) {
      id = host === 'youtu.be' ? url.pathname.slice(1) : url.pathname === '/watch' ? url.searchParams.get('v') ?? '' : /\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? '';
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? { embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`, watch: `https://www.youtube.com/watch?v=${id}`, provider: 'YouTube' } : null;
    }
    if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)) {
      id = /^\/(?:video\/)?(\d{5,12})\/?$/.exec(url.pathname)?.[1] ?? '';
      return id ? { embed: `https://player.vimeo.com/video/${id}?autoplay=0`, watch: `https://vimeo.com/${id}`, provider: 'Vimeo' } : null;
    }
  } catch { /* invalid or unsupported link */ }
  return null;
}
export function mediaError(item: MediaItem): string {
  if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(item.id)) return 'Choose a valid media ID.';
  if (typeof item.caption !== 'string' || item.caption.trim().length < 1 || item.caption.length > 160) return 'Add a caption with 1–160 characters.';
  if (typeof item.fileName !== 'string' || item.fileName.length > 200 || !['image','video','audio','embed'].includes(item.type)) return 'Choose a supported media file.';
  if (typeof item.src !== 'string' || (item.type === 'embed' ? reelLink(item.src)?.embed !== item.src : !item.src.startsWith('blob:'))) return 'Use a local upload or supported YouTube/Vimeo link.';
  if (item.demo !== undefined) return 'Demo fixtures cannot be submitted as artist uploads.';
  if (item.duration !== undefined && (!Number.isFinite(item.duration) || item.duration <= 0 || item.duration > 7200)) return 'Media must be no longer than two hours.';
  if (item.waveform !== undefined && (item.type !== 'audio' || !Array.isArray(item.waveform) || item.waveform.length !== 64 || item.waveform.some(v => !Number.isFinite(v) || v < 0 || v > 1))) return 'Audio waveform could not be read.';
  if (item.transcript !== undefined && (typeof item.transcript !== 'string' || item.transcript.length > 2000)) return 'Keep the transcript under 2,000 characters.';
  return '';
}
export function uploadError(file: { type: string; size: number; name: string }): string {
  const image = ['image/jpeg','image/png','image/webp'].includes(file.type), audio = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/x-m4a'].includes(file.type), video = ['video/mp4','video/webm'].includes(file.type);
  return !image && !audio && !video || !Number.isFinite(file.size) || file.size <= 0 || file.size > (image ? 5 : 20) * 1024 * 1024 ? `${file.name}: use JPG/PNG/WebP up to 5 MB, or MP3/WAV/OGG/M4A/MP4/WebM up to 20 MB.` : '';
}
export const demoAudio: MediaItem[] = [
  { id:'DEMO-WARM-KEYS', caption:'Warm Keys', src:'/audition/warm-keys.mp3', type:'audio', fileName:'warm-keys.mp3', featured:false, duration:36, waveform:demoWaveforms['warm-keys'], transcript:'Instrumental sample: softly layered keyboard chords, bass and a repeating melody at 88 BPM. No speech or lyrics.', demo:true },
  { id:'DEMO-AFTER-HOURS', caption:'After Hours', src:'/audition/after-hours.mp3', type:'audio', fileName:'after-hours.mp3', featured:false, duration:36, waveform:demoWaveforms['after-hours'], transcript:'Instrumental sample: a brighter keyboard groove with bass and a repeating melody at 108 BPM. No speech or lyrics.', demo:true },
];
export const demoReel: MediaItem = { id:'DEMO-REEL', caption:'StageLink motion sample', src:'/Stage-Link-Background.mp4', type:'video', fileName:'Stage-Link-Background.mp4', featured:false, demo:true, transcript:'Existing StageLink animated brand background. This is a motion sample for the reel player, not live artist footage.' };
export const auditionMedia = (media: MediaItem[]) => ({ audio: media.some(m => m.type === 'audio') ? media.filter(m => m.type === 'audio').sort((a,b)=>Number(b.featured)-Number(a.featured)) : demoAudio, reels: media.some(m => m.type === 'video' || m.type === 'embed') ? media.filter(m => m.type === 'video' || m.type === 'embed').sort((a,b)=>Number(b.featured)-Number(a.featured)) : [demoReel] });
export function rmsWaveform(samples: Float32Array, bins = 64): number[] {
  if (!samples.length) return Array(bins).fill(0);
  const width=Math.max(1,Math.floor(samples.length/bins)), values=Array.from({length:bins},(_,i)=>{let sum=0,count=0;for(let j=i*width;j<Math.min(samples.length,(i+1)*width);j+=16){sum+=samples[j]*samples[j];count++;}return count?Math.sqrt(sum/count):0;});const peak=Math.max(...values);return values.map(v=>peak?v/peak:0);
}
