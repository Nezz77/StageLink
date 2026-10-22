import test from 'node:test';
import assert from 'node:assert/strict';
import { reelLink, previewLimit, clampSeek, clockLabel, mediaError, uploadError, rmsWaveform, auditionMedia, demoAudio, demoReel } from '../src/lib/portfolioMedia.ts';
import { createMediaFocus } from '../src/lib/mediaPlayback.ts';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
const at='2026-10-22T12:00:00Z',run=(s,a,actor='artist')=>reduceDashboard(s,a,actor,at),track={id:'audio-one',caption:'Live acoustic demo',src:'blob:local-audio',type:'audio',fileName:'acoustic.mp3',featured:false,duration:44,waveform:Array(64).fill(.5),transcript:'Solo acoustic performance, no speech.'};
test('artist audio publishes with bounded waveform, duration and transcript; other roles cannot modify it',()=>{
 const s=initialDashboard();for(const actor of ['visitor','customer','renter','admin'])assert.equal(run(s,{type:'add_media',item:track},actor),s);
 const next=run(s,{type:'add_media',item:track});assert.equal(next.media.length,3);assert.equal(next.media.at(-1).type,'audio');assert.equal(next.media.at(-1).duration,44);
 assert.equal(run(next,{type:'add_media',item:track}),next);
 const edited=run(next,{type:'edit_media',id:track.id,caption:'New title',transcript:'Instrumental guitar.'});assert.equal(edited.media.at(-1).transcript,'Instrumental guitar.');assert.equal(run(next,{type:'edit_media',id:track.id,caption:'Good',transcript:'x'.repeat(2001)}),next);
});
test('media validation rejects unsafe sources, malformed duration, waveform and fake fixture claims',()=>{
 for(const change of [{src:'https://bad.test/recording.mp3'},{src:'javascript:alert(1)'},{duration:NaN},{duration:0},{duration:7201},{waveform:[.5]},{waveform:Array(64).fill(1.1)},{waveform:Array(64).fill(NaN)},{transcript:'x'.repeat(2001)},{demo:true}]){const item={...track,...change};assert.ok(mediaError(item));const s=initialDashboard();assert.equal(run(s,{type:'add_media',item}),s);}
 assert.equal(mediaError(track),'');assert.ok(mediaError({...track,type:'image'}));
});
test('YouTube and Vimeo links normalize to trusted non-autoplay embeds and reject deceptive hosts',()=>{
 const yt=reelLink('https://youtu.be/Abcdef123_-');assert.equal(yt.embed,'https://www.youtube-nocookie.com/embed/Abcdef123_-?autoplay=0&rel=0');assert.equal(reelLink('https://www.youtube.com/watch?v=Abcdef123_-&t=40').embed,yt.embed);assert.equal(reelLink(yt.embed).embed,yt.embed);
 const vi=reelLink('https://vimeo.com/123456789');assert.equal(vi.embed,'https://player.vimeo.com/video/123456789?autoplay=0');assert.equal(reelLink(vi.embed).embed,vi.embed);
 for(const url of ['http://youtu.be/Abcdef123_-','javascript:alert(1)','https://youtube.com.evil.test/watch?v=Abcdef123_-','https://www.youtube.com@evil.test/Abcdef123_-','https://vimeo.com/1234','https://vimeo.com/123456#bad','https://youtu.be/bad','https://youtube.com:8443/watch?v=Abcdef123_-'])assert.equal(reelLink(url),null,url);
 const s=initialDashboard();const next=run(s,{type:'add_media',item:{...track,waveform:undefined,type:'embed',src:yt.embed}});assert.equal(next.media.at(-1).src,yt.embed);assert.equal(run(s,{type:'add_media',item:{...track,waveform:undefined,type:'embed',src:'https://evil.test/embed'}}),s);
});
test('preview seeking is bounded at 30 seconds or shorter media length and never exceeds the audition',()=>{
 assert.equal(previewLimit(36),30);assert.equal(previewLimit(12.5),12.5);assert.equal(previewLimit(Infinity),30);assert.equal(clampSeek(50,36),30);assert.equal(clampSeek(20,12.5),12.5);assert.equal(clampSeek(-3,36),0);assert.equal(clampSeek(NaN,36),0);assert.equal(clockLabel(30),'0:30');assert.equal(clockLabel(65),'1:05');
});
test('shared playback ownership stops an earlier source and rejects late play completion ownership',()=>{
 const focus=createMediaFocus(),events=[];focus.claim('a',()=>events.push('a paused'));assert.ok(focus.owns('a'));focus.claim('b',()=>events.push('b paused'));assert.deepEqual(events,['a paused']);assert.equal(focus.owns('a'),false);focus.release('a');assert.ok(focus.owns('b'));focus.pause();assert.deepEqual(events,['a paused','b paused']);assert.equal(focus.owns('b'),false);focus.claim('video',()=>events.push('video paused'));focus.release('video');focus.pause();assert.deepEqual(events,['a paused','b paused']);
});
test('audio/video upload limits include valid formats, reject empty, excessive and unknown files',()=>{
 for(const type of ['audio/mpeg','audio/wav','audio/ogg','audio/mp4','video/mp4','video/webm','image/png'])assert.equal(uploadError({type,size:1024,name:'sample'}),'');
 for(const file of [{type:'text/html',size:1024},{type:'audio/mpeg',size:0},{type:'audio/wav',size:21*1024*1024},{type:'image/png',size:6*1024*1024}])assert.ok(uploadError({...file,name:'invalid'}));
});
test('actual sample amplitudes produce a normalized 64-bin waveform and silent sources remain silent',()=>{
 const samples=Float32Array.from({length:4096},(_,i)=>Math.sin(i/10)*(i<2048?.25:.75));const bars=rmsWaveform(samples);assert.equal(bars.length,64);assert.equal(Math.max(...bars),1);assert.ok(bars.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(bars[0]<bars[63]);assert.deepEqual(rmsWaveform(new Float32Array(64)),Array(64).fill(0));
});
test('public portfolio uses uploaded audio/reels and labels fallback samples honestly without changing saved gallery items',()=>{
 const initial=initialDashboard();const before=JSON.stringify(initial.media);assert.equal(auditionMedia(initial.media).audio,demoAudio);assert.deepEqual(auditionMedia(initial.media).reels,[demoReel]);assert.ok(demoAudio.every(m=>m.demo&&m.waveform.length===64));
 const own=[...initial.media,track,{...track,id:'own-video',type:'video',waveform:undefined,src:'blob:video'}];assert.deepEqual(auditionMedia(own).audio,[track]);assert.equal(auditionMedia(own).reels[0].id,'own-video');assert.equal(JSON.stringify(initial.media),before);
 const featured={...track,id:'featured-audio',featured:true};assert.equal(auditionMedia([...own,featured]).audio[0].id,'featured-audio');
 const removed=run(run(initial,{type:'add_media',item:track}),{type:'remove_media',id:track.id});assert.equal(auditionMedia(removed.media).audio,demoAudio);
});
