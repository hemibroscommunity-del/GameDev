/* ═══ v2.3.3574: A PICTURE SAFARI THREW AWAY IS NOTICED ═══
 *
 * The owner, 2026-10-22: "I returned to the game after I went into a
 * different tab on my phone and my character was missing features at certain
 * angles.  In screenshot you can see my head and legs missing" -- the copper
 * torso and greaves, the hair, the slung shield and the staff drawn, and no
 * skin, face or boots under them.
 *
 * The game makes most of its pictures itself, on canvases: every body and
 * armour sheet cut to its frames (gearSheets.packTrimmed), the body baked
 * under the armour a frame at a time, the gathering figures, the effects'
 * strips -- about 690 canvases, ~70 MB, on a phone in BroTown wearing armour
 * (mp-tabwipe's census).  A canvas is sent to the graphics chip only the first
 * time it is DRAWN, and on that phone ~570 of them had not been: the frames of
 * a facing you had not turned to, the poses you had not struck, the armour of
 * a pose not yet worn (the loading screen's upload, v2.3.701, ran before the
 * bake worker delivered most of its frames: 17 of 162 masked frames on the
 * chip).
 *
 * iPhone Safari may empty a canvas while the tab is parked -- most likely the
 * memory behind it given back to the system; the owner's screenshot is the
 * evidence, not a measure on a phone -- and says nothing: a 2D canvas has no
 * context-lost event there (WebKit bug 195325, and MDN's table for
 * `contextlost`).  What was already on the graphics chip is untouched; what
 * is drawn for the first time afterwards is uploaded from the emptied canvas,
 * blank, and stays blank; and anything baked afterwards FROM one (a new frame
 * of the body, from its sheet) is blank too.  Pictures loaded from files
 * (hair, the armour's own art, the shield, the staff) are read again from
 * their files.  That is the owner's screenshot: whatever the body needed that
 * had not been drawn before.  (v2.3.3606: the hair was NOT from a file -- every
 * head piece has been cut onto a canvas since v2.3.2776 -- and went bald the
 * same way; the head pieces are kept as images of themselves now,
 * keepAsImage.js, TRAPS §253.)
 *
 * So each packed picture is WITNESSED as it is made: one of its solid pixels
 * is noted (packTrimmed knows them from its own scan, at no cost).  Coming
 * back to the tab (wsClient's _resumeRecover, on 'visible', 'bfcache' and a
 * thaw), a sample of the witnesses is read again, one pixel each -- the
 * biggest canvases first (the ones a browser puts on the graphics side and
 * can purge) and a spread of the rest.  Two or more read empty: the game's
 * pictures were thrown away, and the one recovery that brings ALL of them
 * back is a fresh page -- BroTown's recovery reload, straight back into the
 * world behind the bro's own veil (game/avatarHold.js), on the same spot of
 * the Wheel (`spot`).  Remaking them in place would mean a remake path in
 * every system that makes a picture (a dozen of them, found by the census),
 * any one of which, missed, leaves its pictures blank.
 *
 * One witness reading empty is not enough: a canvas a later owner cleared on
 * purpose must never reload the game, so one empty in the sample has every
 * witness read before anything is decided.  A witness is only ever a picture
 * made once and kept as it is (packTrimmed's output); one later emptied ON
 * PURPOSE is freed with `width = 0` (gpuOnly.js, the bakes' scratch), and a
 * canvas with no width is skipped.  Witnesses are weak references: a picture
 * let go of is let go of here too.
 *
 * `?canvascheck=0` turns the check off (the game as it was); QA:
 * window.__btCanvasWitness() (the witnesses and the last check).
 *
 * No imports. */

export const CANVAS_CHECK_OFF = typeof location !== 'undefined' && /[?&]canvascheck=0\b/.test(location.search || '');

/* the most witnesses kept (dead ones are dropped first, then the oldest) */
const MAX_WITNESSES = 4000;
/* how many are read on a return: the biggest BIG, a spread of the rest SPREAD */
const CHECK_BIG = 24;
const CHECK_SPREAD = 24;
/* how many empty witnesses mean the pictures were thrown away */
export const EMPTIED_NEED = 2;

const _w = [];
let _last = null;

function _compact() {
  let j = 0;
  for (let i = 0; i < _w.length; i++) {
    const cv = _w[i].ref.deref();
    if (cv && cv.width > 0) _w[j++] = _w[i];
  }
  _w.length = j;
  if (_w.length >= MAX_WITNESSES) _w.splice(0, _w.length - (MAX_WITNESSES >> 1));
}

/** Note that pixel (x, y) of `cv` is solid as the picture is made.  Only for a
 *  canvas kept as it is from here on (a picture's own pixels, never a scratch
 *  pad or one redrawn later). */
export function witnessCanvas(cv, x, y) {
  if (CANVAS_CHECK_OFF || typeof WeakRef !== 'function' || !cv) return;
  if (!(x >= 0) || !(y >= 0) || !(cv.width > x) || !(cv.height > y)) return;
  if (_w.length >= MAX_WITNESSES) _compact();
  _w.push({ ref: new WeakRef(cv), x: x | 0, y: y | 0 });
}

/** Read a sample of the witnesses again.  Returns { checked, emptied, ms }:
 *  `emptied` >= EMPTIED_NEED means the page's pictures were thrown away. */
export function checkWitnesses() {
  const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const live = [];
  for (const e of _w) {
    const cv = e.ref.deref();
    if (cv && cv.width > e.x && cv.height > e.y) live.push({ e, cv, area: cv.width * cv.height });
  }
  let pick = live;
  if (live.length > CHECK_BIG + CHECK_SPREAD) {
    const bySize = live.slice().sort((a, b) => b.area - a.area);
    const big = bySize.slice(0, CHECK_BIG);
    const rest = bySize.slice(CHECK_BIG);
    const step = rest.length / CHECK_SPREAD;
    pick = big;
    for (let i = 0; i < CHECK_SPREAD; i++) pick.push(rest[Math.floor(i * step)]);
  }
  let checked = 0, emptied = 0;
  const read = (p) => {
    let g = null;
    try { g = p.cv.getContext('2d'); } catch (err) { g = null; }
    if (!g) return;
    let a = -1;
    try { a = g.getImageData(p.e.x, p.e.y, 1, 1).data[3]; } catch (err) { a = -1; }
    if (a < 0) return;
    checked++;
    if (a === 0) emptied++;
  };
  for (const p of pick) read(p);
  /* one empty in the sample is not an answer either way: Safari may have
     emptied a few and the sample met one, or a canvas was cleared on purpose.
     Then every witness is read. */
  if (emptied === 1 && pick !== live) {
    const seen = new Set(pick);
    for (const p of live) if (!seen.has(p)) read(p);
  }
  const ms = Math.round(((typeof performance !== 'undefined') ? performance.now() : Date.now()) - t0);
  _last = { at: Date.now(), witnesses: _w.length, live: live.length, checked, emptied, ms, acted: null };
  return _last;
}

/** What the check decided (wsClient fills it in), for the QA probe. */
export function noteCheckActed(what) { if (_last) _last.acted = what; }

if (typeof window !== 'undefined') {
  window.__btCanvasWitness = () => ({ off: CANVAS_CHECK_OFF, witnesses: _w.length, last: _last ? { ..._last } : null });
}
