/* ═══ v2.3.3267: YOUR SPARRING CLONES ARE MONSTERS TO YOUR WEAPONS ═══
 *
 * The owner, after the first spar (v2.3.3265): "attacks need to hit the clone
 * even when you aren't locked on target", and "the block shield button needs
 * to appear while in combat for any of the 3 combat types. It was not there."
 *
 * Both were one thing: the page asked about a player only when it was locked
 * on one -- the duel's rule (a duel locks you onto the other, duelLock.js) and
 * No man's land's (a lock is the choice to fight, nmlAsk.js).  A clone was a
 * player like any other there, so with nothing locked:
 *   - the bow never loosed at one (its sight gate, projectiles.js
 *     firstSightHit, looked for monsters and the lock alone);
 *   - an arrow or a bolt flew through one (the impact test tried the lock);
 *   - a swing in its face sent nothing (monsterCombat.js's PvP claim waits for
 *     a lock or a duel);
 *   - and the shield button stayed away: it shows with a lock, a blow in the
 *     last five seconds or a MONSTER in reach (shieldToggle.js), and between a
 *     clone's blows there was none of them.
 *
 * So to your weapons a clone is now what a monster is: the sword finds the
 * nearest one by itself (targeting.js, the melee auto target, as it finds a
 * monster), the bow fires when one is on its line, arrows and bolts hit any
 * clone they reach and every swing lands on the clones in its arc, and the
 * shield button is up while one is near.  A bow or staff still locks one only
 * when you tap it, as it locks a monster (v2.3.2258).
 *
 * Only YOUR clones, which fight you and nobody else (server spar.js
 * _sparPair): every blow still names the clone it hits (`target`), so no
 * other player is ever touched by it, and No man's land's choice (v2.3.3253)
 * is untouched.
 *
 * No imports, so server/test/spar.test.mjs runs it. */

/* a clone this near (px) keeps the shield button up: a fight is on.  About a
   phone's screen; a bow or staff clone fights from 280-400 px (spar.js band). */
export const SPAR_FIGHT_R = 900;

/** Is `id` one of your sparring clones, alive and drawn in your zone? */
export function isLiveClone(S, id) {
  const sp = S && S._spar;
  if (!sp || !sp.ids || id == null || !sp.ids.has(String(id))) return false;
  const o = S.others ? S.others[id] : null;
  if (!o || o._isDead || o.dead || o._away) return false;
  const z = o.zone || o.z || 'town';
  return !S.currentZone || z === S.currentZone;
}

/** Where a clone is drawn on this screen, or null. */
export function clonePos(o) {
  if (!o) return null;
  const x = (typeof o.renderX === 'number' && isFinite(o.renderX)) ? o.renderX : o.x;
  const y = (typeof o.renderY === 'number' && isFinite(o.renderY)) ? o.renderY : o.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  return { x, y };
}

/** Your live clones, as { id, o, x, y }. */
export function liveClones(S) {
  const out = [];
  const sp = S && S._spar;
  if (!sp || !sp.ids || !sp.ids.size || !S.others) return out;
  for (const id of sp.ids) {
    if (!isLiveClone(S, id)) continue;
    const o = S.others[id];
    const p = clonePos(o);
    if (p) out.push({ id, o, x: p.x, y: p.y });
  }
  return out;
}

/** Your live clones within `r` px of you, nearest first, in targeting.js's
 *  candidate shape: { m: the clone, id, x, y, d2, spar: true }. */
export function clonesNear(S, r) {
  const out = [];
  const P = S && S.player;
  if (!P || !(r > 0)) return out;
  const r2 = r * r;
  for (const c of liveClones(S)) {
    const dx = c.x - P.x, dy = c.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= r2) out.push({ m: c.o, id: c.id, x: c.x, y: c.y, d2, spar: true });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/** Is a fight with your clones on -- one within SPAR_FIGHT_R? */
export function sparFightOn(S) {
  return clonesNear(S, SPAR_FIGHT_R).length > 0;
}

/** The players a shot of yours may hit on this screen, ids in order: the duel
 *  opponent or the player you have locked where your PvP test tries them
 *  (`lockPid`, the old one-target rule), then each of your live clones. */
export function shotPlayerTargets(S, lockPid) {
  const out = [];
  if (lockPid != null) out.push(String(lockPid));
  for (const c of liveClones(S)) if (out.indexOf(String(c.id)) < 0) out.push(String(c.id));
  return out;
}

/** Your live clones a swing from (px, py) toward `ang` reaches on this screen:
 *  within `reach` (+ `slack`, a stride: the worker sees them a tick later) and
 *  inside the swing's `arc` -- as { id, o, x, y, ang }, the bearing to each.
 *  monsterCombat claims a hit on each, naming it (v2.3.3267). */
export function clonesInSwing(S, px, py, ang, reach, arc, slack) {
  const out = [];
  if (typeof px !== 'number' || typeof py !== 'number' || !isFinite(ang)) return out;
  const R = (Number(reach) || 0) + (Number(slack) || 0);
  const half = (Number(arc) || 0) / 2;
  for (const c of liveClones(S)) {
    const dx = c.x - px, dy = c.y - py;
    if (dx * dx + dy * dy > R * R) continue;
    const a = Math.atan2(dy, dx);
    const diff = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
    if (Math.abs(diff) > half) continue;
    out.push({ id: c.id, o: c.o, x: c.x, y: c.y, ang: a });
  }
  return out;
}
