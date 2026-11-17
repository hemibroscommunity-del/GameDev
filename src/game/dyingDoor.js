/* ═══ v2.3.5534: THE LIFE'S PAGE DOOR -- ONE WRITER OF YOUR DYING SECONDS (card L PR 5) ═══
 * (docs/specs/life-page-door.md; held by server/test/life-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * Your dying seconds on the phone are one field, `S._dying` (alive, dying),
 * its start `S._deathStart` (the death animation's clock) written beside it
 * by the same call.  Six files wrote them in fourteen places; now only
 * dyingTo does, by a way of DYING_WAYS:
 *   die      the worker's death (wsClient.js), a local death (gameEvents.js,
 *            monsterCombat.js), the catch-all (BroTown.jsx): dying, from
 *            `start` (a start already seeded is passed back in)
 *   seed     the renderer's catch-all (entityRenderer.js): the start alone,
 *            when hp is 0 and nothing set it
 *   respawn  respawn.js applyLocalRespawn, monsterCombat.js's town respawn,
 *            BroTown.jsx's fallback: alive, the start back to 0
 * The rule is the callers' own: a start is a number.  Nothing a player sees
 * changes.  The worker's half is the life door (server/src/life.js
 * _lifeTo, ps.life); the names differ on purpose.  `?dyingdoor=0` writes
 * what a caller asks, as the lines before the door.
 *
 * Beside the door: S.respawnTimer (also a dodge's short hold, dodge.js), the
 * death card (S._deathCard, deathCard.js), the death count on the save.
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const DYING_WAYS = Object.freeze({ die: 'dying', seed: 'start', respawn: 'alive' });

export function dyingDoorOff() {
  return sw('dyingdoor');
}

/* THE ONE WRITER.  `start`: the death's start (die, seed).  True when it
   wrote. */
export function dyingTo(S, way, start) {
  if (!S || typeof S !== 'object' || !Object.prototype.hasOwnProperty.call(DYING_WAYS, way)) return false;
  if (way === 'respawn') {
    S._dying = false;
    S._deathStart = 0;
    return true;
  }
  if (!dyingDoorOff() && !Number.isFinite(start)) return false;
  if (way === 'die') S._dying = true;
  S._deathStart = start;
  return true;
}

/* the life's phase on this phone (the phase table's words) */
export function dyingPhase(S) {
  return S && S._dying ? 'dying' : 'alive';
}
