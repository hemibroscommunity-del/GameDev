/* ═══ v2.3.3558: A RE-PUSH IS NOT A NEW ARRIVAL (docs/TRAPS.md §245) ═══
 *
 * A dungeon re-sends its whole monster list whenever it adds some -- a wave,
 * a boss's summon, and now the Goo Grotto's giant slime at each of its three
 * splits (server/src/slimeboss.js) -- dead ones included, and the phone builds
 * its list afresh from it (wsClient.js _applyZoneMonstersMsg, and the join's
 * list on a rejoin).  The renderer keeps a monster's MOMENTS on the monster
 * itself: one it has never seen has just arrived (the growing white
 * silhouette), and a dead one it never saw die has just died (the splat and
 * its sound).  So every monster standing played its arrival again and every
 * one already dead its death again -- a dozen splats and their sounds at once
 * by the third wave.
 *
 * A monster the phone already holds, in the SAME life (alive in both) or the
 * SAME death (dead in both), keeps what the phone keeps of it: those clocks,
 * where it is drawn, that you are fighting it (its bar stays up), the arrows
 * stuck in it, a swell or a flight under way.  One that died or came back
 * since is met afresh, as before.  A NEW phone-only field that marks a moment
 * goes on these lists in the same change, or the next re-push plays it again.
 *
 * No imports: the server's slime-boss suite runs it.
 */
export const CARRY_ALIVE = [
  '_fxWasAlive', '_spawnFxAt', 'renderX', 'renderY', '_hitByMeAt', '_bandEngagedAt',
  '_stuckArrows', '_popFrom', '_burstFrom', '_burstUntil', '_burstScale',
];
export const CARRY_DEAD = [
  '_fxWasAlive', '_spawnFxAt', '_slimeDeathStart', '_snowmanDeathStart', '_burstClock',
  '_burstPeakFrom', '_killMine', '_quietDeath',
];
/* A swell is the one moment that must END with its monster alive: a boss
   that split since (its `bs` moved) has finished its swell.  The split's
   execute clears it; a phone that missed that (a rejoin over the split) must
   not keep the boss swollen and untouchable for ever (monsterVariants.js
   isIntangible reads `_burstUntil`). */
const SWELL = { _burstFrom: 1, _burstUntil: 1, _burstScale: 1 };
/* v2.3.4403: and a blue slime's swell ends with its life.  The wire always
   sends `hp` (tick.js), and a slime swelling to go off stands at 0: one
   that comes back in the fresh list with hp above 0 died and came back in
   between (a rejoin over its fuse and respawn), and keeping its swell held
   it drawn huge and unhittable while it attacked (the sweep's V7).  A boss
   (`bs` on the wire) swells at its split marks with hp above 0, so its
   rule stays the `bs` one above. */
export function endSwell(m) {
  if (!m) return m;
  m._burstFrom = 0; m._burstUntil = 0; m._burstScale = 0;
  return m;
}

export function carryMonsterState(local, prev) {
  if (!prev || !local || !!prev.alive !== !!local.alive) return local;
  const keys = local.alive ? CARRY_ALIVE : CARRY_DEAD;
  const swellOver = local.bs !== prev.bs || (local.bs === undefined && local.hp > 0);   /* v2.3.4403 */
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (swellOver && SWELL[k] === 1) continue;
    if (prev[k] !== undefined) local[k] = prev[k];
  }
  return local;
}

/* ═══ v2.3.4910: A MONSTER'S NEW LIFE ON THE PHONE, AND ITS ONE RESET ═══
 * (TRAPS §245; the worker's twin is server/src/monsterlife.js
 * _monsterNewLife and its MONSTER_LIFE.)
 *
 * A monster that dies and comes back is the SAME object on the phone, so
 * whatever its last life left on it -- the arrows stuck in it, its splat's
 * clock, the loot pile it dropped, a swell -- rides into the next one unless
 * the respawn wipes it.  Two edges did that with two hand lists that had
 * drifted apart: the worker's tick (wsClient.js, a monster `alive` again)
 * cleared the death sounds, the pile and the swell, and the phone's own
 * respawn (monsterCombat.js, a zone the worker does not model) cleared the
 * statuses and its own pile mark but not the death sound or the swell.  Now
 * both call monsterNewLife, and PHONE_NEW_LIFE names every per-life field it
 * wipes, with the value a fresh life starts from.  A NEW phone field that
 * belongs to one life goes on this list, the same rule as CARRY_* above.
 *
 * What is NOT here, on purpose:
 *   - x, y, curHp and the statuses: the worker sends them for its monsters;
 *     the phone's own respawn sets them itself (where it comes back);
 *   - `_spawnFxAt`: the renderer stamps the arrival on the edge it SEES
 *     (entityRenderer.js, `_fxWasAlive`), so a respawn off screen still
 *     grows in when it scrolls into view;
 *   - `_burstPeakFrom` is here AND kept on the renderer's edge (v2.3.2228:
 *     the kill can land a frame after the execute's stamp).
 */
export const PHONE_NEW_LIFE = Object.freeze({
  _slimeDeathStart: null, _snowmanDeathStart: null, _burstPeakFrom: 0,
  _lootDropped: false, _localRemnantDropped: false,
  _deathSfxPlayed: false, _killMine: false,
});

/* `variants` is MONSTER_VARIANTS (passed in: this file has no imports, so
   the server's suites can run it).  Returns m. */
export function monsterNewLife(m, variants) {
  if (!m) return m;
  m.alive = true;
  for (const k in PHONE_NEW_LIFE) m[k] = PHONE_NEW_LIFE[k];
  m._stuckArrows = [];
  /* v2.3.4403: and a swell whose blast this phone never heard (out of reach,
     or a gap): a slime that came back still holding it was drawn huge and
     could not be hit (the sweep's V7) */
  endSwell(m);
  /* Revert a mid-fight variant transform.  A desert mummy that died as a
     skeleton comes back a mummy, so its first half of health still plays
     the bandage-shred next life.  The worker resets its own m.variant but
     does not send that field each tick, so the phone uses the spawn
     archetype it stashed at state_sync. */
  if (m._spawnArchetype && m.archetype !== m._spawnArchetype) {
    m.archetype = m._spawnArchetype;
    m.type = m._spawnArchetype;
    if (m.arch !== undefined) m.arch = m._spawnArchetype;
    m._transformStart = null;
    m._transformHoldMs = 0;
    m._transformFromArch = null;
    const v = variants && variants[m._spawnArchetype];
    if (v && v.spd != null) m.spd = v.spd;
  }
  return m;
}
