/* ═══ v2.3.4801: THE BOW'S DRAW AND THE STAFF'S GATHER -- THE PHONE'S RULES ═══
 *
 * The owner, 2026-11-11: "Think about the sword swing.  The bow pull back and
 * release.  The staff building power and blasting the orb."  And, approving
 * the design: "build all of them (sword, bow, magic)".  The worker's half is
 * server/src/drawgather.js (its header has the whole of it); this file is
 * what the phone needs to agree with it, with NO imports so node tests it.
 *
 * THE WIRE (the phone sends; the worker bounds):
 *   - a bow's arrow, its `player_projectile` relay: `dr`, the DRAW, whole ms
 *     from the nock to the release, on the phone's own clock (buildWire);
 *   - a staff's bolt, the same relay with `isStaff: true`: `ga`, the GATHER,
 *     whole ms from the thumb down to the blast (buildWire);
 *   - both relays carry `ts` (the shot's own stamp, as today), and every hit
 *     claim of that arrow or bolt names it: `sw: ts` on `monster_damage` AND
 *     on `pvp_attack` (the bow's perfect strike already names it on
 *     monster_damage; a bolt's claims and a projectile's claim on a player
 *     must start to).  A claim naming no shot lands as today's.
 *   - only against a worker advertising the cap: `caps.bowDraw` for `dr`,
 *     `caps.staffGather` for `ga` (each off with its live flag, `bowdraw: false`
 *     / `staffgather: false`, and then the phone plays today's bow or staff).
 *
 * WHAT THE WORKER DOES WITH THEM (mirrored here so the phone shows the same):
 *   - the shot's damage is its SHARE of a full build, buildShare(ms, full):
 *     full draw = fullDrawMs(the held bow's interval) -- today's flicked bow,
 *     371 ms on a new character, so a full draw a cycle is today's damage a
 *     second; full gather = fullGatherMs(the held staff's interval) -- the
 *     staff's own 900 ms; the worker never counts more than the time since
 *     your last bow shot or bolt (one clock for both);
 *   - FULL_SHARE (0.8) and over carries the extras, as a sword's swing does:
 *     the shove, the gem's status, its collision and mana, the spark;
 *   - the bow's PERFECT SHOT: a draw from full to PERFECT_DRAW_MS after it
 *     (drawPerfect) -- x1.12 and a little mana, on a monster only.  The
 *     staff has NO perfect (the owner: "For magic I think it should be
 *     skipped");
 *   - the staff's STAGE, gatherStage(share): SPARK under ORB_SHARE, ORB
 *     from it, SPHERE from SPHERE_SHARE; the stage sets the splash's reach
 *     (SPLASH_K of the basic bolt's 60 px, x Detonation) and the ring of
 *     force that throws the monsters round the impact outward (RING_PX,
 *     monsters only: knock-back is monster-only by the owner's decision);
 *   - one counted shot at most every MIN_GAP_MS: a quicker one lands
 *     nothing and leaves the clock alone (as the sword's MIN_SWING_GAP_MS).
 *
 * Pinned to the worker's copy by server/test/draw-gather.test.mjs §1.
 */

export const DRAW_GATHER = Object.freeze({
  /* the full draw is the flicked bow's interval (manualCombat.js
     mcBowInterval: x BOW_FASTER of the held bow's, never under BOW_MIN_MS) */
  BOW_FASTER: 0.75,
  BOW_MIN_MS: 215,
  /* the full gather is the held staff's interval and its extra 300 ms
     (monsterCombat.js _staffCdExtra) */
  STAFF_EXTRA_MS: 300,
  /* the perfect shot: released from full draw to this many ms after it --
     the sword's PERFECT_LATE_MS, a thumb's answer to a cue it sees and
     hears (the line going gold, the click) */
  PERFECT_DRAW_MS: 300,
  /* the share that carries a full shot's extras (the sword's FULL_SWING_SHARE) */
  FULL_SHARE: 0.8,
  /* the staff's stages, by share: the sphere is the full bolt (it carries
     the extras), the orb half of it, so the two pulses land evenly through
     the gather (360 and 720 ms of a new character's 900) */
  ORB_SHARE: 0.4,
  SPHERE_SHARE: 0.8,
  /* the splash's reach x the basic bolt's (STAFF_SPLASH 60 px), and the
     ring's outward shove (px, monsters only), by stage: spark, orb, sphere.
     The sphere is today's bolt (its 60 px), so a full gather's damage a
     second over a pack is today's */
  SPLASH_K: Object.freeze([0, 0.6, 1]),
  RING_PX: Object.freeze([0, 15, 30]),
  /* one counted shot at most every this many ms */
  MIN_GAP_MS: 100,
  /* a claim past this is sent as this (a long hold is a full one anyway) */
  CLAIM_MAX_MS: 60000,
});

export const STAGE = Object.freeze({ SPARK: 0, ORB: 1, SPHERE: 2 });
export const STAGE_NAMES = Object.freeze(['spark', 'orb', 'sphere']);
/* the relay's fields, by weapon */
export const BUILD_FIELDS = Object.freeze({ bow: 'dr', staff: 'ga' });

/** The full draw, ms, from the held bow's interval (the loop's
 *  effectiveSwingCd for a bow, before mcBowInterval): the flicked bow's. */
export function fullDrawMs(heldBowMs) {
  return Math.max(DRAW_GATHER.BOW_MIN_MS, Math.floor((Number(heldBowMs) || 0) * DRAW_GATHER.BOW_FASTER));
}
/** The full gather, ms, from the held staff's interval (the loop's
 *  effectiveSwingCd for a staff, without its +300). */
export function fullGatherMs(heldStaffMs) {
  return Math.max(0, Math.floor(Number(heldStaffMs) || 0)) + DRAW_GATHER.STAFF_EXTRA_MS;
}
/** A build of `ms` of a full `fullMs`: its share, 0..1. */
export function buildShare(ms, fullMs) {
  const m = Number(ms), f = Number(fullMs);
  if (!Number.isFinite(m) || !(m > 0) || !Number.isFinite(f) || !(f > 0)) return 0;
  return Math.min(1, m / f);
}
/** Is a draw of `ms` on a full draw of `fullMs` the perfect shot? */
export function drawPerfect(ms, fullMs) {
  const m = Number(ms), f = Number(fullMs);
  return Number.isFinite(m) && Number.isFinite(f) && f > 0 && m >= f && m <= f + DRAW_GATHER.PERFECT_DRAW_MS;
}
/** The staff's stage for a share: STAGE.SPARK, ORB or SPHERE. */
export function gatherStage(share) {
  const s = Number(share) || 0;
  return s >= DRAW_GATHER.SPHERE_SHARE ? STAGE.SPHERE : s >= DRAW_GATHER.ORB_SHARE ? STAGE.ORB : STAGE.SPARK;
}
/** ...and for a gather of `ms` on a full gather of `fullMs`. */
export function gatherStageAt(ms, fullMs) { return gatherStage(buildShare(ms, fullMs)); }
/** A build time as the wire carries it: whole ms, 0..CLAIM_MAX_MS. */
export function buildWire(ms) {
  const m = Number(ms);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return Math.min(DRAW_GATHER.CLAIM_MAX_MS, Math.round(m));
}
