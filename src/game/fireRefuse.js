/* ═══ v2.3.4886: A FIRE THE WORKER REFUSED IS TAKEN BACK ═══
 *
 * Tapping a log lights a fire on the phone at once (BroTown.jsx
 * firemakingBus: the light, S._firemaking, then the campfire S._campfire
 * 0.7 s later) and asks the worker (`firemaking_request`).  When the worker
 * holds no such log it sends the bag back and `firemaking_refused`
 * (cooking.js; the refusal door, TRAPS §284), and the phone takes back what
 * it drew: the light still in flight, or the campfire lit from it a moment
 * ago.  A fire lit longer ago than LIT_MS is an older one, and stays.
 *
 * No imports: node tests it (fire-refuse suite).
 */
export const FIRE_REFUSE = Object.freeze({
  /* a refusal answers in a round trip; a campfire lit this recently is the
     one that light made */
  LIT_MS: 5000,
});

/** Takes back the refused fire.  Returns true when something was taken. */
export function takeBackFire(S, now) {
  return !!takeBackFireWhat(S, now);
}

/* v2.3.4942: ...and which: 'light' (still in flight: no campfire was lit, so
   no `campfire_lit` went to the others) or 'fire' (the campfire lit from it,
   already relayed: the others are told it is out, campfireOutMsg).  null when
   nothing was taken. */
export function takeBackFireWhat(S, now) {
  if (!S) return null;
  if (S._firemaking) { S._firemaking = null; return 'light'; }
  const cf = S._campfire;
  if (cf && typeof cf.litAt === 'number' && now - cf.litAt <= FIRE_REFUSE.LIT_MS) { S._campfire = null; return 'fire'; }
  return null;
}

/* ═══ v2.3.4942: AND THE OTHERS ARE TOLD IT IS OUT ═══
   The campfire lit on the tap went to every other phone (`campfire_lit`, a
   relay, BroTown.jsx), which drew it for its 45 s: a refused fire, put out
   on the lighter's phone, still burned on everyone else's.  So the lighter's
   phone relays `campfire_out` once, after the fire it relayed is put out.
   Sent by the lighter rather than the worker: the relay keeps the socket's
   order, so it always lands after its `campfire_lit` (the worker's refusal
   comes BEFORE that relay whenever the round trip is under the 0.7 s light,
   and would be overtaken by it).  The worker rebuilds it in the sender's name
   (relay.js), so it can only put out the sender's own fire.  One message,
   only on a refusal; `firerefuse: false` stops it with the refusal. */
export function campfireOutMsg(S) {
  return { type: 'broadcast', event: 'campfire_out', payload: { id: S && S.myId, zone: S && S.currentZone } };
}

/** A peer's fire, put out on this screen (gameEvents.js `campfire_out`):
    the sender's own entry only.  True when one was burning. */
export function peerFireOut(S, payload) {
  if (!S || !payload || payload.id == null || payload.id === S.myId) return false;
  const m = S._peerCampfires;
  if (!m || typeof m.delete !== 'function') return false;
  return m.delete(String(payload.id));
}
