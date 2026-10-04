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
import { jumpRefusal, startJump, endJump, jumpActive, JUMP_MS, JUMP_PEAK } from '@/game/jump.js';
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
  var why = jumpRefusal(S, now, {
    stunned: !!(S._playerStunUntil && now < S._playerStunUntil),
    stuck: isStuck(S, now),
    dazed: isDazed(S, now),
  });
  S._jumpWhy = why;
  if (why) return false;
  /* a raised shield goes down, as it does for a roll (dodge.js) */
  dropShield(S, 'jump');
  var d = heldDirection(S);
  var j = startJump(S, now, d.dx, d.dy);
  j.zone = S.currentZone;   /* a zone left mid-air ends it (tickJump) */
  if (jumpMsOverride()) j.dur = jumpMsOverride();
  S._jumpCount = (S._jumpCount || 0) + 1;
  /* the push-off: a step on the ground you are standing on */
  try { if (BT_AUDIO.footstep) BT_AUDIO.footstep(isWearingArmor(), footstepSurface(S)); } catch (e) { /* audio is best-effort */ }
  if (S.channel) {
    try {
      S.channel.send({ type: 'broadcast', event: 'player_jump',
        payload: { id: S.myId, ts: now, dur: j.dur || JUMP_MS, peak: j.peak || JUMP_PEAK } });
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
  if (dead || (j.zone && j.zone !== S.currentZone)) { endJump(S, now); return false; }
  if (jumpActive(j, now)) return false;
  endJump(S, now);
  return true;
}

/** The touch-down: a step on what you landed on (the splash is the water's,
    wheelSwim.js, so nothing here when you came down in it).  The dust is
    worldFx's, off the same moment (S._jumpLandAt). */
export function landJump(S) {
  if (!S || isWheelSwimming(S)) return;
  try { if (BT_AUDIO.footstep) BT_AUDIO.footstep(isWearingArmor(), footstepSurface(S)); } catch (e) { /* audio is best-effort */ }
}
