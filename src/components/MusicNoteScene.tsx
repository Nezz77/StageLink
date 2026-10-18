'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Instance, Instances, ScrollControls, useScroll, useGLTF, View, type PositionMesh } from '@react-three/drei';
import { CatmullRomCurve3, Object3D, Vector3, type InstancedMesh, type Mesh } from 'three';
import { StillMusicNotes } from './MusicNoteField';

// The document is the sole scroll source. Feed its progress into Drei before
// updating the scene, rather than depending on synthetic nested-scroll events.
function DocumentScroll() {
  const scroll = useScroll();
  const position = useRef<number | null>(null);
  useEffect(() => {
    scroll.el.tabIndex = -1;
    scroll.el.setAttribute('aria-hidden', 'true');
  }, [scroll]);
  useFrame((_, delta) => {
    const length = Math.max(1, document.documentElement.scrollHeight - innerHeight - 140);
    const target = Math.max(0, Math.min(1, (window.scrollY - 140) / length));
    const previous = position.current;
    const next = previous === null ? target : previous + (target - previous) * (1 - Math.exp(-30 * Math.min(delta, .1)));
    position.current = Math.abs(target - next) < .00001 ? target : next;
    scroll.offset = position.current;
    scroll.delta = previous === null ? 0 : Math.abs(scroll.offset - previous);
  }, .1);
  useFrame(({ gl }) => { gl.setScissorTest(false); gl.setClearColor(0x000000, 0); gl.clear(true, true, true); }, .5);
  return null;
}

// Use layout coordinates, not animated bounding boxes, so the route stays put
// while headings reveal and the pricing cards spread or tilt.
function documentTop(element: HTMLElement | null, fallback: number) {
  if (!element) return fallback;
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}

function createQueuePath(width: number, height: number) {
  const headings = Array.from(document.querySelectorAll<HTMLElement>('.landing-page h2'));
  const artist = headings[0]?.closest('section') ?? null;
  const cards = document.querySelector<HTMLElement>('.mc-viewport');
  const title = document.querySelector<HTMLElement>('#pricing-showcase-title');
  const artistTop = documentTop(artist, height * 1.8);
  const artistBottom = artistTop + (artist?.offsetHeight ?? height);
  const cardTop = documentTop(cards, artistBottom + height * .5);
  const cardHeight = cards?.offsetHeight ?? height * .7;
  const titleTop = documentTop(title, cardTop - height * .3);
  const joinTop = documentTop(headings.at(-1) ?? null, cardTop + cardHeight + height * .5);
  const end = Math.max(joinTop + height * .22, document.documentElement.scrollHeight - height * .45);
  const hero = 140 + height * .58;
  // An authored, asymmetric route: broad sweeps and a small curl at the title.
  // Only a short train occupies it; the rest of the path is never drawn.
  const knots = [
    [.26, hero], [.60, hero - height * .08], [.79, hero + height * .12],
    [.76, artistTop - height * .12], [.40, artistTop + height * .02],
    [.18, artistTop + height * .24], [.30, artistBottom - height * .16],
    [.66, artistBottom - height * .06], [.83, titleTop - height * .10],
    [.66, titleTop + height * .14], [.46, titleTop + height * .04],
    [.50, titleTop - height * .07], [.72, titleTop + height * .16],
    [.84, cardTop + cardHeight * .28], [.65, cardTop + cardHeight * .55],
    [.32, cardTop + cardHeight * .58], [.18, cardTop + cardHeight * .84],
    [.40, cardTop + cardHeight + height * .14], [.78, joinTop - height * .12],
    [.78, joinTop + height * .18], [.46, end],
  ];
  const path = new CatmullRomCurve3(knots.map(([x, y]) => new Vector3(x * width, y, 0)), false, 'centripetal');
  path.arcLengthDivisions = 1024;
  return { path, length: path.getLength(), width, height, spacing: Math.min(44, Math.max(28, width * .035)) };
}

function FloatingNote({ index, count, route }: { index: number; count: number; route: ReturnType<typeof createQueuePath> }) {
  const note = useRef<PositionMesh>(null);
  const point = useRef(new Vector3());
  const scroll = useScroll();
  const seed = (index * .61803398875) % 1;
  useFrame(({ camera, viewport, size }) => {
    if (!note.current) return;
    const progress = scroll.offset;
    const trainLength = (count - 1) * route.spacing;
    const distance = progress * (route.length - trainLength) + index * route.spacing;
    route.path.getPointAt(distance / route.length, point.current);
    const z = Math.sin(distance / Math.max(100, trainLength * .8) * Math.PI * 2) * 1.2;
    const screen = viewport.getCurrentViewport(camera, [0, camera.position.y, 0], size);
    const documentScroll = 140 + progress * Math.max(1, document.documentElement.scrollHeight - innerHeight - 140);
    // Perspective compensation keeps every note on the same clean screen-space
    // curve while its depth changes from behind the HTML to in front of it.
    const perspective = (camera.position.z - z) / camera.position.z;
    note.current.position.set(
      (point.current.x / route.width - .5) * screen.width * perspective,
      camera.position.y + (.5 - (point.current.y - documentScroll) / route.height) * screen.height * perspective,
      z,
    );
    note.current.rotation.set(Math.sin(progress * 3 + seed) * .25, Math.sin(progress * 4 + seed * 2) * .45, Math.sin(progress * 3 + seed) * .22);
  }, .2);
  return <Instance ref={note} scale={(index % 4 > 1 ? .34 : .38) * (count < 16 ? .85 : 1)} />;
}

const noteKinds = ['Quarter', 'Eighth', 'BeamedEighth', 'BeamedSixteenth'] as const;
function Notes({ count, isDark }: { count: number; isDark: boolean }) {
  const model = useGLTF('/models/music-note-collection.glb');
  const { size } = useThree();
  const [layoutRevision, setLayoutRevision] = useState(0);
  useEffect(() => {
    const update = () => setLayoutRevision(value => value + 1);
    const observer = new ResizeObserver(update);
    const page = document.querySelector('.landing-page');
    if (page) observer.observe(page);
    document.fonts.addEventListener('loadingdone', update);
    return () => { observer.disconnect(); document.fonts.removeEventListener('loadingdone', update); };
  }, []);
  const route = useMemo(() => createQueuePath(size.width, size.height), [size.width, size.height, layoutRevision]);
  return <>{noteKinds.map((kind, variant) => {
    const indices = Array.from({ length: count }, (_, i) => i).filter(i => i % noteKinds.length === variant);
    return <Instances key={kind} limit={4} range={indices.length} geometry={(model.nodes[kind] as Mesh).geometry} frustumCulled={false}>
      <meshPhysicalMaterial color={isDark ? '#f0eaff' : '#76609b'} metalness={.3} roughness={.23} clearcoat={1} transparent opacity={isDark ? .64 : .56} depthWrite={false} />
      {indices.map(i => <FloatingNote key={i} index={i} count={count} route={route} />)}
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
  useEffect(() => { elements.current = Array.from(document.querySelectorAll('.ps-card, .landing-page h1, .landing-page h2, .landing-page .group, .landing-page .card')); }, []);
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
  }, .2);
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
  return <div ref={host} className="dna-canvas" data-dna-ready={ready} data-note-count={small ? 8 : 16} data-note-variants={noteKinds.join(",")}>
    <Canvas flat camera={{ position: [0, 0, 12], fov: 45, near: .1, far: 60 }} dpr={[1, small ? 1 : 1.5]} frameloop={active ? 'always' : 'demand'} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<StillMusicNotes />} onCreated={({ gl }) => { canvas.current = gl.domElement; setReady(true); }}>
      <ScrollControls pages={1} enabled={false} damping={0} style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <DocumentScroll />
        <View track={host}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[3, 5, 6]} intensity={2.8} color="#f4edff" />
          <HtmlDepthSurfaces />
          <Suspense fallback={null}><Notes count={small ? 8 : 16} isDark={isDark} /></Suspense>
        </View>
      </ScrollControls>
    </Canvas>
  </div>;
}
