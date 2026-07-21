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
  let lastY = window.scrollY;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const y = window.scrollY;
      if (y < 80) { nav.classList.remove('nav-hidden'); }
      else if (self.direction === 1) { nav.classList.add('nav-hidden'); }
      else { nav.classList.remove('nav-hidden'); }
      lastY = y;
    }
  });
})();

/* ============ CUSTOM CURSOR ============ */
(function () {
  const cursor = document.getElementById('cursor');
  if (!cursor || matchMedia('(hover: none)').matches) return;
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  document.querySelectorAll('a, .row, [data-magnetic]').forEach(el => {
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
