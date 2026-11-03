/* ═══ v2.3.3991: THE TOWNSFOLK CHATTER LESS, AND ONLY IN TOWN ═══
   The owner, 2026-11-02: "Way too much town chatter idle while exploring the
   world."

   Measured on main (v2.3.3895): each of the 21 townsfolk said a random idle
   line every 8-23 s, about 1.4 lines a second town-wide, and everywhere in the
   one 'wheel' zone -- the bubbles draw within 2,400 world px
   (effectsRenderer's NPC_BUBBLE_REACH), so a player out in a land still read
   the town talking behind them.

   Now an IDLE line (the random phrase, nothing to do with a quest) plays only:
     - while you are in BroTown (in the Wheel: inside its safe ground,
       ZONES.wheel.safeR from its middle -- the "Brotown · safe" plate), and
     - within IDLE_REACH (350 px) of that townsperson, and
     - at most one town-wide every IDLE_GAP_MS (20 s);
   and each townsperson's own timer runs 30-60 s.  The quest lines (the
   offer's "I have a task for you!", the hand-in cue, a follower's progress
   line), talking, and the hum when you start talking are unchanged: they do
   not come through here.

   ?townchat=0 is the off-ramp (the old cadence, for one tab).

   No imports: node tests it (server/test/town-chatter.test.mjs). */

export var IDLE_REACH = 350;
export var IDLE_GAP_MS = 20000;
export var IDLE_TIMER_MIN_MS = 30000;
export var IDLE_TIMER_MAX_MS = 60000;
/* the old cadence, kept for the quest hints that share the timer and for
   ?townchat=0 */
export var OLD_TIMER_MIN_MS = 8000;
export var OLD_TIMER_SPAN_MS = 15000;

var _off = null;
export function townChatOff() {
  if (_off === null) {
    try { _off = typeof location !== 'undefined' && /[?&]townchat=0(?:&|$)/.test(location.search); } catch (e) { _off = false; }
  }
  return _off;
}

/* Are you in town?  In the Wheel, inside the safe ground's circle (`centre`
   [x, y] and radius `safeR`, game px: game/rideGround.js, the Wheel the room
   plays -- the zone's own w/h is the short Wheel's).  A zone that is not the
   Wheel (an old town, a test map) is all town. */
export function inTownAt(zoneId, centre, safeR, px, py) {
  if (zoneId !== 'wheel') return true;
  if (!centre || !(safeR > 0)) return false;
  var dx = px - centre[0], dy = py - centre[1];
  return dx * dx + dy * dy <= safeR * safeR;
}

/* May this townsperson say an idle line now?  `S` the game's state (holds
   the town-wide stamp `_idleChatAt`), `dist` from you to them, `inTown` from
   inTownAt.  True stamps the town's clock: the caller then shows the line. */
export function idleChatMay(S, dist, inTown, now) {
  if (townChatOff()) return true;
  if (!S || !inTown || !(dist <= IDLE_REACH)) return false;
  if (S._idleChatAt != null && now - S._idleChatAt < IDLE_GAP_MS) return false;
  S._idleChatAt = now;
  S._idleChatSeq = (S._idleChatSeq || 0) + 1;   /* QA readout (mp-quiettown) */
  return true;
}

/* The townsperson's next timer after an idle turn (said or not). */
export function idleChatTimer(rnd) {
  var r = typeof rnd === 'number' ? rnd : Math.random();
  if (townChatOff()) return OLD_TIMER_MIN_MS + r * OLD_TIMER_SPAN_MS;
  return IDLE_TIMER_MIN_MS + r * (IDLE_TIMER_MAX_MS - IDLE_TIMER_MIN_MS);
}
