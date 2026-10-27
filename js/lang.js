/* ============================================================
   LANGUAGE — presentation.html
   ============================================================
   The page ships in English and answers in Portuguese at /apresentacao
   (a Vercel rewrite to the same file) or at ?lang=pt, which is how a local
   static server reaches it. One file, so the two versions cannot drift.

   Every element with a Portuguese version carries it beside the English:
   data-pt for the content, data-pt-label for an aria-label. This module runs
   before main.js and deck.js, so the swap happens under the loader, before
   main.js splits the about paragraph into words and before the decks render.

   The switch in the nav always points at the other language. deck.js reads
   the result from <html lang>, not by importing this file: the script tags
   carry a ?v= and an import would not, so the module would load twice.
   ============================================================ */
'use strict';

const local = /\.html$/.test(location.pathname);
const PT =/^\/apresentacao\/?$/.test(location.pathname)
  || new URLSearchParams(location.search).get('lang') === 'pt';

if (PT) {
  document.documentElement.lang = 'pt-BR';
  document.querySelectorAll('[data-pt]').forEach(el => { el.innerHTML = el.dataset.pt; });
  document.querySelectorAll('[data-pt-label]').forEach(el => el.setAttribute('aria-label', el.dataset.ptLabel));
}

const sw = document.querySelector('[data-lang-switch]');
if (sw) {
  const to = PT ? 'en' : 'pt';
  sw.textContent = to.toUpperCase();
  sw.lang = sw.hreflang = to === 'pt' ? 'pt-BR' : 'en';
  sw.setAttribute('aria-label', PT ? 'Read in English' : 'Ler em português');
  sw.href = local
    ? (to === 'pt' ? 'presentation.html?lang=pt' : 'presentation.html')
    : (to === 'pt' ? '/apresentacao' : '/presentation');
}
