/* ──────────────────────────────────────────────────────────────────────
   Presentation runtime.
   One gesture moves one slide. The canvas is a fixed 1920x1080 scaled to
   fit whatever screen it lands on, so a laptop, a projector and a shared
   browser tab all get the same composition, letterboxed rather than
   reflowed. Print is untouched: deck.css unwinds the shell to 21 pages.
   ────────────────────────────────────────────────────────────────────── */
(() => {
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  const bar = document.getElementById('progress');
  const counter = document.getElementById('counter');
  const LAST = slides.length - 1;
  let index = 0;
  let locked = false;

  /* fit the 1920x1080 canvas inside the viewport */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty('--s', s);
    bleed();
  }

  /* Project the active slide's rules out to the screen edges. The slide is
     centred and scaled, so a canvas coordinate x maps to
     viewport = centre + (x - canvasCentre) * scale. */
  function bleed() {
    const host = document.getElementById('bleed');
    if (!host) return;
    const s = parseFloat(getComputedStyle(stage).getPropertyValue('--s')) || 1;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const out = [];

    /* The bleed lives outside the slide, so it does not inherit the slide's
       own --rule. A dark or green slide needs its light hairline out here too,
       or the projected rules vanish into the ground. */
    host.style.setProperty('--rule', getComputedStyle(slides[index]).getPropertyValue('--rule').trim());

    /* Only the parts OUTSIDE the slide, and they have to meet the slide's own
       rules exactly.

       Two things made the seam visible. Position: the projection was computed
       from the canvas centre and rounded to a whole screen pixel, while the
       slide renders its rule at box.left + x * s, fractional — so the two
       halves of one line started a fraction apart and the line looked kinked
       where it crossed the slide edge. Weight: a rule 1 canvas pixel wide
       renders at s pixels (about 0.4 on a laptop) and antialiases to a pale
       hairline, while a 1px segment out here is solid, so the same line
       changed weight at the seam.

       So: measure off the slide's live box, keep every value fractional, and
       give the segments the same sub-pixel thickness the slide's own rules
       have. Positions come from computed style rather than getBoundingClientRect
       because the rules animate in on translateY and a measured rect would be
       mid-flight. */
    const box = slides[index].getBoundingClientRect();
    const top = box.top, bottom = box.bottom, left = box.left, right = box.right;
    const w = `${s}px`;   /* 1 canvas px, scaled — matches the slide's hairline */

    slides[index].querySelectorAll('.grid i').forEach(el => {
      const cs = getComputedStyle(el);
      if (el.classList.contains('vl')) {
        const x = parseFloat(cs.left);
        if (Number.isNaN(x)) return;
        const px = box.left + x * s;
        if (top > 0) out.push(`<i class="v" style="left:${px}px;width:${w};top:0;height:${top}px"></i>`);
        out.push(`<i class="v" style="left:${px}px;width:${w};top:${bottom}px;bottom:0"></i>`);
      } else {
        const y = parseFloat(cs.top);
        if (Number.isNaN(y)) return;
        const py = box.top + y * s;
        if (left > 0) out.push(`<i class="h" style="top:${py}px;height:${w};left:0;width:${left}px"></i>`);
        out.push(`<i class="h" style="top:${py}px;height:${w};left:${right}px;right:0"></i>`);
      }
    });
    /* The stat row's own dividers are borders, not grid rules, so they stop at
       the slide edge. Continue each one from the slide's bottom to the screen's,
       measured off the live layout rather than recomputed from the canvas. */
    if (box.height) {
      slides[index].querySelectorAll('.stat + .stat, .fig + .fig').forEach(el => {
        const x = el.getBoundingClientRect().left;
        out.push(`<i class="v" style="left:${x}px;width:${w};top:${bottom}px;bottom:0"></i>`);
      });
    }

    host.innerHTML = out.join('');

    /* the surround takes the active slide's own background, so a screen that
       is not 16:9 reads as one full-bleed field instead of a letterboxed card */
    stage.style.background = getComputedStyle(slides[index]).backgroundColor;

    /* the mark rides the same transform, but lives outside the slide so it
       never restarts its entrance */
    const mk = document.getElementById('mark');
    if (mk) {
      /* ink on every ground but a dark one, where it would vanish */
      mk.style.color = slides[index].classList.contains('dark') ? 'var(--off)' : '';
      mk.style.left   = (cx + (62 - 960) * s) + 'px';
      mk.style.top    = (cy + (46 - 540) * s) + 'px';
      mk.style.width  = (64 * s) + 'px';
      mk.style.height = (97 * s) + 'px';
    }
  }

  function show(next, dir) {
    next = Math.max(0, Math.min(LAST, next));
    if (next === index || locked) return;
    locked = true;
    const from = slides[index];
    const to = slides[next];
    from.classList.remove('is-active');
    /* restart the entrance animation on the incoming slide */
    to.classList.remove('is-active');
    void to.offsetWidth;
    to.classList.add('is-active');
    index = next;
    paint();
    bleed();
    /* the lock matches the slide cross-fade, not the full stagger, so
       holding an arrow key still feels responsive */
    setTimeout(() => {
      locked = false;
      /* Recompute once the cross-fade has finished. bleed() switches to the
         incoming slide's rules immediately, which is right by the time the
         fade lands but mismatches the outgoing slide for those 340ms — and if
         anything raced during the transition, this settles it. */
      bleed();
    }, 430);
    history.replaceState(null, '', '#' + (index + 1));
    tell({ deck: 'slide', n: index + 1 });
  }

  /* Embedded in the portfolio's presentation page, which lays this deck over
     itself in an iframe. The page owns the address bar and the close button,
     so it hears which slide is up and gets Escape. It also draws its own
     cursor and hides the system one: pointer moves are handed up so that
     cursor keeps following over the deck, and the system one stays hidden
     here too. Same origin, so the coordinates line up one to one. */
  const host = window.parent !== window ? window.parent : null;
  function tell(msg) { if (host) host.postMessage(msg, location.origin); }
  if (host) {
    let drawn = false;
    try { drawn = !!host.document.getElementById('cursor') && host.matchMedia('(hover: hover)').matches; } catch (_) {}
    if (drawn) {
      document.documentElement.classList.add('host-cursor');
      addEventListener('pointermove', e => {
        host.dispatchEvent(new host.PointerEvent('pointermove', { clientX: e.clientX, clientY: e.clientY }));
      }, { passive: true });
    }
    addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); tell({ deck: 'close' }); }
    });
  }

  function paint() {
    bar.style.width = ((index) / LAST * 100) + '%';
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(LAST + 1).padStart(2, '0');
  }

  const next = () => show(index + 1, 1);
  const prev = () => show(index - 1, -1);

  /* wheel and trackpad: accumulate so one flick is one slide, and a long
     inertial scroll does not fly through the deck */
  let acc = 0, wheelTimer = null;
  addEventListener('wheel', e => {
    e.preventDefault();
    if (locked) return;
    acc += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { acc = 0; }, 180);
    if (Math.abs(acc) > 42) { acc > 0 ? next() : prev(); acc = 0; }
  }, { passive: false });

  addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
    else if (k === 'End') { e.preventDefault(); show(LAST); }
    else if (k === 'f') { document.documentElement.requestFullscreen?.(); }
  });

  /* touch: vertical or horizontal swipe, whichever the hand does */
  let tx = 0, ty = 0;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 45) return;
    (Math.abs(dy) > Math.abs(dx) ? dy < 0 : dx < 0) ? next() : prev();
  }, { passive: true });

  /* Before / after switches inside a slide. Delegated from the document so
     it works no matter when the markup lands, and never touches slide nav. */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.switch button[data-state]');
    if (!btn) return;
    const sw = btn.closest('.switch');
    const box = document.getElementById(sw.dataset.controls);
    if (!box) return;
    box.classList.toggle('is-after', btn.dataset.state === 'after');
    sw.querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
  });

  addEventListener('resize', fit);
  fit();

  /* deep link: #7 opens on slide 7 */
  const start = parseInt(location.hash.slice(1), 10);
  index = Number.isFinite(start) && start >= 1 && start <= slides.length ? start - 1 : 0;
  slides[index].classList.add('is-active');
  paint();
  bleed();
})();
