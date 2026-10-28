/* ═══ v2.3.3748: STANDING IN A BURNING HEAP SETS YOU ON FIRE ═══
 *
 * The owner, 2026-10-28: "if you stand in a burning pile of flames from a
 * building prop getting destroyed you get on fire and take damage (same flame
 * effect as the building)".
 *
 * A building's fire is on each phone's screen only (rendering/buildingFire.js,
 * game/wheelBreak.js: the worker knows nothing of it), and damage is the
 * worker's.  So the phone SAYS so: while your boots stand in a burning piece
 * of a fallen building's heap on your screen, it sends `heap_burn` about once
 * a second, and the worker burns you at its own capped rate while the phone
 * keeps saying so (server heapburn.js).  A phone that lies can only hurt
 * itself.  Only against a worker that says `caps.heapburn`.
 *
 * The look is yours at once: on fire (the building's own flames on you,
 * rendering/buildingFire.js PersonFire) for as long as you stand in it and a
 * moment after.  The number and your health bar are the worker's.
 *
 * No imports: node tests it (heap-burn suite).
 */
export const HEAP_BURN = Object.freeze({
  /* one `heap_burn` at most this often: the worker's tick is 1000 ms, and a
     message just under it never leaves a tick unasked for */
  SEND_MS: 900,
  /* the flames stay on you this long after you step out */
  LOOK_MS: 450,
});

/**
 * One frame.  `inFire`: your boots stand in a burning heap piece on this
 * screen (buildingFire.burningAt), `ok`: the worker burns (caps.heapburn), in
 * the world, alive.  Sets S._heapBurnUntil (the look) and returns true when a
 * `heap_burn` should go now.
 */
export function heapBurnStep(S, inFire, ok, now) {
  if (!S) return false;
  if (!ok || !inFire) return false;
  S._heapBurnUntil = now + HEAP_BURN.LOOK_MS;
  if (now - (S._heapBurnSentAt || 0) < HEAP_BURN.SEND_MS) return false;
  S._heapBurnSentAt = now;
  return true;
}
