/* ═══ v2.3.3872: A BIG STAR THAT SHRINKS ONTO THE MINIMAP'S QUEST STAR ═══
 *
 * The owner, playtesting for the showing: "One other point of confusion might
 * be that they miss the star on the minimap pointing them where to go. Maybe
 * you can make a giant star appear above the minimap and shrink down to just
 * catch attention each time there's a new star?"
 *
 * The Wheel's minimap (rendering/systems/wheelMinimap.js) calls starCue()
 * every frame with the quest's target and where its star stands on the page.
 * When the TARGET is new (not every redraw: the target rounded to TARGET_PX,
 * remembered here, so a minimap rebuilt on the way back into the Wheel does
 * not play it again), a gold star about 4x the minimap's comes up over the
 * box with a soft glow and shrinks onto the star in SHRINK_MS, then is
 * removed.  DOM, not the renderer: one SVG element, portalled to the body
 * (the box's place is the screen's, window.__btWheelMini), animated by the
 * browser (Web Animations) and removed when it ends -- nothing per frame
 * after, nothing to preload (the star is drawn in the SVG).  Under
 * prefers-reduced-motion it appears on the star and fades, with no flight.
 * `?starcue=0` turns it off for one tab.  QA: window.__btStarCue.
 */
const TARGET_PX = 96;          /* game px: a target that moves less is the same target */
const SHRINK_MS = 1000;
const BIG_PX = 64;             /* the minimap's star is 17 px */
const END_PX = 17;
const GOLD = '#F5CE3C';

let lastKey = null;
let live = null;
const qa = { n: 0, last: null, live: 0, off: false,
  /* QA (mp-starcue): forget the target, so the next frame plays it again */
  forget() { lastKey = null; } };

function offByUrl() {
  try { return new URLSearchParams(window.location.search).get('starcue') === '0'; } catch (e) { return false; }
}
function calm() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

const STAR_SVG = '<svg viewBox="-12 -12 24 24" width="100%" height="100%" aria-hidden="true">'
  + '<path d="M0 -11 L3.2 -3.6 L11 -3.4 L4.9 1.6 L7 9.4 L0 5 L-7 9.4 L-4.9 1.6 L-11 -3.4 L-3.2 -3.6 Z"'
  + ' fill="' + GOLD + '" stroke="#5A3D0C" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/** Every frame from the minimap: `target` the quest's place {x, y} in game
    px (null when there is none), `at` its star on the page {x, y}, `box` the
    minimap's rect {left, top, w, h}. */
export function starCue(target, at, box) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') return;
  const key = Math.round(target.x / TARGET_PX) + ',' + Math.round(target.y / TARGET_PX);
  if (key === lastKey) return;
  lastKey = key;
  if (offByUrl()) { qa.off = true; return; }
  if (!at || !box || typeof at.x !== 'number' || typeof at.y !== 'number') return;
  play(at, box);
}

function play(at, box) {
  if (live) { try { live.remove(); } catch (e) { /* gone */ } live = null; }
  const el = document.createElement('div');
  el.setAttribute('data-star-cue', '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = STAR_SVG;
  const s = el.style;
  s.position = 'fixed'; s.left = (at.x - BIG_PX / 2) + 'px'; s.top = (at.y - BIG_PX / 2) + 'px';
  s.width = BIG_PX + 'px'; s.height = BIG_PX + 'px';
  s.pointerEvents = 'none'; s.zIndex = '9100';
  s.filter = 'drop-shadow(0 0 10px rgba(245,206,60,.85)) drop-shadow(0 0 3px rgba(0,0,0,.6))';
  s.willChange = 'transform, opacity';
  document.body.appendChild(el);
  live = el;
  qa.n++;
  qa.live = 1;
  /* it comes up over the middle of the box, a little above it, and flies onto the star */
  const fromX = box.left + box.w / 2 - at.x, fromY = Math.max(BIG_PX / 2 + 4, box.top - 8) - at.y;
  const k = END_PX / BIG_PX;
  qa.last = { from: { x: Math.round(at.x + fromX), y: Math.round(at.y + fromY) }, to: { x: Math.round(at.x), y: Math.round(at.y) }, at: Date.now(), calm: calm() };
  const done = () => {
    if (el.parentNode) el.parentNode.removeChild(el);
    if (live === el) live = null;
    qa.live = document.querySelectorAll('[data-star-cue]').length;
  };
  let anim = null;
  try {
    anim = calm()
      ? el.animate([{ transform: `scale(${k})`, opacity: 1 }, { transform: `scale(${k})`, opacity: 0 }], { duration: SHRINK_MS, easing: 'linear' })
      : el.animate([
        { transform: `translate(${fromX}px, ${fromY}px) scale(0.6)`, opacity: 0 },
        { transform: `translate(${fromX}px, ${fromY}px) scale(1)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${fromX * 0.15}px, ${fromY * 0.15}px) scale(${k * 1.6})`, opacity: 1, offset: 0.85 },
        { transform: `translate(0, 0) scale(${k})`, opacity: 0 },
      ], { duration: SHRINK_MS, easing: 'cubic-bezier(.4,0,.3,1)' });
  } catch (e) { anim = null; }
  if (anim) anim.onfinish = done;
  /* a page in the background never finishes its animations: gone regardless
     (unless QA paused it for a picture: mp-starcue) */
  const fallback = () => { if (anim && anim.playState === 'paused' && el.parentNode) setTimeout(fallback, 500); else done(); };
  setTimeout(fallback, SHRINK_MS + 400);
}

/* QA: the count, the last cue's flight, and how many are on the page */
try { if (typeof window !== 'undefined') window.__btStarCue = qa; } catch (e) { /* no page */ }
