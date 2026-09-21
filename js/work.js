/* ============================================================
   CATALOG RENDERER — product.html and craft.html
   ============================================================
   Both catalog pages build their contents from data/projects.json, the file
   the CMS publishes. That is deliberate: index.html shipped its rows baked
   into the markup, so a case added in the CMS never reached the home. Here
   the data is the source of truth and the pages follow it.

   The split is the `secondary` flag — false = product, true = graphic & craft
   — and array order is display order, both editable from the CMS.

   Rows land after main.js has already run, so this module hands the new
   markup back with a work:rendered event; main.js attaches the reveals and
   the hover follower to whatever arrives.
   ============================================================ */
'use strict';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const mounts = [...document.querySelectorAll('[data-catalog]')];

/* line list — the product register. The cover rides on the right of the row
   instead of only appearing under the cursor: the floating follower showed one
   project at a time and only while hovering, so scanning the list gave you
   nothing to look at. Rows that carry a cover opt out of the follower and out
   of the phone-only thumb (see main.js) so there is never a second image
   competing with this one. */
function rowHTML(p) {
  const hover = [p.cover, p.firstImage].filter(Boolean).join(',');
  const src = p.cover || p.firstImage || (p.hoverImages || [])[0] || '';
  const cover = src
    ? `<span class="row-cover"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span>`
    : '';
  return `<a class="row rv${src ? ' has-cover' : ''}" href="projeto.html?id=${esc(p.id)}" data-transition`
    + ` data-thumb="${esc(p.id)}"${hover ? ` data-hover="${esc(hover)}"` : ''}`
    + ` data-cat="${esc(p.meta)}">`
    + `<span class="t">${esc(p.title)} <span class="arrow">↗</span></span>`
    + cover
    + `<span class="m">${esc(p.meta)}</span></a>`;
}

/* strip — the covers under the craft door. A uniform crop is right here and
   wrong in the grid below: this row is a glimpse of what is behind the link,
   not the work being shown, so the four read as one gesture. */
function stripHTML(p) {
  const src = p.cover || p.firstImage || (p.hoverImages || [])[0] || '';
  return `<span class="dcover">${src
    ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : ''}</span>`;
}

/* grid — the craft register: here the image IS the argument, so it leads.
   Covers keep their natural ratio rather than being cropped to a uniform
   box; the stagger in CSS is what holds the column together. */
function cardHTML(p) {
  const src = p.cover || p.firstImage || (p.hoverImages || [])[0] || '';
  /* eager, not lazy: these keep their natural ratio, so each one that arrives
     late grows the page under everything below it. On craft.html that pushed
     the pinned strip's start 2000px off and it came down over the cases. */
  const img = src
    ? `<img src="${esc(src)}" alt="${esc(p.title)}" decoding="async">`
    : `<span class="gcard-blank" aria-hidden="true"></span>`;
  return `<a class="gcard rv" href="projeto.html?id=${esc(p.id)}" data-transition>`
    + `<span class="gcard-img">${img}</span>`
    + `<span class="gcard-meta"><span class="gt">${esc(p.title)}`
    + ` <span class="arrow">↗</span></span>`
    + `<span class="gm">${esc(p.meta)}</span></span></a>`;
}

fetch('data/projects.json', { cache: 'no-cache' })
  .then(r => (r.ok ? r.json() : null))
  .then(d => {
    if (!d || !mounts.length || !Array.isArray(d.projects)) return;
    const TPL = { grid: cardHTML, strip: stripHTML, list: rowHTML };

    mounts.forEach(mount => {
      const wantCraft = mount.dataset.catalog === 'craft';
      let list = d.projects.filter(p => p.visible !== false && !!p.secondary === wantCraft);
      const limit = parseInt(mount.dataset.limit || '', 10);
      if (limit > 0) list = list.slice(0, limit);
      if (!list.length) return;

      mount.innerHTML = list.map(TPL[mount.dataset.layout] || rowHTML).join('');

      /* the internal cases carry their hover frames as data URIs in the JSON
         rather than as files on disk, so hand them to the follower directly */
      mount.querySelectorAll('.row[data-thumb]').forEach(row => {
        const p = list.find(x => String(x.id) === row.dataset.thumb);
        const imgs = (p?.hoverImages || []).filter(Boolean);
        if (imgs.length) row._hoverImages = imgs;
      });
    });

    /* one event for the page: every rebind is guarded against double binding */
    dispatchEvent(new CustomEvent('work:rendered', { detail: { root: document } }));

    /* Anything measured against page height — the pinned strip above all —
       has to be re-measured once these images have actually taken up their
       room. Debounced, because they land one by one. */
    let t;
    const settle = () => {
      clearTimeout(t);
      t = setTimeout(() => window.ScrollTrigger && window.ScrollTrigger.refresh(), 120);
    };
    mounts.forEach(mount => mount.querySelectorAll('img').forEach(img => {
      if (img.complete) return;
      img.addEventListener('load', settle, { once: true });
      img.addEventListener('error', settle, { once: true });
    }));
    settle();
  })
  .catch(() => { /* the page still reads without the list; no error UI needed */ });
