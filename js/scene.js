/* ============================================================
   3D tunnel of the 5 CEROL marks, in liquid chrome.
   The camera travels through them tied to the whole page scroll.
   See PLANO-SITE.md §5 for the spec this file implements.
   ============================================================ */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = innerWidth < 768;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
/* site inverted to white: the canvas clears to the light page colour and the
   fog recedes marks into white instead of black (studio env stays dark so the
   chrome keeps dark reflections and reads as a metal object against white) */
renderer.setClearColor(0xf5f4f0, 1);

const scene = new THREE.Scene();
/* fog tuned for plane separation: the mark of the moment sits ~6.5 units
   out (barely fogged, stays chrome), while the NEXT mark 9+ units beyond
   recedes into the light instead of competing for the frame */
scene.fog = new THREE.FogExp2(0xf5f4f0, 0.05);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

/* ---- monochrome studio environment -> liquid chrome reflections ----
   These marks are flat extruded logos, not spheres: low curvature means a
   single small hotspot only catches light at some rotation angles and goes
   dark at others (measured: brightness swung 20-212 across a rotation, an
   unacceptable flicker on a mesh that spins continuously). The fix is broad
   coverage: several medium panels around the front hemisphere so the face
   always catches decent light at any angle, still with a brighter top panel
   for a believable vertical chrome gradient (measured stable range: 111-203). */
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x050505);
function panel(v, x, y, z, w, h) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v) })
  );
  m.position.set(x, y, z);
  m.lookAt(0, 0, 0);
  envScene.add(m);
}
panel(3.2, 0, 8, 10, 18, 14);   // top front, bright
panel(2.2, 9, -2, 6, 14, 18);   // right front, medium
panel(2.2, -9, -2, 6, 14, 18);  // left front, medium
panel(1.4, 0, -8, 8, 16, 12);   // bottom front, dimmer
panel(0.6, 0, 0, -30, 24, 24);  // back fill, dim
scene.environment = pmrem.fromScene(envScene, 0.28).texture;
envScene.background = null;

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 0.3);
key.position.set(1, 3, 6);
scene.add(key);

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 1, roughness: 0.1,
  clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.5
});

/* ---- the marks, extruded smooth (never faceted) ----
   void = hero; sun/urchin align to the 2 chapter interstitials
   (The work / Selected work). creature and scribble dropped as the Solvefy
   and Brand-and-art chapters folded into the single Selected work list. */
const SYMBOLS = ['Asset 3', 'sun', 'urchin'];
const GAP = 21; // 50% more distance
/* the craft sphere's sticky stage is opaque, so the urchin's flyby is pulled
   forward (z -33 instead of -42) to peak in the transparent craft-statement
   band right before that section swallows the view */
const Z_POS = [0, -GAP, -33];
const OFFSET = [
  [0, 0],        // void: hero, centred
  [-1.7, 0.7],   // sun
  [1.8, -0.6],   // urchin
  [-1.6, -0.7],  // scribble
  [1.7, 0.65],   // creature
];
const forms = [];
const loader = new SVGLoader();

function addForm(data, index) {
  const shapes = [];
  data.paths.forEach(p => SVGLoader.createShapes(p).forEach(s => shapes.push(s)));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 14, bevelEnabled: true, bevelThickness: 4, bevelSize: 3,
    bevelSegments: 16, curveSegments: 72
  });
  geo.center();
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  /* travelling marks must be monumental when they cross the camera
     (AIR reference): ~70% of frame height at the window centre;
     bigger than that and you are inside blown-white geometry */
  const targetWidth = index === 0 ? 2.34 : 3.42;
  const fit = targetWidth / Math.max(size.x, size.y);

  /* big close-up faces reflect the whole bright studio and flash white;
     travelling marks get a slightly dimmer clone of the chrome so they
     keep their gradient at flyby distance (hero keeps the original) */
  const mat = index === 0 ? chrome : chrome.clone();
  if (index !== 0) mat.envMapIntensity = 1.15;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(fit, -fit, fit); // flip Y, SVG is y-down
  mesh.position.set(OFFSET[index][0], OFFSET[index][1], Z_POS[index] ?? -index * GAP);
  mesh.userData.spin = 0.08 + index * 0.02;
  mesh.userData.floatSeed = index * 1.7;
  mesh.userData.baseY = OFFSET[index][1];
  forms[index] = mesh;
  scene.add(mesh);
}
let loadedCount = 0;
SYMBOLS.forEach((name, i) => loader.load(`assets/cerol/${name}.svg`, d => {
  addForm(d, i);
  loadedCount++;
  if (loadedCount === SYMBOLS.length) window.__meshesReady = true;
}));
/* safety net: never let the loader hang forever if an asset fails */
setTimeout(() => { window.__meshesReady = true; }, 4000);

/* Faint depth dust removed by request */

/* ---- scroll-linked camera travel (single global scrub) ---- */
const TRAVEL = 55; // total camera travel in Z across the whole page
let scrollProgress = 0;

function initScrollTrigger() {
  if (!window.ScrollTrigger) { requestAnimationFrame(initScrollTrigger); return; }
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2, // Huge signature: the 3D lags the scroll for a cinematic drift
    onUpdate(self) { scrollProgress = self.progress; }
  });
}
initScrollTrigger();

/* ---- tunnel <-> DOM alignment (the signature moment) ----
   Fixed z spacing looked right in code but was never tied to where the
   interstice windows actually fall in the document, so marks crossed the
   camera at arbitrary scroll points (a chapter label could show while the
   previous chapter's mark drifted past). Instead: measure each interstice's
   centre as a scroll progress, convert to the camera's z at that moment,
   and park the mark a few units ahead so it fills the frame exactly when
   its window is on screen. Re-run on resize and after fonts settle. */
let aligned = false;
function alignTunnel() {
  aligned = true; // Disabled to keep standardized GAP distance
}
addEventListener('resize', () => { aligned = false; });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { aligned = false; });

/* ---- mouse parallax ---- */
let mx = 0, my = 0;
/* true once the tilt sensor is feeding mx/my — an explicit opt-in that
   overrides the ambient reduced-motion preference in the render loop */
let tiltActive = false;
addEventListener('pointermove', e => {
  /* touch drags fire pointermove too — those belong to scrolling, and on
     phones the tilt sensor owns mx/my instead */
  if (e.pointerType === 'touch') return;
  mx = e.clientX / innerWidth - 0.5;
  my = e.clientY / innerHeight - 0.5;
});

/* ---- device tilt parallax (mobile) ----
   On touch devices the gyroscope feeds the same mx/my the mouse feeds on
   desktop, so tilting the phone drives the camera drift and the marks'
   rotation. iOS 13+ gates DeviceOrientation behind a user-gesture
   permission request, surfaced as the #motion-cta chip; once granted we
   remember it and re-arm silently on the next visit's first tap. */
const coarse = matchMedia('(pointer: coarse)').matches;
(function initTilt() {
  if (!coarse || typeof DeviceOrientationEvent === 'undefined') return;
  const chip = document.getElementById('motion-cta');
  const RANGE = 18;            // degrees of tilt that map to full parallax
  let baseX = null, baseY = null, lastX = null, lastY = null;

  /* beta/gamma live in the DEVICE frame; remap into the SCREEN frame so a
     physical left-right tilt always moves the camera horizontally no
     matter how the phone is rotated */
  const screenAngle = () => {
    const a = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle
      : (typeof window.orientation === 'number' ? window.orientation : 0);
    return ((a % 360) + 360) % 360;
  };
  const toScreenFrame = (beta, gamma) => {
    switch (screenAngle()) {
      case 90:  return [beta, -gamma];
      case 180: return [-gamma, -beta];
      case 270: return [-beta, gamma];
      default:  return [gamma, beta];
    }
  };

  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const [tx, ty] = toScreenFrame(e.beta, e.gamma);
    /* gamma's Euler range flips sign when the phone approaches vertical
       (gimbal lock at beta ±90°, the normal upright hold). A jump that big
       is never a real hand movement — re-centre instead of slamming the
       parallax between extremes */
    if (baseX === null || Math.abs(tx - lastX) > 45 || Math.abs(ty - lastY) > 45) {
      baseX = tx; baseY = ty;
    }
    lastX = tx; lastY = ty;
    /* the baseline drifts slowly toward the current hold angle (~5s), so
       any new resting position becomes neutral instead of a stuck offset */
    baseX += (tx - baseX) * 0.004;
    baseY += (ty - baseY) * 0.004;
    const gx = Math.max(-RANGE, Math.min(RANGE, tx - baseX));
    const gy = Math.max(-RANGE, Math.min(RANGE, ty - baseY));
    mx = gx / (RANGE * 2);     // same -0.5..0.5 range the mouse produces
    my = gy / (RANGE * 2);
  }

  /* rotating the phone re-frames the axes — start neutral again */
  const resetBase = () => { baseX = baseY = lastX = lastY = null; mx = 0; my = 0; };
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', resetBase);
  } else {
    addEventListener('orientationchange', resetBase);
  }

  const start = () => { tiltActive = true; addEventListener('deviceorientation', onOrient); };
  const hideChip = () => {
    if (chip) chip.hidden = true;
    document.body.classList.remove('motion-cta-on');
  };

  if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
    /* Android & older iOS: no permission gate — auto-start only honors
       the OS reduced-motion preference (there's no explicit opt-in here) */
    if (!reduce) start();
    return;
  }
  /* iOS 13+: the chip below is an explicit opt-in, so it shows even under
     reduced motion — tapping it is the user's own call */

  /* iOS 13+: the request must run inside a user gesture. Resolves 'granted'
     or 'denied'; rejects when the gesture didn't carry user activation. */
  const request = (onSettled) => DeviceOrientationEvent.requestPermission()
    .then(s => {
      if (s === 'granted') {
        try { localStorage.setItem('tilt-ok', '1'); } catch {}
        start();
      } else {
        try { localStorage.removeItem('tilt-ok'); } catch {}
      }
      if (onSettled) onSettled(true);
    })
    .catch(() => { if (onSettled) onSettled(false); });

  let granted = false;
  try { granted = localStorage.getItem('tilt-ok') === '1'; } catch {}
  if (granted) {
    /* granted on a previous visit: the re-request still needs a gesture,
       so piggyback on taps until one actually settles it (a scroll-fling
       touchend may lack user activation — keep listening) */
    const rearm = () => request(settled => { if (settled) removeEventListener('touchend', rearm); });
    addEventListener('touchend', rearm);
  } else if (chip && matchMedia('(max-width: 767px)').matches) {
    /* first visit, phones only — tablets keep the untouched desktop layout */
    chip.hidden = false;
    document.body.classList.add('motion-cta-on');
    chip.addEventListener('click', () => request(hideChip));
  }
})();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---- render loop ---- */
let targetZ = 5;
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  /* no manual document.hidden pause: real browsers already throttle rAF
     natively for backgrounded tabs, and an explicit early return here can
     leave the canvas permanently unrendered in some embedding contexts
     that report hidden=true even while the page is what the user sees */

  const t = reduce ? 0 : clock.getElapsedTime();
  const p = scrollProgress;

  if (!aligned && window.__meshesReady && document.readyState === 'complete') alignTunnel();

  targetZ = reduce ? 5 : 5 - p * TRAVEL;
  camera.position.z += (targetZ - camera.position.z) * 0.1;
  camera.position.x += (mx * 0.7 - camera.position.x) * 0.04;
  camera.position.y += (-my * 0.5 - camera.position.y) * 0.04;
  camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z - 6);

  forms.forEach((m, i) => {
    if (!m) return;
    /* travelling marks render on mobile too now that the gyroscope gives
       them something to react to (pixel ratio is already capped at 1.5) */
    m.visible = true;

    const driftY = Math.sin(t * m.userData.spin + i * 1.3) * 0.05;
    /* reduced motion stills the ambient drift, but an explicit tilt
       opt-in (the chip) lets the user's own hand drive the marks */
    const aimY = (reduce && !tiltActive) ? 0 : mx * 1.1 + driftY;
    const aimX = (reduce && !tiltActive) ? 0 : my * 0.7;
    
    m.rotation.y += (aimY - m.rotation.y) * 0.08;
    m.rotation.x += (aimX - m.rotation.x) * 0.08;
    
    const targetRotZ = Math.sin(t * 0.15 + m.userData.floatSeed) * 0.05;
    m.rotation.z += (targetRotZ - m.rotation.z) * 0.05;
    
    m.position.y = m.userData.baseY + (reduce ? 0 : Math.sin(t * 0.2 + m.userData.floatSeed) * 0.12);
  });

  renderer.render(scene, camera);
}
tick();

/* expose scroll progress for main.js chapter-label logic if needed */
window.__sceneProgress = () => scrollProgress;
window.__debugScene = { scene, camera, renderer, forms, THREE };
