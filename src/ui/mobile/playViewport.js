/* ═══ PLAY VIEWPORT — the size the GAME gets, not the size of the window ═══ */
/* v2.3.1715.  Owner, on desktop: "the layout is super stretched... force the
   main game area 50% of the size if they're a desktop player and make the
   dashboard sized the same width" — and then, after the shell landed, "the
   dashboard is still super stretched and not scaling down correctly with the
   smaller game screen area."

   That second report is this module.  Narrowing the shell (#root, the
   pointer:fine block in game.css) moved the CANVAS, because BroTown's resize()
   measures the shell — but every dashboard component sizes itself from
   window.innerWidth directly, so on a 1920px screen they kept laying out for
   1920 while sitting in a 960 box: columns, slot pitch, the identity strip and
   the item popup all stretched to a width that no longer existed.

   So there are now two different widths and they must not be confused:
     - window.innerWidth — the BROWSER window.  Still correct for anything
       genuinely about the browser (media queries, the surround outside).
     - playVw() — the PLAY AREA.  Correct for anything laying out game UI.
   On a phone the shell IS the viewport, so playVw() === innerWidth and nothing
   about the primary platform changes; the `< vw` guard below is what makes
   that true by construction rather than by luck.

   Landscape is derived here too (playIsLandscape), because it has the same
   bug in a nastier form: a 960x1080 shell on a 1920x1080 screen is PORTRAIT,
   but window.innerWidth > window.innerHeight reports landscape and swings the
   whole control layout to the wrong one. */

const PHONE_FALLBACK_W = 390;
const PHONE_FALLBACK_H = 844;

/* The shell element, or null before React has mounted it. */
function shell() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root');
}

export function playVw() {
  if (typeof window === 'undefined') return PHONE_FALLBACK_W;
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const el = shell();
  const sw = el ? el.clientWidth : 0;
  /* Only ever NARROWS.  A shell wider than the viewport (or an unmounted one
     reporting 0) must never win, or a phone would start laying out for a size
     it does not have. */
  return sw > 0 && sw < vw ? sw : vw;
}

export function playVh() {
  if (typeof window === 'undefined') return PHONE_FALLBACK_H;
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const el = shell();
  const sh = el ? el.clientHeight : 0;
  return sh > 0 && sh < vh ? sh : vh;
}

export function playIsLandscape() {
  return playVw() > playVh();
}
