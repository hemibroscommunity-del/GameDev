/* ═══ v2.3.6555: WHAT THE AIM SHOWS: THE FRAME AND THE CARET (card CT part 22) ═══
 *
 * The owner, 2026-11-25, playing the two buttons (`?manual=5`) with the bow:
 *   "Put a tiny directional Carat out in front of the character so that way
 *    you can see which way your aim is facing (sometimes hard to tell cause
 *    left thumb covers directional pad)"
 *   "Instead of tiny red hollow arrow above the monster that it tentatively
 *    targeted it needs to be something larger like the old way where it
 *    frames the monster enemy in a large but semi transparent square shape
 *    reticle. The frame should be yellow if that monster is in queue for
 *    lock on targeting (no first hits yet) and after you hit the monster it
 *    turns red and locks on."
 *
 * So, at a glance with the left thumb over the stick, three things:
 *   - the FRAME, one at a time: YELLOW on the monster the next press of
 *     Attack would take -- asked of the press's own function (latch.js
 *     sightNow, sight.js sightPick over the drawn facing), never a second
 *     copy of its rule -- and RED on the latch's monster (`_latchPhase`
 *     'active' or 'auto') from the press that locks it.  Red at the LOCK,
 *     not at the arrow's landing: a shot that misses a locked monster must
 *     not leave it yellow.  While a latch holds there is no yellow frame;
 *   - the CARET: which way a press goes -- at the latch's monster while a
 *     latch holds, else along the DRAWN facing (drawnFace: the eight ways the
 *     sight really reads, not the thumb's analog angle).  Shown while the bro
 *     is alive, on foot (not riding), and not in a harvest, fishing or
 *     cooking beat (S._extraction) or a talk (a panel over the world:
 *     S._uiBusy).
 * Both only in the two buttons on a touch screen (twoButtonsLive, the one
 * gate); `?targetframe=0` hides the frame (and gives the chevrons back),
 * `?aimcaret=0` hides the caret.
 *
 * This file says WHAT shows; the renderer (effectsRenderer.js, the
 * AimFrame/AimCaret of rendering/lockReticle.js) only draws it.  No imports
 * from the page: node tests it (server/test/aim-marks.test.mjs).
 */
import { sightNow, latchLocked, twoButtonsLive } from './latch.js';
import { drawnFace } from './sight.js';
import { isRiding } from './ride.js';
import { sw, readerFor } from './switches.js';

/* The look, in CSS px (the renderer divides by the world's scale).  The
   card's numbers: the frame the drawn box x 1.25, never under 48 a side, a
   2 px line on the dark keyline, about 0.6 alpha, no fill; the caret 26 px
   from the feet's middle, about 8 px wide, brass on the keyline, 0.75. */
export const AIM = Object.freeze({
  YELLOW: 0xF2C94C,
  RED: 0xFF3C3C,
  BRASS: 0xD8A85F,
  KEYLINE: 0x14181A,
  BOX: 1.25,
  MIN_SIDE: 48,
  LINE: 2,
  FRAME_ALPHA: 0.6,
  CARET_OUT: 26,
  CARET_W: 8,
  CARET_ALPHA: 0.75,
});

/* The frame's two tones: 'pick' (the next press's monster) and 'lock'. */
export const AIM_TONES = Object.freeze({ pick: AIM.YELLOW, lock: AIM.RED });

/** The switches and the gate: { live, frame, caret }.  `search` is for
 *  tests (the page's own address when not given); `live` the two buttons'
 *  gate (twoButtonsLive) when not given.  ONE object, reused (the renderer
 *  asks once a frame): read it before the next call. */
const _GATE = { live: false, frame: false, caret: false };
export function aimGate(search, live) {
  const off = typeof search === 'string' ? readerFor(search).sw : sw;
  _GATE.live = typeof live === 'boolean' ? live : twoButtonsLive();
  _GATE.frame = !off('targetframe');
  _GATE.caret = !off('aimcaret');
  return _GATE;
}

function up(m) {
  return !!m && !!m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) && isFinite(m.x) && isFinite(m.y);
}
function monById(S, id) {
  if (id == null) return null;
  const k = String(id);   /* String() both sides: ids are numbers in some spawn paths (latch.js findMon) */
  const ms = Array.isArray(S.monsters) ? S.monsters : [];
  for (let i = 0; i < ms.length; i++) { const m = ms[i]; if (m && m.id != null && String(m.id) === k) return m; }
  return null;
}

/* ONE object, reused: this runs every frame (no garbage a frame).  Read it
   before the next call. */
const _OUT = { frame: null, tone: null, color: 0, caret: null };

/** What the aim shows this frame.  `gate` aimGate's (read afresh when not
 *  given).  Returns { frame: the monster framed or null, tone: 'pick' |
 *  'lock' | null, color: its tone's colour (0 none), caret: the caret's
 *  angle in radians (0 east, PI/2 south) or null }. */
export function aimMarks(S, gate) {
  const g = gate || aimGate();
  _OUT.frame = null; _OUT.tone = null; _OUT.color = 0; _OUT.caret = null;
  if (!g.live || !S || typeof S !== 'object' || !S.player || S._zoneLoading) return _OUT;
  const P = S.player;
  const locked = latchLocked(S);
  const lm = locked ? monById(S, S._latchId) : null;
  const lockUp = up(lm);
  if (g.frame) {
    if (locked) {
      if (lockUp) { _OUT.frame = lm; _OUT.tone = 'lock'; }
    } else {
      const pk = sightNow(S);
      const m = pk ? monById(S, pk.id) : null;
      if (up(m)) { _OUT.frame = m; _OUT.tone = 'pick'; }
    }
    if (_OUT.tone) _OUT.color = AIM_TONES[_OUT.tone];
  }
  if (g.caret && caretShown(S)) {
    _OUT.caret = lockUp && (lm.x !== P.x || lm.y !== P.y) ? Math.atan2(lm.y - P.y, lm.x - P.x) : drawnFace(S);
  }
  return _OUT;
}

/** The frame's half sides round a drawn body box {hw, hh} (world px), `k`
 *  world px a CSS px: x BOX, and never under MIN_SIDE a side.  ONE object,
 *  reused (the renderer asks once a frame): read it before the next call. */
const _BOX = { hw: 0, hh: 0 };
export function aimFrameBox(b, k) {
  const min = (AIM.MIN_SIDE / 2) * k;
  _BOX.hw = Math.max(b.hw * AIM.BOX, min);
  _BOX.hh = Math.max(b.hh * AIM.BOX, min);
  return _BOX;
}

/** The bro can wear the caret: alive, on foot, not in a harvest, fishing or
 *  cooking beat (S._extraction) and not talking (a panel over the world). */
export function caretShown(S) {
  if (!S || !S.player) return false;
  if (S._dying || (S.rpg && typeof S.rpg.hp === 'number' && S.rpg.hp <= 0)) return false;
  return !isRiding(S) && !S._extraction && !S._uiBusy;
}
