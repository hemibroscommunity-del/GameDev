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
  if (!S) return false;
  if (S._firemaking) { S._firemaking = null; return true; }
  const cf = S._campfire;
  if (cf && typeof cf.litAt === 'number' && now - cf.litAt <= FIRE_REFUSE.LIT_MS) { S._campfire = null; return true; }
  return false;
}
