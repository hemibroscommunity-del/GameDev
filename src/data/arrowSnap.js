/* ═══ v2.3.2704: SOME ARROWS SNAP ═══
 *
 * Owner: "I think it would be cool if some arrows snapped on hitting the
 * target (still causing the same amount of damage) in maybe every 1 out of
 * every 8 hits."
 *
 * PURELY A PICTURE.  A snapped arrow does exactly what a stuck one does to
 * whatever it hit -- the hit, the damage, the claim the worker settles -- and
 * only the drawing afterwards differs: two broken halves and a few splinters
 * instead of a shaft left standing in the body or the rock.  So this file
 * decides nothing but WHETHER a given arrow breaks.
 *
 * A ROLL BOTH SCREENS AGREE ON.  An arrow that snaps on a rock on your screen
 * should snap on the other player's too, so the roll is not Math.random(): it
 * is a hash of the shooter's id and the shot's own timestamp, both of which
 * ride the player_projectile broadcast.  Same two numbers, same answer, with
 * nothing new on the wire.  A shot with NO timestamp never snaps.  Every real
 * one has one (the auto-attack and the retreat shot stamp `_shotTs`, and every
 * client has always sent `ts` on player_projectile), so the only arrows that
 * lack it are ones a QA scenario injects -- and a random one-in-eight there
 * would quietly turn every scenario that expects an arrow to STICK into a
 * one-in-eight flake.
 *
 * FNV-1a over the UTF-16 units of "<id>:<ts>": cheap, dependency-free, and
 * even enough that one arrow in eight comes out true over any run of shots
 * (server/test/props.test.mjs pins the rate and the determinism).
 */
export const ARROW_SNAP_CHANCE = 1 / 8;

export function arrowSnapRoll(ownerId, ts) {
  if (ownerId == null || ts == null || !Number.isFinite(Number(ts))) return 1;   /* never snaps -- see above */
  const s = String(ownerId) + ':' + String(Math.round(Number(ts)));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  /* one more avalanche so ids that differ only in their last character, or
     timestamps one millisecond apart, do not land next to each other */
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Does this arrow snap?  `ownerId` is the shooter, `ts` the shot's own time. */
export function arrowSnaps(ownerId, ts) {
  return arrowSnapRoll(ownerId, ts) < ARROW_SNAP_CHANCE;
}

if (typeof window !== 'undefined') {
  window.__btArrowSnapRoll = (id, ts) => arrowSnaps(id, ts);   /* dev probe, house style */
}
