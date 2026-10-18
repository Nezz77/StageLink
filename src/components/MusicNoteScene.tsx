'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Instance, Instances, ScrollControls, useScroll, useGLTF, View, type PositionMesh } from '@react-three/drei';
import { Object3D, type InstancedMesh, type Mesh } from 'three';
import { StillMusicNotes } from './MusicNoteField';

// Keep the document as the only scroll surface. Drei's hidden scroll area mirrors
// it; it never captures wheel, touch, keyboard focus or card interactions.
function DocumentScroll() {
  const scroll = useScroll();
  useEffect(() => {
    const sync = () => {
      const length = Math.max(1, document.documentElement.scrollHeight - innerHeight - 140);
      const progress = Math.max(0, Math.min(1, (window.scrollY - 140) / length));
      scroll.el.scrollTop = progress * (scroll.el.scrollHeight - scroll.el.clientHeight);
    };
    scroll.el.tabIndex = -1;
    scroll.el.setAttribute('aria-hidden', 'true');
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(sync); });
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    const resize = new ResizeObserver(sync); resize.observe(document.body);
    return () => {
      cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); resize.disconnect();
      window.removeEventListener('scroll', sync); window.removeEventListener('resize', sync);
    };
  }, [scroll]);
  // A lazy-loaded scene can mount after a large scroll jump. Re-dispatch the
  // mirrored position until Drei has attached its listener and caught up.
  useFrame(() => {
    const length = Math.max(1, document.documentElement.scrollHeight - innerHeight - 140);
    const progress = Math.max(0, Math.min(1, (window.scrollY - 140) / length));
    const target = progress * (scroll.el.scrollHeight - scroll.el.clientHeight);
    if (Math.abs(scroll.el.scrollTop - target) > .5) scroll.el.scrollTop = target;
    if (Math.abs(scroll.offset - progress) > .001) scroll.el.dispatchEvent(new Event('scroll'));
  }, -1);
  useFrame(({ gl }) => { gl.setScissorTest(false); gl.setClearColor(0x000000, 0); gl.clear(true, true, true); }, .5);
  return null;
}

function FloatingNote({ index, count }: { index: number; count: number }) {
  const note = useRef<PositionMesh>(null);
  const scroll = useScroll();
  const { viewport } = useThree();
  const seed = (index * .61803398875) % 1;
  useFrame(() => {
    if (!note.current) return;
    const progress = scroll.offset;
    const y = 9 - Math.floor(index / 2) / (count / 2 - 1) * 40;
    const angle = y * .67 + index % 2 * Math.PI + progress * Math.PI * 4;
    // A narrow pair of strands follows one shared, gently bending route.
    const route = Math.sin(y * .24 + progress * .8) * viewport.width * .24;
    const radius = viewport.width * .055;
    note.current.position.set(route + Math.sin(angle) * radius, y, Math.cos(angle) * 2.4);
    note.current.rotation.set(Math.sin(progress * 3 + seed) * .35, Math.sin(progress * 4 + seed * 2) * .65, Math.sin(progress * 3 + seed) * .3);
  });
  return <Instance ref={note} scale={index % 4 > 1 ? .5 : .56} />;
}

const noteKinds = ['Quarter', 'Eighth', 'BeamedEighth', 'BeamedSixteenth'] as const;
function Notes({ count, isDark }: { count: number; isDark: boolean }) {
  const model = useGLTF('/models/music-note-collection.glb');
  return <>{noteKinds.map((kind, variant) => {
    const indices = Array.from({ length: count }, (_, i) => i).filter(i => i % noteKinds.length === variant);
    return <Instances key={kind} limit={24} range={indices.length} geometry={(model.nodes[kind] as Mesh).geometry} frustumCulled={false}>
      <meshPhysicalMaterial color={isDark ? '#f0eaff' : '#76609b'} metalness={.3} roughness={.23} clearcoat={1} transparent opacity={isDark ? .64 : .56} depthWrite={false} />
      {indices.map(i => <FloatingNote key={i} index={i} count={count} />)}
    </Instances>;
  })}</>;
}

/** Depth-only surfaces track the HTML: z < 0 notes are hidden by cards, z > 0
 * notes cross in front. No painted planes, duplicate UI, or pointer interception. */
function HtmlDepthSurfaces() {
  const mesh = useRef<InstancedMesh>(null);
  const elements = useRef<HTMLElement[]>([]);
  const transform = useRef(new Object3D());
  const scroll = useScroll();
  useEffect(() => { elements.current = Array.from(document.querySelectorAll('.ps-card, .landing-page h1, .landing-page h2')); }, []);
  useFrame(({ camera, viewport, size, gl }) => {
    camera.position.y = -scroll.offset * 24;
    camera.updateMatrixWorld();
    const screen = viewport.getCurrentViewport(camera, [0, camera.position.y, 0]);
    if (!mesh.current) return;
    let visible = 0;
    for (const element of elements.current) {
      const r = element.getBoundingClientRect();
      if (visible >= 24 || r.bottom < 0 || r.top > size.height || r.right < 0 || r.left > size.width || getComputedStyle(element).visibility === 'hidden') continue;
      const t = transform.current;
      t.position.set(((r.left + r.width / 2) / size.width - .5) * screen.width, camera.position.y + (.5 - (r.top + r.height / 2) / size.height) * screen.height, 0);
      t.scale.set(r.width / size.width * screen.width, r.height / size.height * screen.height, 1);
      t.updateMatrix(); mesh.current.setMatrixAt(visible++, t.matrix);
    }
    mesh.current.count = visible; mesh.current.instanceMatrix.needsUpdate = true;
    const canvas = gl.domElement;
    canvas.dataset.scrollProgress = scroll.offset.toFixed(5);
    canvas.dataset.cameraY = camera.position.y.toFixed(5);
    canvas.dataset.depthSurfaces = String(visible);
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 24]} renderOrder={-10} frustumCulled={false}>
    <planeGeometry /><meshBasicMaterial colorWrite={false} depthWrite />
  </instancedMesh>;
}

export default function MusicNoteScene({ isDark, active }: { isDark: boolean; active: boolean }) {
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && innerWidth < 768);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const host = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const query = matchMedia('(max-width: 767px)');
    const update = () => setSmall(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const element = canvas.current;
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
    element?.addEventListener('webglcontextlost', lost);
    return () => element?.removeEventListener('webglcontextlost', lost);
  }, [ready]);
  if (failed) return <StillMusicNotes />;
  return <div ref={host} className="dna-canvas" data-dna-ready={ready} data-note-count={small ? 64 : 96} data-note-variants={noteKinds.join(",")}>
    <Canvas flat camera={{ position: [0, 0, 12], fov: 45, near: .1, far: 60 }} dpr={[1, small ? 1 : 1.5]} frameloop={active ? 'always' : 'demand'} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<StillMusicNotes />} onCreated={({ gl }) => { canvas.current = gl.domElement; setReady(true); }}>
      <ScrollControls pages={2} damping={.12} style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <DocumentScroll />
        <View track={host}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[3, 5, 6]} intensity={2.8} color="#f4edff" />
          <HtmlDepthSurfaces />
          <Suspense fallback={null}><Notes count={small ? 64 : 96} isDark={isDark} /></Suspense>
        </View>
      </ScrollControls>
    </Canvas>
  </div>;
}
