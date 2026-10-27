/* ═══ v2.3.3017: TAKING OFF AND TOUCHING DOWN ═══
 *
 * game/jump.js has the rules (pure, node-tested); this is the part that
 * touches the game: the button (ui/panels/JumpButton.jsx) and the X key
 * (desktopControls.js) call triggerJump, and BroTown's loop calls tickJump
 * once a frame, before the water and the walk.
 *
 * The worker hears nothing new.  Your position streams as it does for a roll
 * (BroTown's move broadcast counts a jump as moving), and other players are
 * told with a `player_jump` relay -- the router's default branch fans out
 * anything that is not server-only (server/src/index.js), as it does
 * player_dodge -- which they draw (game events -> other._jump).  An old
 * client ignores it and sees you glide a step. */
import { BT_AUDIO } from '@/data/index.js';
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: a jump's push-off and landing */
import { jumpRefusal, startJump, endJump, jumpActive, JUMP_MS, JUMP_PEAK, startFlip, flipRefusal } from '@/game/jump.js';   /* v2.3.3682: + the flip */
import { isSprinting } from '@/game/sprint.js';   /* v2.3.3682: a jump sprinted into flips bigger */
import { pushDmgPopup, heroPopupY } from '@/game/combatHelpers.js';   /* v2.3.3682: "Perfect!" over you */
import { dropShield } from '@/game/shieldToggle.js';
import { isStuck, isDazed } from '@/game/elemHits.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';
import { footstepSurface } from '@/game/worldTrial.js';
import { isWearingArmor } from '@/rendering/gearCatalog.js';

/* QA, the `?repairms=` habit (wheelBreak.js): `?jumpms=` lengthens the jump
   (200-3000 ms) -- a test machine drawing a frame every ~200 ms gets three
   frames of a 560 ms jump, too few to carry the feet over anything.  Read once. */
var _jumpMs;
function jumpMsOverride() {
  if (_jumpMs !== undefined) return _jumpMs;
  _jumpMs = null;
  try {
    var m = /(?:^|[?&])jumpms=(\d+)/.exec((typeof window !== 'undefined' && window.location && window.location.search) || '');
    if (m) _jumpMs = Math.max(200, Math.min(3000, +m[1]));
  } catch (e) { /* no window */ }
  return _jumpMs;
}

/** The stick (or WASD) right now, as a vector of length <= 1. */
function heldDirection(S) {
  var dx = S.stickX || 0, dy = S.stickY || 0;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
    var K = S.keys || {};
    dx = 0; dy = 0;
    if (K.ArrowUp || K.w || K.W) dy = -1;
    if (K.ArrowDown || K.s || K.S) dy = 1;
    if (K.ArrowLeft || K.a || K.A) dx = -1;
    if (K.ArrowRight || K.d || K.D) dx = 1;
  }
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) { dx /= len; dy /= len; }
  return { dx: dx, dy: dy };
}

/**
 * Jump, if you may: true when you took off.  Refused quietly -- a jump is
 * half a second and a note over your head for each early press would be
 * noise -- with the reason kept for QA (S._jumpWhy).
 */
export function triggerJump(S) {
  if (!S) return false;
  var now = Date.now();
  var extra = {
    stunned: !!(S._playerStunUntil && now < S._playerStunUntil),
    stuck: isStuck(S, now),
    dazed: isDazed(S, now),
  };
  var why = jumpRefusal(S, now, extra);
  /* v2.3.3682: a second press in the air is the flip (triggerFlip) */
  if (why === 'airborne') return triggerFlip(S, now, extra);
  S._jumpWhy = why;
  if (why) return false;
  /* a raised shield goes down, as it does for a roll (dodge.js) */
  dropShield(S, 'jump');
  var d = heldDirection(S);
  var j = startJump(S, now, d.dx, d.dy);
  j.zone = S.currentZone;   /* a zone left mid-air ends it (tickJump) */
  if (jumpMsOverride()) j.dur = jumpMsOverride();
  /* v2.3.3682: what a flip needs to know of its jump -- sprinted into, and
     the way it went (the somersault faces it) */
  j.sprint = isSprinting(S);
  j.ang = flipAngle(S, d);
  /* where the jump left the ground, for its landing's record (S._lastJumpRun) */
  if (S.player) { j.x0 = S.player.x; j.y0 = S.player.y; }
  j.air0 = now;
  S._jumpCount = (S._jumpCount || 0) + 1;
  /* the push-off: a step on the ground you are standing on */
  try { if (BT_AUDIO.footstep) BT_AUDIO.footstep(isWearingArmor(), footstepSurface(S)); } catch (e) { /* audio is best-effort */ }
  cue('jumpUp');   /* v2.3.3343: ...and a rush of air over it (one plain step was all; SOUND-GAPS) */
  if (S.channel) {
    try {
      S.channel.send({ type: 'broadcast', event: 'player_jump',
        payload: { id: S.myId, ts: now, dur: j.dur || JUMP_MS, peak: j.peak || JUMP_PEAK } });
    } catch (e) { /* a lost relay costs a peer the picture, nothing else */ }
  }
  return true;
}

/* v2.3.3682: the way a flip's somersault faces -- the stick if held, else
   the way the jump went, else the way you face */
function flipAngle(S, d) {
  if (d && (Math.abs(d.dx) > 0.1 || Math.abs(d.dy) > 0.1)) return Math.atan2(d.dy, d.dx);
  var j = S._jump;
  if (j && (Math.abs(j.dx || 0) > 0.1 || Math.abs(j.dy || 0) > 0.1)) return Math.atan2(j.dy, j.dx);
  return typeof S._facingAngle === 'number' ? S._facingAngle : Math.PI / 2;
}

/* "Perfect!" in the gold of a good find, the message size (effectsRenderer) */
export var FLIP_PERFECT_COLOR = '#FFD45E';

/**
 * ═══ v2.3.3682: THE DOUBLE JUMP -- A FLIP ═══
 * The second press in the air (game/jump.js startFlip has the rules): once a
 * jump, between FLIP_FROM and FLIP_TO of it, not stunned, held or dazed.
 * Refused quietly as a jump is, the reason kept as `flip-<why>`.  The relay
 * is the jump's own, `player_jump`, carrying the flip (`flip: 1`, its height,
 * push and pull, the way it faces): an older screen reads it as a second hop
 * of `dur` and `peak`, nearly the same picture.
 */
export function triggerFlip(S, now, extra) {
  if (!S || !S._jump) return false;
  if (extra && (extra.stunned || extra.stuck || extra.dazed)) {
    S._jumpWhy = 'flip-' + (extra.stunned ? 'stunned' : extra.stuck ? 'stuck' : 'dazed');
    return false;
  }
  var j = S._jump;
  var no = flipRefusal(j, now);
  if (no) { S._jumpWhy = 'flip-' + no; return false; }
  var d = heldDirection(S);
  var f = startFlip(j, now, { sprint: isSprinting(S), dx: d.dx, dy: d.dy, ang: flipAngle(S, d) });
  if (!f) { S._jumpWhy = 'flip-none'; return false; }
  f.zone = j.zone || S.currentZone;
  f.x0 = j.x0; f.y0 = j.y0; f.air0 = j.air0 || j.t0;
  S._jump = f;
  S._jumpWhy = null;
  S._flipCount = (S._flipCount || 0) + 1;
  S._lastFlip = { at: now, grade: f.grade, boost: f.boost, perfect: f.perfect, sprint: f.sprint, phase: f.at, dur: f.dur, peak: f.peak, h0: f.h0 };
  cue('jumpFlip');
  if (f.perfect && S.player) {
    try { pushDmgPopup(S, S.player.x, heroPopupY(S), 'Perfect!', FLIP_PERFECT_COLOR, { ts: now + 1 }); } catch (e) { /* a word only */ }
  }
  if (S.channel) {
    try {
      S.channel.send({ type: 'broadcast', event: 'player_jump',
        payload: { id: S.myId, ts: now, dur: f.dur, peak: f.peak, flip: 1,
          h0: +f.h0.toFixed(2), v: +f.v.toFixed(5), g: +f.g.toFixed(7), ang: +f.ang.toFixed(3) } });
    } catch (e) { /* a lost relay costs a peer the picture, nothing else */ }
  }
  return true;
}

/**
 * Once a frame, before the water and the walk.  Ends a jump whose time is up
 * (or cuts it short: dead, or a zone left mid-air).  Returns true on the
 * frame you touch down, so BroTown can sound it after the water has decided
 * whether you landed in it.
 */
export function tickJump(S, now, dead) {
  var j = S && S._jump;
  if (!j) return false;
  if (dead || (j.zone && j.zone !== S.currentZone)) { endJump(S, now); S._jumpLandFx = null; return false; }
  if (jumpActive(j, now)) return false;
  endJump(S, now);
  /* v2.3.3499: a jump that came down on its own lands with a squash that
     springs back (rendering/jumpFx.js, game/jump.js jumpLook), timed off the
     jump's own end and length; one cut short (a death, a zone left) does not.
     v2.3.3682: a flip's squash is its jump's (baseDur: the length `?jumpms=`
     set), from the flip's own end */
  S._jumpLandFx = { at: j.t0 + j.dur, dur: j.baseDur || j.dur };
  /* v2.3.3682: how far this jump carried you and how long it was in the air,
     flip or not (QA reads it: mp-doublejump) */
  if (S.player && Number.isFinite(j.x0)) {
    S._lastJumpRun = { dist: Math.hypot(S.player.x - j.x0, S.player.y - j.y0), airMs: now - (j.air0 || j.t0),
      flip: !!j.flip, grade: j.flip ? j.grade : null, boost: j.flip ? j.boost : null };
  }
  return true;
}

/** The touch-down: a step on what you landed on (the splash is the water's,
    wheelSwim.js, so nothing here when you came down in it).  The dust is
    worldFx's, off the same moment (S._jumpLandAt). */
export function landJump(S) {
  if (!S || isWheelSwimming(S)) return;
  try { if (BT_AUDIO.footstep) BT_AUDIO.footstep(isWearingArmor(), footstepSurface(S)); } catch (e) { /* audio is best-effort */ }
  cue('jumpLand');   /* v2.3.3343: ...with the landing's weight under the step */
}
