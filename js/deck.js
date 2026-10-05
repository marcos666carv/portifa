/* ============================================================
   PRESENTATION — presentation.html
   ============================================================
   A summarised version of the site, built to be presented: the hero, a
   selection of four cases, and each case as a slide deck that moves one page
   per click, wheel gesture, swipe or key. Close returns to the selection.

   Decks come from data/presentation.json, which the CMS never touches. The
   selection renders from it and hands the new markup to main.js through
   work:rendered — that binds the reveals and the cursor, and refreshes
   ScrollTrigger, which matters here: the pinned craft strip further down
   measures its start against everything above it.

   The URL follows the deck (#nissan/7). Reloading mid presentation lands on
   the same page, and the browser's Back closes the deck instead of leaving
   the site.
   ============================================================ */
'use strict';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isVid = (u) => /\.(mp4|webm)(\?|$)/i.test(u || '');
/* a video slide's poster is the .webp of the same name */
const posterOf = (u) => u.replace(/\.(mp4|webm)(\?.*)?$/i, '.webp');
const pad = (n) => String(n).padStart(2, '0');

const list  = document.querySelector('[data-deck-list]');
const deck  = document.getElementById('deck');
const track = document.getElementById('deck-track');
const btnX  = document.getElementById('deck-close');
const curEl = document.getElementById('deck-cur');
const totEl = document.getElementById('deck-tot');

let DECKS = [];
let active = null;   // the deck on screen
let cur = 0;         // its current page
let slides = [];     // that deck's slide nodes
let pushed = false;  // whether opening it added a history entry
let opener = null;   // the card that opened it, to hand focus back to

/* ---------- the selection ---------- */
function cardHTML(d) {
  const first = d.slides[0];
  const src = isVid(first) ? posterOf(first) : first;   // the cover is page one
  return `<a class="dcase rv" href="#${esc(d.id)}" data-deck="${esc(d.id)}">`
    + `<span class="dcase-img"><img src="${esc(src)}" alt="${esc(d.title)}" loading="lazy" decoding="async"></span>`
    + `<span class="dcase-meta"><span class="dt">${esc(d.title)} <span class="arrow">↗</span></span>`
    + `<span class="dm">${esc(d.meta)}</span></span></a>`;
}

/* ---------- the deck ---------- */
function build(d) {
  track.innerHTML = d.slides.map((s, i) => {
    const label = `${esc(d.title)}, ${i + 1} of ${d.slides.length}`;
    const media = isVid(s)
      ? `<video data-src="${esc(s)}" data-poster="${esc(posterOf(s))}" muted loop playsinline preload="none" aria-label="${label}"></video>`
      : `<img data-src="${esc(s)}" alt="${label}" decoding="async">`;
    return `<figure class="deck-slide pos-below">${media}</figure>`;
  }).join('');
  slides = [...track.children];
  totEl.textContent = pad(d.slides.length);
}

/* pages load as they come near, not all at once: the current one, the one
   behind it and the two ahead */
function hydrate(i) {
  for (let k = i - 1; k <= i + 2; k++) {
    const m = slides[k] && slides[k].firstElementChild;
    if (!m || !m.dataset.src || m.getAttribute('src')) continue;
    if (m.tagName === 'VIDEO') {
      m.poster = m.dataset.poster;
      m.preload = 'auto';
    } else {
      m.addEventListener('load', () => classify(k), { once: true });
    }
    m.src = m.dataset.src;
  }
}

/* a video page starts over every time it comes on, the way a slide would */
function media(i, play) {
  const v = slides[i] && slides[i].querySelector('video');
  if (!v) return;
  if (play) { try { v.currentTime = 0; } catch (_) {} v.play().catch(() => {}); }
  else v.pause();
}

function place(i, cls) {
  const s = slides[i];
  s.classList.remove('pos-above', 'pos-below', 'pos-cur');
  s.classList.add(cls);
}

/* every page to its resting place, without animating: finishes whatever was
   in flight so the next move never inherits a half done one */
function settle() {
  slides.forEach((s, k) => {
    s.classList.remove('anim');
    place(k, k < cur ? 'pos-above' : k > cur ? 'pos-below' : 'pos-cur');
  });
}

/* ---------- tall pages ----------
   Most pages are 16:9 and are shown whole. A board taller than the screen
   would shrink to a strip with unreadable type if it were shown whole, so it
   fits the screen's width instead — scaled up at most 1.25x, past which it
   goes soft — and an advance first pans down through it, then turns the
   page. Going back pans up, and arriving at a tall page from the one after
   it starts at its bottom, so walking backwards is one continuous move.
   Full width matters for more than size: these boards have colour blocks
   that bleed off their right edge, and a board floating in the middle of the
   screen would cut them short. */
const PAN_STEP = 0.82;   // of the screen per step, so each view overlaps the last
const MAX_UP = 1.25;
let pan = 0;             // how far into the current tall page, in px

function measure(i) {
  const img = slides[i] && slides[i].querySelector('img');
  if (!img || !img.naturalWidth) return null;
  const vw = track.clientWidth, vh = track.clientHeight;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  /* Only a portrait board qualifies, and only where showing it whole would
     leave it a narrow strip. Without the portrait test, a 16:9 slide on an
     ultrawide screen would count as tall and start to pan; without the strip
     test, a board on a phone held upright — where it already fits whole —
     would too. */
  if (nh <= nw || Math.min(vw, vh * nw / nh) / vw >= 0.6) return null;
  const w = Math.min(vw, nw * MAX_UP);
  const h = w * nh / nw;
  if (h <= vh + 1) return null;
  const max = h - vh;
  /* Equal steps, not a fixed one with whatever is left at the end: a fixed
     82% left a last step of 50px on the Promotion board, a press that showed
     nothing new. Round to the nearest whole number of steps, and never let a
     step get so long that a band of the board goes by unseen. */
  let n = Math.max(1, Math.round(max / (vh * PAN_STEP)));
  if (max / n > vh * 0.95) n = Math.ceil(max / (vh * 0.95));
  return { w, max, step: max / n };
}

/* the board's own top left corner, so whatever shows around it on a very
   wide screen is its paper and not a frame */
function edgeColor(img) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 8, 8, 0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  } catch (_) { return ''; }
}

function setPan(px, instant) {
  pan = Math.max(0, px);
  const s = slides[cur];
  if (!s) return;
  if (instant) s.classList.add('pan-now');
  s.style.setProperty('--pan', `${-pan}px`);
  if (instant) { void s.offsetWidth; s.classList.remove('pan-now'); }
}

/* whether a page is tall depends on the screen as much as on the image, so
   this runs when the image arrives and again on every resize */
function classify(i) {
  const s = slides[i];
  const img = s && s.querySelector('img');
  if (!img) return;
  const m = measure(i);
  s.classList.toggle('tall', !!m);
  if (m) {
    img.style.width = `${m.w}px`;
    if (!s.dataset.bg) s.dataset.bg = edgeColor(img);
    s.style.background = s.dataset.bg;
  } else {
    img.style.width = '';
    s.style.background = '';
  }
  if (i === cur) setPan(Math.min(pan, m ? m.max : 0), true);
}

function go(n) {
  if (!active) return;
  /* inside a tall page a step forward or back pans before it turns the page */
  const t = slides[cur] && slides[cur].classList.contains('tall') ? measure(cur) : null;
  if (t && n === cur + 1 && pan < t.max - 1) { setPan(Math.min(pan + t.step, t.max)); return; }
  if (t && n === cur - 1 && pan > 1) { setPan(Math.max(pan - t.step, 0)); return; }
  if (n >= slides.length) { requestClose(); return; }  // past the last page: back to the selection
  if (n < 0 || n === cur) return;
  const from = cur;
  const fwd = n > from;
  settle();
  /* only the two pages involved move; the ones in between would otherwise
     sweep across the screen on a jump to the first or the last */
  place(n, fwd ? 'pos-below' : 'pos-above');
  void slides[n].offsetWidth;                          // commit the entry side
  slides[from].classList.add('anim');
  slides[n].classList.add('anim');
  place(from, fwd ? 'pos-above' : 'pos-below');
  place(n, 'pos-cur');
  media(from, false);
  cur = n;
  hydrate(cur);
  const tn = slides[cur].classList.contains('tall') ? measure(cur) : null;
  setPan(!fwd && tn ? tn.max : 0, true);
  media(cur, true);
  curEl.textContent = pad(cur + 1);
  history.replaceState(history.state, '', `#${active.id}/${cur + 1}`);
}

function open(id, at = 0, push = true) {
  const d = DECKS.find(x => x.id === id);
  if (!d) return;
  active = d;
  build(d);
  cur = Math.max(0, Math.min(at, d.slides.length - 1));
  pan = 0;
  settle();
  hydrate(cur);
  curEl.textContent = pad(cur + 1);

  deck.classList.add('open');
  deck.setAttribute('aria-hidden', 'false');
  /* a forced reflow rather than requestAnimationFrame: a backgrounded or
     throttled tab can hold rAF back, and the deck would stay invisible */
  void deck.offsetWidth;
  deck.classList.add('shown');
  media(cur, true);

  if (window.__lenis) window.__lenis.stop();
  document.documentElement.style.overflow = 'hidden';

  const hash = `#${d.id}/${cur + 1}`;
  if (push) { history.pushState({ deck: d.id }, '', hash); pushed = true; }
  else { history.replaceState({ deck: d.id }, '', hash); pushed = false; }
  deck.focus({ preventScroll: true });
}

function close() {
  if (!active) return;
  slides.forEach((_, i) => media(i, false));
  active = null;
  pushed = false;
  deck.classList.remove('shown');
  deck.setAttribute('aria-hidden', 'true');
  /* clear once the fade is over — unless a deck was reopened in the meantime */
  setTimeout(() => {
    if (active) return;
    deck.classList.remove('open');
    track.innerHTML = '';
    slides = [];
  }, 420);
  if (window.__lenis) window.__lenis.start();
  document.documentElement.style.overflow = '';
  if (opener) { opener.focus({ preventScroll: true }); opener = null; }
}

/* closing walks history back when opening pushed an entry, so the address
   bar and the Back button always agree with what is on screen */
function requestClose() {
  if (!active) return;
  if (pushed) { history.back(); return; }   // popstate does the closing
  history.replaceState(null, '', location.pathname + location.search);
  close();
}

function fromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return null;
  const [id, n] = h.split('/');
  if (!DECKS.some(d => d.id === id)) return null;
  return { id, at: Math.max(0, (parseInt(n, 10) || 1) - 1) };
}

addEventListener('popstate', () => {
  const m = fromHash();
  if (active && (!m || m.id !== active.id)) close();
  else if (!active && m) open(m.id, m.at, false);
});

addEventListener('resize', () => {
  if (!active) return;
  slides.forEach((sl, i) => {
    const img = sl.querySelector('img');
    if (img && img.naturalWidth) classify(i);
  });
});

/* ---------- input ---------- */
if (list) list.addEventListener('click', (e) => {
  const a = e.target.closest('[data-deck]');
  if (!a) return;
  e.preventDefault();
  opener = a;
  open(a.dataset.deck, 0, true);
});

track.addEventListener('click', () => go(cur + 1));
btnX.addEventListener('click', (e) => { e.stopPropagation(); requestClose(); });

addEventListener('keydown', (e) => {
  if (!active) return;
  const k = e.key;
  /* Enter or Space on the focused close button is the button's own click */
  if (e.target === btnX && (k === 'Enter' || k === ' ')) return;
  if (k === 'Escape') { e.preventDefault(); requestClose(); }
  else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(cur + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); go(cur - 1); }
  else if (k === 'Home') { e.preventDefault(); go(0); }
  else if (k === 'End') { e.preventDefault(); go(slides.length - 1); }
});

/* One gesture, one page. A trackpad swipe arrives as a long run of wheel
   events, inertia included, and a mouse wheel spun fast as a burst of
   notches: both count once. A pause of 200ms starts a new gesture, so a
   presenter nudging the wheel one notch at a time gets one page per notch.
   stopPropagation keeps Lenis, which listens on window, from scrolling the
   page underneath. */
let lastWheel = 0, spent = false;
deck.addEventListener('wheel', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const now = performance.now();
  if (now - lastWheel > 200) spent = false;
  lastWheel = now;
  const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (spent || Math.abs(d) < 6) return;
  spent = true;
  go(cur + (d > 0 ? 1 : -1));
}, { passive: false });

/* swipes only — a tap already arrives as a click */
let tx = 0, ty = 0;
deck.addEventListener('touchstart', (e) => {
  const t = e.touches[0]; tx = t.clientX; ty = t.clientY;
}, { passive: true });
deck.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - tx, dy = t.clientY - ty;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
  const d = Math.abs(dy) > Math.abs(dx) ? dy : dx;
  go(cur + (d < 0 ? 1 : -1));
}, { passive: true });

/* ---------- boot ---------- */
fetch('data/presentation.json', { cache: 'no-cache' })
  .then(r => (r.ok ? r.json() : null))
  .then(data => {
    if (!data || !Array.isArray(data.decks)) return;
    DECKS = data.decks;
    if (list) {
      list.innerHTML = DECKS.map(cardHTML).join('');
      dispatchEvent(new CustomEvent('work:rendered', { detail: { root: list } }));
    }
    const m = fromHash();
    if (m) open(m.id, m.at, false);
  })
  .catch(() => { /* the rest of the page still works without the decks */ });
