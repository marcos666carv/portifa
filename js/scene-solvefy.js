/* ============================================================
   Solvefy case page: a single mark (urchin) in liquid chrome,
   living behind the whole page. Same proven material/lighting
   setup as the main tunnel (see js/scene.js for the full spec
   and the reasoning behind these exact values).
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

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.05);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(2.2, 0.3, 6);

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
panel(3.2, 0, 8, 10, 18, 14);
panel(2.2, 9, -2, 6, 14, 18);
panel(2.2, -9, -2, 6, 14, 18);
panel(1.4, 0, -8, 8, 16, 12);
panel(0.6, 0, 0, -30, 24, 24);
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

let mark = null;
new SVGLoader().load('assets/cerol/urchin.svg', data => {
  const shapes = [];
  data.paths.forEach(p => SVGLoader.createShapes(p).forEach(s => shapes.push(s)));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 26, bevelEnabled: true, bevelThickness: 10, bevelSize: 7,
    bevelSegments: 12, curveSegments: 72
  });
  geo.center();
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  const fit = 3.6 / Math.max(size.x, size.y);
  mark = new THREE.Mesh(geo, chrome);
  mark.scale.set(fit, -fit, fit);
  mark.position.set(0, 0, 0);
  scene.add(mark);
  window.__meshesReady = true;
});
setTimeout(() => { window.__meshesReady = true; }, 4000);

let scrollProgress = 0;
function initScrollTrigger() {
  if (!window.ScrollTrigger) { requestAnimationFrame(initScrollTrigger); return; }
  ScrollTrigger.create({
    trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8,
    onUpdate(self) { scrollProgress = self.progress; }
  });
}
initScrollTrigger();

let mx = 0, my = 0;
addEventListener('pointermove', e => {
  mx = e.clientX / innerWidth - 0.5;
  my = e.clientY / innerHeight - 0.5;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const t = reduce ? 0 : clock.getElapsedTime();
  const p = scrollProgress;

  camera.position.x += (2.2 - p * 4.4 + mx * 0.6 - camera.position.x) * 0.05;
  camera.position.y += (0.3 + my * -0.4 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  if (mark) {
    const aimY = reduce ? 0 : mx * 1.1 + Math.sin(t * 0.1) * 0.05;
    const aimX = reduce ? 0 : my * 0.7;
    mark.rotation.y += (aimY - mark.rotation.y) * 0.08;
    mark.rotation.x += (aimX - mark.rotation.x) * 0.08;
    const targetZ = Math.sin(t * 0.15) * 0.05;
    mark.rotation.z += (targetZ - mark.rotation.z) * 0.05;
    mark.position.y = Math.sin(t * 0.2) * 0.12 - p * 1.5;
  }

  renderer.render(scene, camera);
}
tick();

window.__debugScene = { scene, camera, renderer, mark, THREE };
