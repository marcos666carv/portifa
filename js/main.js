/* ============================================================
   Loader, scroll engine, reveals, cursor, thumbs, transitions.
   See PLANO-SITE.md for the spec this file implements.
   ============================================================ */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ============ SELECTED WORK ============
   The Selected-work list is baked canonically into index.html (every project,
   incl. the imported Behance cases, links to its internal projeto.html?id=...).
   It ships static so it works for every visitor with no JS/CMS/localStorage
   dependency. Case content itself is served from data/projects.json by
   projeto.html. Edit index.html (or regenerate) to change the list. */

/* ============ LOADER ============ */
function runLoader() {
  const loader = document.getElementById('loader');
  const wipe = document.getElementById('loader-wipe');
  const pct = loader.querySelector('.pct');
  const mark = loader.querySelector('.wordmark');
  let n = 0;

  const step = () => {
    n = Math.min(100, n + Math.random() * 14 + 4);
    /* hold just short of 100 until the 3D marks are actually built;
       a time-based counter alone can finish before the async SVG
       extrude geometry is ready, flashing an empty canvas */
    const displayN = (n >= 100 && !window.__meshesReady) ? 99 : Math.floor(n);
    pct.textContent = displayN;
    if (n < 100 || !window.__meshesReady) {
      setTimeout(step, 90 + Math.random() * 60);
    } else {
      pct.textContent = 100;
      finish();
    }
  };

  function finish() {
    gsap.to(mark, { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' });
    gsap.to(loader, {
      opacity: 0, duration: 0.4, delay: 0.35,
      onComplete: () => { loader.style.display = 'none'; }
    });
    gsap.fromTo(wipe,
      { clipPath: 'inset(0% 0 0 0)' },
      {
        clipPath: 'inset(100% 0 0 0)', duration: 0.9, delay: 0.35,
        ease: 'expo.inOut',
        onComplete: () => {
          wipe.style.display = 'none';
          document.body.classList.add('is-ready');
          playMontage();
          playHeroReveal();
        }
      }
    );
  }

  if (reduce) {
    loader.style.display = 'none';
    wipe.style.display = 'none';
    document.body.classList.add('is-ready');
    playHeroReveal();
    return;
  }
  setTimeout(step, 200);
}

function playHeroReveal() {
  gsap.to('.hero .rv-line > span', {
    y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out'
  });
}

/* ============ HERO INTRO MONTAGE (Huge introFastImages) ============
   A rapid full bleed flash of frames the instant the page reveals, then
   it clears to the settled hero. One shot; skipped under reduced motion. */
function playMontage() {
  const stage = document.getElementById('hero-montage');
  if (!stage || reduce) { if (stage) stage.style.display = 'none'; return; }
  const frames = gsap.utils.toArray('#hero-montage figure');
  const HOLD = 0.11; // ~110ms per frame: fast, cinematic, not subliminal
  stage.classList.add('playing');

  const tl = gsap.timeline({
    onComplete: () => { stage.classList.remove('playing'); stage.style.display = 'none'; }
  });
  frames.forEach((fig, i) => {
    tl.set(fig, { opacity: 1 }, i * HOLD)
      .set(fig, { opacity: 0 }, i * HOLD + HOLD * 0.86);
  });
  // fade the black stage out over the last beat so the hero bleeds through
  tl.to(stage, { opacity: 0, duration: 0.4, ease: 'power2.out' }, frames.length * HOLD - 0.1);
}

/* ============ FONT READY (avoid FOUT before loader) ============ */
if (document.fonts && document.fonts.ready) {
  document.fonts.load('700 1em Pacaembu');
  document.fonts.load('400 1em Pacaembu');
  document.fonts.load('700 1em Jakob');
  document.fonts.load('400 1em Jakob');
  document.fonts.ready.then(() => document.documentElement.classList.add('fonts-ready'));
} else {
  document.documentElement.classList.add('fonts-ready');
}

runLoader();

/* ============ LENIS + SCROLLTRIGGER SYNC ============ */
let lenis;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis; /* debug/QA hook */
}

/* ============ WORD SPLIT + SCRUB REVEAL (manifesto, about) ============ */
function splitWords(el) {
  const text = el.textContent.trim();
  el.innerHTML = '';
  text.split(/\s+/).forEach((word, i, arr) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = word + (i < arr.length - 1 ? ' ' : '');
    el.appendChild(span);
  });
}

document.querySelectorAll('[data-split]').forEach(el => {
  splitWords(el);
  const words = el.querySelectorAll('.w');
  gsap.to(words, {
    color: '#050505', stagger: 0.06, ease: 'none',
    scrollTrigger: {
      trigger: el, start: 'top 75%', end: 'bottom 55%', scrub: reduce ? false : true
    }
  });
});

/* highlight a few key words heavier once the manifesto is built */
document.querySelectorAll('.manifesto .w').forEach(w => {
  const clean = w.textContent.trim().replace(/[.,]/g, '').toLowerCase();
  if (['products', 'ai', '14', 'nps', 'churn'].includes(clean)) w.classList.add('hot');
});

/* ============ BLOCK REVEALS (.rv / .rv-line), once ============ */
gsap.utils.toArray('.rv').forEach(el => {
  ScrollTrigger.create({
    trigger: el, start: 'top 88%',
    onEnter: () => el.classList.add('is-in'),
  });
});
gsap.utils.toArray('.rv-line').forEach(el => {
  ScrollTrigger.create({
    trigger: el, start: 'top 90%',
    onEnter: () => el.classList.add('is-in'),
  });
});

/* ============ CHAPTER LABELS (interstitials) ============ */
gsap.utils.toArray('.inter').forEach(el => {
  ScrollTrigger.create({
    trigger: el, start: 'top 60%', end: 'bottom 40%',
    onEnter: () => el.classList.add('is-active'),
    onLeave: () => el.classList.remove('is-active'),
    onEnterBack: () => el.classList.add('is-active'),
    onLeaveBack: () => el.classList.remove('is-active'),
  });
});

/* ============ THEME MORPH (Huge: bg/fg swap as a section owns the frame) ==
   Each [data-theme] section flips <html data-theme> when its band crosses the
   viewport centre. CSS transitions --bg/--fg over .5s, so the whole page
   morphs smoothly. Interstitials carry no theme, so the last theme persists
   through the 3D windows between chapters. */
(function () {
  const root = document.documentElement;
  let current = 'light';
  root.dataset.theme = current;
  function setTheme(t) {
    if (t === current) return;
    current = t;
    root.dataset.theme = t;
  }
  gsap.utils.toArray('[data-theme]').forEach(sec => {
    const theme = sec.dataset.theme;
    ScrollTrigger.create({
      trigger: sec, start: 'top center', end: 'bottom center',
      onEnter: () => setTheme(theme),
      onEnterBack: () => setTheme(theme),
    });
  });
})();

/* ============ CRAFT PHOTO SCALE-IN ============ */
const craft = document.getElementById('craft');
if (craft) {
  ScrollTrigger.create({
    trigger: craft, start: 'top 70%',
    onEnter: () => craft.classList.add('is-in'),
  });
}

/* ============ NAV HIDE ON SCROLL DOWN ============ */
(function () {
  const nav = document.getElementById('nav');

  /* The home hero already carries the wordmark, in orbit around the mark, so
     the nav copy would just be the same name twice on the same screen — it
     stays out of the way until you have scrolled off the hero, then drops in
     and behaves as usual. Pages with no hero (Solvefy) keep the old rule and
     show the nav from the first pixel. */
  const hero = document.querySelector('.hero');

  function update(scrollingDown) {
    const y = window.scrollY;
    let show;
    if (hero) {
      const left = innerHeight * 0.6;   /* the orbit ring is off screen by here */
      const settled = innerHeight * 1.2; /* far enough that hide-on-scroll-down resumes */
      show = y >= left && (y < settled || !scrollingDown);
    } else {
      show = y < 80 || !scrollingDown;
    }
    nav.classList.toggle('nav-hidden', !show);
  }

  update(false);
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) { update(self.direction === 1); }
  });
})();

/* ============ CUSTOM CURSOR ============ */
(function () {
  const cursor = document.getElementById('cursor');
  if (!cursor || matchMedia('(hover: none)').matches) return;
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  document.querySelectorAll('a, .row, .tile, [data-magnetic]').forEach(el => {
    el.addEventListener('pointerenter', () => cursor.classList.add('big'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('big'));
  });
  (function raf() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(raf);
  })();
})();

/* ============ WORK ROW THUMBNAILS ============ */
(function () {
  const thumb = document.getElementById('thumb');
  if (!thumb) return;
  let tx = 0, ty = 0, cx = 0, cy = 0, cycleTimer = null;
  const stopCycle = () => { if (cycleTimer){ clearInterval(cycleTimer); cycleTimer = null; } };

  document.querySelectorAll('.row[data-thumb]').forEach(row => {
    row.addEventListener('pointerenter', e => {
      if (cx === 0 && cy === 0) { cx = e.clientX; cy = e.clientY; }
      tx = e.clientX; ty = e.clientY;
      stopCycle();

      const slug = row.dataset.thumb;
      const cat = row.dataset.cat || '';
      const name = row.querySelector('.t').textContent.replace('↗', '').trim();
      const imgs = (row._hoverImages && row._hoverImages.length) ? row._hoverImages
        : (row.dataset.hover ? row.dataset.hover.split(',').filter(Boolean)
        : [`assets/work/${slug}/cover.webp`]);

      // two stacked <img> layers crossfade between frames — visibly alive,
      // unlike swapping a single element's src which can look frozen
      thumb.innerHTML = '<img class="tlayer a" alt=""><img class="tlayer b" alt="">';
      const a = thumb.querySelector('.a'), b = thumb.querySelector('.b');
      a.alt = name; b.alt = name;
      a.onerror = () => {
        thumb.innerHTML = `<div class="fallback">
          <img class="fmark" src="assets/cerol/void.svg" alt="">
          <div class="fname">${name}</div>
          <div class="fcat">${cat}</div>
        </div>`;
      };
      a.src = imgs[0];
      a.classList.add('show');
      thumb.classList.add('on');

      if (imgs.length > 1){
        let i = 0, onA = true;
        cycleTimer = setInterval(() => {
          i = (i + 1) % imgs.length;
          const show = onA ? b : a, hide = onA ? a : b;
          show.src = imgs[i];
          show.classList.add('show');
          hide.classList.remove('show');
          onA = !onA;
        }, 700);
      }
    });
    row.addEventListener('pointerleave', () => { thumb.classList.remove('on'); stopCycle(); });
    row.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  });

  (function raf() {
    cx += (tx - cx) * 0.14;
    cy += (ty - cy) * 0.14;
    thumb.style.left = cx + 'px';
    thumb.style.top = cy + 'px';
    requestAnimationFrame(raf);
  })();
})();

/* ============ MOBILE WORK-ROW THUMBNAILS ============
   On touch screens the hover follower never fires, so each Selected-work
   row gets a small visible cover image instead. Injected on every load —
   CSS keeps them display:none above 767px (lazy images inside display:none
   never fetch), so breakpoint crossings and rotations can't strand the
   layout in either direction. Rows with no cover on disk (non-numeric
   slugs) render a CEROL mark directly, no 404 probe. */
(function () {
  const MARKS = ['sun', 'urchin', 'scribble', 'creature', 'void'];
  document.querySelectorAll('.proj .row[data-thumb]').forEach((row, i) => {
    const slug = row.dataset.thumb;
    const th = document.createElement('span');
    th.className = 'row-thumb';
    const markFallback = () => {
      th.classList.add('mark');
      th.innerHTML = `<img class="mk" src="assets/cerol/${MARKS[i % MARKS.length]}.svg" alt="" loading="lazy">`;
    };
    const src = row.dataset.hover
      ? row.dataset.hover.split(',')[0]
      : (/^\d+$/.test(slug) ? `assets/work/${slug}/cover.webp` : null);
    if (src) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = markFallback;
      img.src = src;
      th.appendChild(img);
    } else {
      markFallback();
    }
    row.prepend(th);
  });
})();

/* ============ MAGNETIC BUTTONS ============ */
document.querySelectorAll('[data-magnetic]').forEach(btn => {
  let bx = 0, by = 0;
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    bx = (e.clientX - r.left - r.width / 2) * 0.35;
    by = (e.clientY - r.top - r.height / 2) * 0.35;
    gsap.to(btn, { x: bx, y: by, duration: 0.3, ease: 'power2.out' });
  });
  btn.addEventListener('pointerleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  });
});

/* ============ PAGE TRANSITIONS (cinematic wipe) ============ */
(function () {
  const overlay = document.getElementById('page-transition');
  document.querySelectorAll('a[data-transition]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      e.preventDefault();
      sessionStorage.setItem('pt-arrive', '1');
      gsap.to(overlay, {
        clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'expo.inOut',
        onComplete: () => { window.location.href = href; }
      });
    });
  });
  /* only wipe-reveal on arrival if we came from a transitioned link;
     the very first index.html load is already revealed by the loader */
  if (sessionStorage.getItem('pt-arrive')) {
    sessionStorage.removeItem('pt-arrive');
    overlay.style.clipPath = 'inset(0 0 0 0)';
    gsap.to(overlay, { clipPath: 'inset(100% 0 0 0)', duration: 0.7, delay: 0.05, ease: 'expo.inOut' });
  }
})();

/* ============ CRAFT WALL LIGHTBOX ============
   Tap a masonry tile to open it big; arrows / swipe / keys to move through the
   whole wall, click the backdrop or ✕ or Esc to close. Locks Lenis while open.
   Uses event delegation on #wall so it keeps working when the CMS rebuilds the
   tiles from data/projects.json. */
(function () {
  const lb = document.getElementById('lightbox');
  const wall = document.getElementById('wall');
  if (!lb || !wall) return;
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-cap');
  const tiles = () => [...wall.querySelectorAll('.tile')];
  let idx = -1;

  const show = (i) => {
    const ts = tiles(); if (!ts.length) return;
    idx = (i + ts.length) % ts.length;
    const t = ts[idx];
    img.src = t.dataset.full || t.querySelector('img')?.src || '';
    img.alt = t.dataset.title || '';
    cap.textContent = t.dataset.title || '';
  };
  const open = (i) => {
    show(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    if (window.__lenis) window.__lenis.stop();
    document.documentElement.style.overflow = 'hidden';
  };
  const close = () => {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    if (window.__lenis) window.__lenis.start();
    document.documentElement.style.overflow = '';
    img.src = '';
  };

  wall.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    open(tiles().indexOf(t));
  });
  lb.querySelector('.lb-close').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
  img.addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });   // click image = next
  lb.addEventListener('click', close);                                             // backdrop = close
  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 45) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

/* ============ CRAFT SPHERE ============
   The loose-craft wall is a slowly rotating 3D globe of images (absorbed from
   brik.space's sphere layout: Fibonacci distribution, perspective projection,
   tiles billboarded to the camera, continuous auto-rotation ~5°/s). Drag
   horizontally to spin (with inertia); vertical touch still scrolls the page
   (touch-action: pan-y). A real drag suppresses the click so the lightbox
   only opens on a tap. Pauses whenever the section leaves the viewport. */
(function () {
  const section = document.getElementById('craftwall');
  const wall = document.getElementById('wall');
  if (!section || !wall) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE_SPEED = reduced ? 0 : 0.09;   // rad/s — the reference's leisurely spin
  const PERSP = 1000;                      // focal length in px
  const TILT = -0.16;                      // fixed X tilt so the poles read as depth
  const frac = (n) => n - Math.floor(n);

  let tiles = [], pts = [], RX = 500, RY = 300, RZ = 380;
  let rotY = 0, vel = 0, running = false, raf = 0, last = 0;
  /* phones scrub the spin with the scroll instead of auto-rotating;
     drag accumulates into an offset on top of the scrubbed angle */
  const mmSmall = matchMedia('(max-width: 767px)');
  let dragRot = 0;

  function sizeTiles() {
    /* deterministic size mix — a few heroes, some mids, mostly small tiles.
       vmin is the narrow side on phones, so the desktop numbers render
       postage-stamp tiles there: scale the mix up (heroes less — they
       already dominate, and every extra vmin is squared paint cost on the
       pinned stage). Re-run on resize so breakpoint crossings re-size. */
    const mob = innerWidth < 768;
    for (let i = 0; i < tiles.length; i++) {
      const rnd = frac(Math.sin(i * 127.1) * 43758.5453);
      let w = i % 11 === 0 ? 34 : i % 5 === 0 ? 20 : 10 + rnd * 7;  // vmin
      if (mob) w *= i % 11 === 0 ? 1.15 : 1.4;
      const ar = parseAspect(tiles[i].querySelector('img'));
      if (ar && ar < 0.8) w *= 0.72;                    // tall pieces: rein the width in
      if (ar && ar > 2.4) w *= 1.3;                     // wide banners: let them stretch
      tiles[i].style.setProperty('--w', w.toFixed(1));
    }
  }
  function setup() {
    tiles = [...wall.querySelectorAll('.tile')];
    const N = tiles.length; if (!N) return;
    pts = [];
    const GA = Math.PI * (3 - Math.sqrt(5));            // golden angle
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;                // Fibonacci sphere: even spread
      const r = Math.sqrt(1 - y * y);
      pts.push({ x: Math.cos(GA * i) * r, y, z: Math.sin(GA * i) * r });
    }
    sizeTiles();
    resize();
    render(0);
  }
  function parseAspect(img) {
    const m = /aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/.exec(img?.getAttribute('style') || '');
    return m ? (+m[1]) / (+m[2]) : (img?.naturalWidth && img?.naturalHeight ? img.naturalWidth / img.naturalHeight : 0);
  }
  function resize() {
    /* ellipsoid, not a ball: wide in x so tiles reach the stage edges (like
       the reference canvas), tall-ish in y, depth from the smaller side */
    RX = wall.clientWidth * 0.42;
    RY = wall.clientHeight * 0.40;
    RZ = Math.min(wall.clientWidth, wall.clientHeight) * 0.5;
  }

  function render(dt) {
    if (mmSmall.matches) {
      /* scroll drives the spin: one full 360° across the pinned travel,
         so the revolution completes exactly when the page moves on */
      const travel = Math.max(1, section.offsetHeight - innerHeight);
      const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel));
      dragRot += vel * dt;
      rotY = p * Math.PI * 2 + dragRot;
    } else {
      rotY += (BASE_SPEED + vel) * dt;
    }
    vel *= Math.pow(0.05, dt);                          // drag inertia decays in ~1s
    const cx = wall.clientWidth / 2, cy = wall.clientHeight / 2;
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
    const ca = Math.cos(rotY), sa = Math.sin(rotY);
    for (let i = 0; i < tiles.length; i++) {
      const p = pts[i];
      /* spin then tilt on the UNIT sphere, scale axes last — keeps every
         tile inside the stage bounds instead of flying off top/bottom */
      const x1 = p.x * ca + p.z * sa;
      const z1 = -p.x * sa + p.z * ca;
      const yu = p.y * cosT - z1 * sinT;
      const zu = p.y * sinT + z1 * cosT;
      const x = x1 * RX, y = yu * RY, z = zu * RZ;
      const s = PERSP / (PERSP - z);
      const t = tiles[i];
      t.style.transform = `translate(-50%,-50%) translate(${(cx + x * s).toFixed(2)}px,${(cy + y * s).toFixed(2)}px) scale(${s.toFixed(4)})`;
      /* z-index writes invalidate paint order for the whole stage — skip
         the ones that wouldn't change anything */
      const zi = 100 + Math.round(z / 4);
      if (t.__zi !== zi) { t.__zi = zi; t.style.zIndex = zi; }
      t.style.opacity = (0.55 + 0.45 * (z + RZ) / (2 * RZ)).toFixed(3);
    }
  }

  /* drag to spin — pointer events; vertical touch keeps scrolling the page */
  let dragging = false, lastX = 0, startX = 0, startY = 0, moved = 0, dragVel = 0, lastT = 0;
  wall.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    dragging = true; moved = 0; dragVel = 0;
    lastX = startX = e.clientX; startY = e.clientY; lastT = performance.now();
    wall.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved = Math.max(moved, Math.hypot(e.clientX - startX, e.clientY - startY));
    if (mmSmall.matches) dragRot += dx * 0.0038; else rotY += dx * 0.0038;
    const now = performance.now();
    dragVel = (dx * 0.0038) / Math.max((now - lastT) / 1000, 1 / 240);
    lastT = now;
    if (!running) render(0);
  }, { passive: true });
  addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false; wall.classList.remove('dragging');
    vel = Math.max(-1.4, Math.min(1.4, dragVel));
  });
  wall.addEventListener('click', (e) => {              // a drag is not a tap
    if (moved > 8) { e.stopPropagation(); e.preventDefault(); moved = 0; }
  }, true);

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    render(dt);
  }
  const io = new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }, { rootMargin: '15%' });
  io.observe(section);
  addEventListener('resize', () => { sizeTiles(); resize(); if (!running) render(0); });

  setup();
  window.__initCraftSphere = setup;                    // CMS rebuild re-enters here
})();

/* ============ HOME CONTENT FROM THE CMS (montage + craft wall) ============
   The opening montage and the craft grid ship baked into index.html as a
   default/fallback. If data/projects.json carries CMS-authored `montage` /
   `craft` lists, rebuild them from that so they're editable without touching
   markup. Fetched once, in parallel with the loader (which waits on the 3D),
   so the montage is usually rebuilt before it plays; worst case it plays the
   baked default. */
(function () {
  const esc = (s) => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function buildMontage(frames) {
    const stage = document.getElementById('hero-montage');
    if (!stage || !frames.length) return;
    stage.innerHTML = frames.map(f =>
      `<figure${f.sym ? ' class="sym"' : ''}><img src="${esc(f.src)}" alt=""></figure>`).join('');
  }

  function buildCraft(tiles) {
    const wall = document.getElementById('wall');
    if (!wall || !tiles.length) return;
    wall.innerHTML = tiles.map(t =>
      `<button class="tile" data-full="${esc(t.src)}" data-title="${esc(t.title)}" data-id="${esc(t.caseId)}">` +
      `<img src="${esc(t.src)}" loading="lazy" decoding="async" alt="${esc(t.title)}"></button>`).join('');
    // re-seat the fresh tiles on the sphere + cursor treatment
    if (window.__initCraftSphere) window.__initCraftSphere();
    gsap.utils.toArray('#wall .tile').forEach(el => {
      if (cursorEl) {
        el.addEventListener('pointerenter', () => cursorEl.classList.add('big'));
        el.addEventListener('pointerleave', () => cursorEl.classList.remove('big'));
      }
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  const cursorEl = document.getElementById('cursor');

  fetch('data/projects.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d) return;
      if (Array.isArray(d.montage) && d.montage.length) buildMontage(d.montage);
      if (Array.isArray(d.craft) && d.craft.length) buildCraft(d.craft);
    })
    .catch(() => {});
})();
