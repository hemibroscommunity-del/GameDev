/* ═══ v2.3.2229 / v2.3.2230: TARGETING — the perimeter, the lock, the switch ═══
 *
 * Owner: "Combat will rely on the auto targeting system. The contextual
 * button will say 'attack' on it to engage the enemy and begin the existing
 * targeting system (currently tap to lock on monster). ... Monsters will
 * have a circular perimeter around them for targeting zone. It'll be same
 * for all weapon types. If multiple monsters in same perimeter there will
 * be arrows above the dashboard on that right side beneath the right button
 * that allows you to switch targets. Otherwise the target stays locked on
 * the same monster."
 *
 * The lock itself is unchanged -- the same {type:'monster', id, ref} the
 * canvas tap writes, read by the swing sweep, the projectile aim, the shield
 * angle, the reticle and the renderer's facing.  What this module adds:
 *
 *   - CANDIDATES (v2.3.2230): every alive, tangible monster whose
 *     TARGET_PERIMETER_PX circle the player is standing inside, refreshed
 *     once per frame into S._targetCands (nearest first) so the arrows, the
 *     rings and the shield button all read one list.
 *   - ENGAGE (v2.3.2229): pressing Attack with no live lock locks the nearest
 *     candidate.  Nothing in range -> no lock, and the press still swings.
 *   - PERSISTENCE (v2.3.2230): a lock holds while its monster stays inside
 *     the perimeter x TARGET_HYST -- "otherwise the target stays locked on
 *     the same monster".  The hysteresis ring is what stops a target dancing
 *     on the edge from flickering in and out.  It drops on death, on leaving
 *     that ring, or on zone change (zoneTransitions already clears it).
 *   - SWITCH (v2.3.2230): with two or more candidates, cycleTarget steps
 *     through them in SCREEN-X order, so the left arrow always means "the
 *     one to the left of this one".
 *
 * Tap-to-lock is kept as the manual override (control-redesign.md §5.1); a
 * tapped lock outside the perimeter is left alone by the persistence rule
 * until it dies or the player walks further than the hysteresis ring.
 * NPC and player locks (a duel opponent) are never touched here -- those are
 * deliberate taps and mean something else.
 */
import { TARGET_PERIMETER_PX, TARGET_HYST } from '@/data/index.js';
import { isIntangible } from '@/data/monsterVariants.js';

function monPos(m) {
  const x = (typeof m.renderX === 'number' && isFinite(m.renderX)) ? m.renderX : m.x;
  const y = (typeof m.renderY === 'number' && isFinite(m.renderY)) ? m.renderY : m.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  return { x: x, y: y };
}

function monLive(m) {
  return !!m && m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) && !isIntangible(m);
}

/* Every monster the player could engage right now, nearest first. */
export function targetCandidates(S, radiusPx) {
  const out = [];
  if (!S || !S.player || !S.monsters) return out;
  const P = S.player;
  const R = radiusPx || TARGET_PERIMETER_PX;
  const R2 = R * R;
  for (let i = 0; i < S.monsters.length; i++) {
    const m = S.monsters[i];
    if (!monLive(m)) continue;
    const p = monPos(m);
    if (!p) continue;
    const dx = p.x - P.x, dy = p.y - P.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= R2) out.push({ m: m, d2: d2, x: p.x, y: p.y });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/* Is the current lock a MONSTER lock that the perimeter rule owns? */
function monsterLock(S) {
  const lt = S && S.lockedTarget;
  return (lt && lt.type === 'monster' && lt.ref) ? lt : null;
}

/* Does the locked monster still count?  Inside the hysteresis ring and alive. */
function lockHolds(S) {
  const lt = monsterLock(S);
  if (!lt) return false;
  if (!monLive(lt.ref)) return false;
  const p = monPos(lt.ref);
  if (!p || !S.player) return false;
  const R = TARGET_PERIMETER_PX * TARGET_HYST;
  const dx = p.x - S.player.x, dy = p.y - S.player.y;
  return dx * dx + dy * dy <= R * R;
}

/* Once per frame (monsterCombat's tick): refresh the candidate list and
   apply the persistence rule.  Cheap -- one pass over the zone's monsters. */
export function updateTargeting(S) {
  if (!S || !S.player) return;
  const cands = targetCandidates(S);
  S._targetCands = cands;
  const lt = monsterLock(S);
  if (lt && !lockHolds(S)) {
    S.lockedTarget = null;
    S._lockDroppedAt = Date.now();
    S._lockDroppedWhy = monLive(lt.ref) ? 'range' : 'dead';
  }
}

/* Called on every Attack press.  Returns the monster now locked, or null. */
export function engageNearest(S) {
  if (!S || !S.player) return null;
  /* A live NPC/player lock is deliberate; leave it. */
  if (S.lockedTarget && S.lockedTarget.ref && S.lockedTarget.type !== 'monster') return null;
  if (lockHolds(S)) return S.lockedTarget.ref;
  const cands = S._targetCands || targetCandidates(S);
  if (!cands.length) {
    if (monsterLock(S)) S.lockedTarget = null;
    return null;
  }
  const m = cands[0].m;
  S.lockedTarget = { type: 'monster', id: m.id, ref: m };
  S._engagedAt = Date.now();
  return m;
}

/* The candidates in screen-x order (left -> right), which is the order the
   arrows walk.  Ties (same x) break on y so the order is stable. */
export function candidatesByX(S) {
  const cands = (S && S._targetCands) || [];
  return cands.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
}

/* Step the lock left (-1) or right (+1) through the candidates.  Wraps.
   With nothing locked, the first press locks the nearest (so the arrows
   never do nothing).  Returns the monster now locked, or null. */
export function cycleTarget(S, dir) {
  if (!S) return null;
  const ordered = candidatesByX(S);
  if (ordered.length === 0) return null;
  const lt = monsterLock(S);
  let idx = -1;
  if (lt) for (let i = 0; i < ordered.length; i++) if (ordered[i].m === lt.ref) { idx = i; break; }
  let next;
  if (idx < 0) {
    /* Not among the candidates (nothing locked, or a tapped lock out of the
       ring): start from the nearest, exactly like a press does. */
    next = (S._targetCands && S._targetCands[0]) ? S._targetCands[0] : ordered[0];
  } else {
    const n = ordered.length;
    next = ordered[(((idx + (dir < 0 ? -1 : 1)) % n) + n) % n];
  }
  const m = next.m;
  S.lockedTarget = { type: 'monster', id: m.id, ref: m };
  S._engagedAt = Date.now();
  S._targetSwitchedAt = Date.now();
  return m;
}
