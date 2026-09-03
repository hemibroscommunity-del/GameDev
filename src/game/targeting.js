/* ═══ v2.3.2229: ENGAGE — the Attack button begins the targeting ═══
 *
 * Owner: "Combat will rely on the auto targeting system. The contextual
 * button will say 'attack' on it to engage the enemy and begin the existing
 * targeting system (currently tap to lock on monster)."
 *
 * The lock itself is unchanged -- the same {type:'monster', id, ref} the
 * canvas tap writes, read by the swing sweep, the projectile aim, the
 * shield angle, the reticle and the renderer's facing.  What is new is a
 * way to acquire one without tapping the monster: pressing Attack locks
 * the nearest monster whose TARGETING PERIMETER (TARGET_PERIMETER_PX, the
 * same for every weapon) the player is standing inside.
 *
 * Nothing in range -> no lock, and the press still swings, exactly as a
 * tap on the old stick did: a control that silently does nothing is
 * indistinguishable from a broken one (docs/specs/control-redesign.md
 * §5.2).
 *
 * Tap-to-lock is kept as the manual override (§5.1).  PR 2 adds the
 * perimeter's persistence rule, the switch arrows and the candidate rings
 * on top of this.
 */
import { TARGET_PERIMETER_PX } from '@/data/index.js';
import { isIntangible } from '@/data/monsterVariants.js';

/* Every monster the player could engage right now, nearest first. */
export function targetCandidates(S, radiusPx) {
  const out = [];
  if (!S || !S.player || !S.monsters) return out;
  const P = S.player;
  const R = radiusPx || TARGET_PERIMETER_PX;
  const R2 = R * R;
  for (let i = 0; i < S.monsters.length; i++) {
    const m = S.monsters[i];
    if (!m || !m.alive || (typeof m.curHp === 'number' && m.curHp <= 0)) continue;
    if (isIntangible(m)) continue;
    const x = (typeof m.renderX === 'number' && isFinite(m.renderX)) ? m.renderX : m.x;
    const y = (typeof m.renderY === 'number' && isFinite(m.renderY)) ? m.renderY : m.y;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    const dx = x - P.x, dy = y - P.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= R2) out.push({ m: m, d2: d2, x: x });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/* Is the current lock still something Attack should keep?  A monster lock
   that is dead, gone or out of the perimeter is replaced; an NPC or player
   lock (a duel opponent) is never touched by the perimeter -- those are
   deliberate taps and mean something else. */
function lockIsLiveMonster(S, radiusPx) {
  const lt = S.lockedTarget;
  if (!lt || !lt.ref) return false;
  if (lt.type !== 'monster') return true;
  const m = lt.ref;
  if (!m.alive || (typeof m.curHp === 'number' && m.curHp <= 0)) return false;
  if (isIntangible(m)) return false;
  const P = S.player;
  const R = radiusPx || TARGET_PERIMETER_PX;
  const dx = (m.renderX != null ? m.renderX : m.x) - P.x;
  const dy = (m.renderY != null ? m.renderY : m.y) - P.y;
  return dx * dx + dy * dy <= R * R;
}

/* Called on every Attack press.  Returns the monster now locked, or null. */
export function engageNearest(S) {
  if (!S || !S.player) return null;
  if (lockIsLiveMonster(S)) return S.lockedTarget.ref;
  const cands = targetCandidates(S);
  if (!cands.length) {
    /* A stale monster lock is dropped rather than kept pointing at nothing;
       an NPC/player lock is left alone (see lockIsLiveMonster). */
    if (S.lockedTarget && S.lockedTarget.type === 'monster') S.lockedTarget = null;
    return null;
  }
  const m = cands[0].m;
  S.lockedTarget = { type: 'monster', id: m.id, ref: m };
  S._engagedAt = Date.now();
  return m;
}
