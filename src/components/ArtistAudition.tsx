import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Headphones, LoaderCircle, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Modal } from './DashboardUI';
import { auditionMedia, clampSeek, clockLabel, previewLimit, reelLink, type MediaItem } from '../lib/portfolioMedia';
import { mediaFocus } from '../lib/mediaPlayback';
import '../audition.css';

type Playback = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export function AudioAudition({ item }: { item: MediaItem }) {
  const audio = useRef<HTMLAudioElement>(null), identity = useId(), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<Playback>('idle'), [position, setPosition] = useState(0), [duration, setDuration] = useState(item.duration ?? 30), [error, setError] = useState('');
  const limit = previewLimit(duration);
  const clearTimer = () => { if(timer.current)clearTimeout(timer.current);timer.current=null; };
  const stopAtLimit = () => { const el=audio.current;if(!el)return;clearTimer();el.pause();el.currentTime=limit;setPosition(limit);setState('ended');mediaFocus.release(identity); };
  const armLimit = () => { clearTimer();const el=audio.current;if(el&&!el.paused)timer.current=setTimeout(stopAtLimit,Math.max(0,(limit-el.currentTime)*1000)); };
  useEffect(() => {
    const el=audio.current!;
    const hide=()=>{if(document.hidden)el.pause();};document.addEventListener('visibilitychange',hide);
    return()=>{el.pause();if(timer.current)clearTimeout(timer.current);mediaFocus.release(identity);document.removeEventListener('visibilitychange',hide);};
  },[identity]);
  const play = () => {
    const el=audio.current!;setError('');
    if(!el.paused && state!=='error'){el.pause();mediaFocus.release(identity);return;}
    if(state==='error'){el.load();el.currentTime=0;setPosition(0);}
    if(el.currentTime>=limit-.01||state==='ended'){el.currentTime=0;setPosition(0);}
    mediaFocus.claim(identity,()=>el.pause());setState('loading');
    void el.play().then(()=>{if(!mediaFocus.owns(identity)){el.pause();return;}armLimit();}).catch((reason:unknown)=>{
      if(!mediaFocus.owns(identity))return;
      mediaFocus.release(identity);clearTimer();setState('error');setError(reason instanceof DOMException && reason.name==='NotAllowedError'?'Playback was blocked. Press Retry to start the preview.':'This audio could not be played. Try again or choose another track.');
    });
  };
  const seek = (value:number) => { const el=audio.current!;const next=clampSeek(value,duration);el.currentTime=next;setPosition(next);if(next>=limit){stopAtLimit();return;}if(el.paused)setState('paused');else armLimit(); };
  return <article className={`sl-audition-track sl-audition-${state}`} aria-label={`${item.caption} audio preview`}>
    <audio ref={audio} src={item.src} preload="metadata" onLoadedMetadata={e=>{const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>0)setDuration(d);}} onPlaying={()=>{if(mediaFocus.owns(identity)){setState('playing');armLimit();}else audio.current?.pause();}} onWaiting={()=>{clearTimer();if(!audio.current?.paused)setState('loading');}} onPause={()=>{clearTimer();setState(previous=>previous==='ended'||previous==='error'?previous:'paused');}} onTimeUpdate={e=>{if(e.currentTarget.currentTime>=limit)stopAtLimit();else setPosition(e.currentTarget.currentTime);}} onEnded={()=>{clearTimer();setPosition(limit);setState('ended');mediaFocus.release(identity);}} onError={()=>{clearTimer();mediaFocus.release(identity);setState('error');setError('This audio could not be loaded. Retry or choose another track.');}} />
    <div className="sl-audition-track-top"><button className="sl-audition-play" type="button" aria-label={`${state==='playing'?'Pause':state==='loading'?'Pause':state==='ended'?'Replay':state==='error'?'Retry':'Play'} ${item.caption}`} onClick={play}>{state==='playing'?<Pause size={19}/>:state==='loading'?<LoaderCircle size={19} className="sl-audition-spin"/>:state==='ended'||state==='error'?<RotateCcw size={19}/>:<Play size={19}/>}</button><div><span className="sl-audition-kicker">{item.demo?'DEMO INSTRUMENTAL':'ARTIST AUDIO'} / {clockLabel(limit)} PREVIEW</span><h3>{item.caption}</h3></div><span className="sl-audition-time">{clockLabel(position)} <small>/ {clockLabel(limit)}</small></span></div>
    <div className="sl-waveform-wrap"><svg className="sl-waveform" viewBox="0 0 640 64" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:64},(_,i)=>{const height=item.waveform ? Math.max(3,item.waveform[i]*54) : 7;return <rect key={i} x={i*10+1} y={(64-height)/2} width="6" height={height} rx="3" className={i/64<=position/limit?'heard':''}/>;})}</svg><input className="sl-audition-seek" type="range" aria-label={`Seek ${item.caption} preview`} aria-valuetext={`${clockLabel(position)} of ${clockLabel(limit)}`} min={0} max={limit} step="0.1" value={Math.min(position,limit)} disabled={state==='error'} onChange={e=>seek(Number(e.target.value))}/></div>
    <div className="sl-audition-track-foot"><span role="status">{state==='ended'?'Preview finished · replay anytime':state==='loading'?'Loading audio…':state==='playing'?'Playing preview':state==='paused'?'Paused':state==='error'?'Audio unavailable':'Press play to audition'}</span><span>{item.waveform?'Audio waveform':'Progress guide'} · use arrow keys to seek</span></div>
    {error&&<p role="alert" className="sl-audition-error">{error}</p>}
    {item.transcript&&<details className="sl-audition-transcript"><summary>Audio description / transcript</summary><p>{item.transcript}</p></details>}
  </article>;
}

export function PerformanceReel({ item, onClose }: { item: MediaItem; onClose:()=>void }) {
  const video=useRef<HTMLVideoElement>(null), identity=useId();
  const [loaded,setLoaded]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
  const external=item.type==='embed'?reelLink(item.src):null;
  useEffect(()=>{const el=video.current;return()=>{el?.pause();mediaFocus.release(identity);};},[identity]);
  const close=()=>{video.current?.pause();setLoaded(false);mediaFocus.release(identity);onClose();};
  return <Modal title={item.caption} onClose={close}><section className="sl-reel" aria-label="Performance reel player"><span className="sl-audition-kicker">{item.demo?'DEMO MOTION SAMPLE / NOT LIVE FOOTAGE':'ARTIST PERFORMANCE REEL'}</span>
    {external?<>{!loaded?<div className="sl-reel-stage"><Play size={40}/><h3>Watch on {external.provider}</h3><p>Load the embedded player to watch this artist’s reel.</p><button className="btn-primary" onClick={()=>{setError('');mediaFocus.claim(identity,()=>setLoaded(false));setLoaded(true);}}>Load {external.provider} video</button></div>:<><iframe className="sl-reel-video" title={`${item.caption} · ${external.provider}`} src={external.embed} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={()=>{setError('The embedded video could not load. Retry or open it on the provider.');setLoaded(false);}}/><button className="btn-ghost" onClick={()=>{setLoaded(false);setError('The provider may restrict this video or require sign-in. Retry the player or open the original video.');}}>Player not loading?</button></>}<a className="sl-audition-external" href={external.watch} target="_blank" rel="noopener noreferrer">Open on {external.provider}<ExternalLink size={14}/></a></>:item.type==='embed'?<p role="alert" className="sl-audition-error">This reel link is unavailable.</p>:<><video ref={video} className="sl-reel-video" src={item.src} controls playsInline preload="metadata" aria-label={`${item.caption} video`} onLoadedData={()=>{setReady(true);setError('');}} onPlay={()=>mediaFocus.claim(identity,()=>video.current?.pause())} onError={()=>setError('This reel could not be played. Try another file or retry.')} />{!ready&&!error&&<p role="status">Loading video…</p>}{error&&<button className="btn-ghost" onClick={()=>{setError('');setReady(false);video.current?.load();}}>Retry video</button>}</>}
    {error&&<p role="alert" className="sl-audition-error">{error}</p>}
    <p className="sl-audition-muted">{item.demo?'An existing StageLink animation used to demonstrate video playback. Upload your performance footage to replace this sample.':'Use the player controls for playback, volume, captions when available and fullscreen.'}</p>
    <details className="sl-audition-transcript"><summary>Video description / transcript</summary><p>{item.transcript||'No transcript supplied by the artist. Ask for an accessible alternative in booking chat.'}</p></details>
  </section></Modal>;
}
export default function ArtistAudition({media}:{media:MediaItem[]}) {
  const {audio,reels}=auditionMedia(media),[selected,setSelected]=useState<string|null>(null);
  const reel=reels.find(item=>item.id===selected);
  useEffect(()=>{if(selected&&!reel)setSelected(null);},[selected,reel]);
  return <section className="sl-audition" aria-label="Artist audio and performance reels"><header className="sl-audition-heading"><div><span className="sl-audition-kicker">BEFORE THE BOOKING / PRESS PLAY</span><h2>Hear the atmosphere.</h2><p>Audition a short track. Watch the performance behind the profile.</p></div><Headphones size={28}/></header>
    {audio.some(item=>item.demo)&&<p className="sl-audition-demo">Bundled instrumental demos · these are player samples, not recordings by this artist.</p>}
    <div className="sl-audition-tracks">{audio.map(item=><AudioAudition key={item.id+item.src} item={item}/>)}</div>
    <div className="sl-audition-reels">{reels.map(item=><article className="sl-reel-card" key={item.id}><div className="sl-reel-symbol"><Volume2 size={30}/><span>{item.demo?'DEMO / REEL':'LIVE / REEL'}</span></div><div><span className="sl-audition-kicker">{item.demo?'DEMO MOTION SAMPLE':item.type==='embed'?reelLink(item.src)?.provider:'ARTIST VIDEO'}</span><h3>{item.caption}</h3><p>{item.demo?'Video player demo · not live artist footage':'A closer look at the sound, stage and performance.'}</p><button type="button" className="btn-primary" onClick={e=>{e.currentTarget.focus();mediaFocus.pause();setSelected(item.id);}}><Play size={14}/>Watch {item.demo?'sample':'performance reel'}</button></div></article>)}</div>
    <p className="sl-audition-muted">Audio stops at 30 seconds or the track’s end. Only one preview plays at a time.</p>
    {reel&&<PerformanceReel key={reel.id} item={reel} onClose={()=>setSelected(null)}/>}
  </section>;
}
