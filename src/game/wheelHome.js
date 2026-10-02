/* ═══ v2.3.2990: THE WHEEL IS THE WORLD, AND YOU START IN ITS BROTOWN ═══
 *
 * Owner, 2026-10-02: "I'm ready to have this replace the old game map. Just
 * have players spawn in town. Then push to main" -- and, asked which town and
 * what of the old lands: "The Wheel's new Brotown", "Close them for now".
 *
 * The Wheel is the World View for everyone now (worldTrial.js readFlag), so
 * town's stairs lead into it and the old World View's trails to the old lands
 * are gone with it.  What this file adds:
 *
 *   - YOU START IN ITS BROTOWN.  Logging in, and coming back after a death,
 *     put you in today's town (the client starts there; the worker's respawn
 *     says 'town'), so from there you are taken down town's stairs at once --
 *     the same trip as walking them, its loading screen and all, so nothing
 *     about arriving in the Wheel is new -- and land in its town square.  The
 *     stairs' gates let this one trip through: the Mayor gate holds an unarmed
 *     player in today's town, and the Wheel's Brotown has its own Mayor Bro
 *     (BroTown.jsx _spawnWheelNpcs), who arms you exactly as he does there.
 *     Today's town, with its shops and townsfolk, is the marker beside where
 *     you land.
 *
 *   - THE MAYOR GATE MOVES WITH YOU.  v2.3.1676, the owner: "not be allowed to
 *     leave town without speaking to mayor bro first.  He'll give you the
 *     sword and shield."  In the Wheel that town is its Brotown and the safe
 *     commons round it (ZONES.wheel.safeR, the worker's own safe ground): until
 *     you have spoken to him you stay inside it, the banner saying why.
 *
 *   `?nospawn` keeps you in today's town on the way in, as before (the QA
 *   suite's scenarios walk the stairs themselves); `?trial=off` is the old
 *   World View.
 */
import { TILE, ZONES, TOWN_EXITS } from '../data/index.js';
import { isWorldViewZone } from '../data/zones.js';
import { wheelIsHome } from './worldTrial.js';

/* a beat in the world before the trip, so the arrival settles first */
const SPAWN_SETTLE_MS = 400;
/* how far inside the safe ground an unarmed player is held (game px) */
const GATE_INSET = 60;

/* Ask for the trip to the Wheel's Brotown (on the way in, and after a death). */
export function wantWheelSpawn(S) {
  if (!S) return;
  S._spawnToWheel = wheelIsHome();
  S._spawnSince = 0;
}

/* Is this exit the spawn trip's way through (its gates let it pass)? */
export function wheelSpawnPass(S, toZone) {
  return !!(S && S._spawnToWheel && S.currentZone === 'town' && isWorldViewZone(toZone));
}

/* Once a frame, before the hubs' exits are read (zoneTransitions.js). */
export function wheelSpawnTick(S) {
  if (!S) return;
  /* the way in: the client starts every session in today's town */
  if (S._wheelSpawnInit !== true) {
    S._wheelSpawnInit = true;
    if (S.currentZone === 'town') wantWheelSpawn(S);
  }
  if (!S._spawnToWheel) return;
  /* there: done */
  if (isWorldViewZone(S.currentZone)) { S._spawnToWheel = false; S._spawnSince = 0; return; }
  /* somewhere else altogether (the farm, a dungeon): not ours to move */
  if (S.currentZone !== 'town') { S._spawnToWheel = false; S._spawnSince = 0; return; }
  /* the stairs' loading screen is up: the trip is under way */
  if (S._zoneLoading) return;
  const P = S.player;
  /* not in the world yet -- no player, no worker, or the worker has not yet
     said what it runs (the stairs lead to the Wheel's own zone only on a
     worker that runs its monsters: worldTrial.js trialZoneFor) -- or dying */
  if (!P || !S.channel || !S._serverCaps || S._dying) return;
  const now = Date.now();
  if (!S._spawnSince) { S._spawnSince = now; return; }
  if (now - S._spawnSince < SPAWN_SETTLE_MS) return;
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  if (!door) { S._spawnToWheel = false; return; }
  /* onto the stairs: the hub exit below takes it from here */
  P.x = door.tx * TILE + TILE / 2;
  P.y = door.ty * TILE + TILE / 2;
  P.vx = 0; P.vy = 0;
}

/* Keep a player who has not yet spoken to Mayor Bro inside the Wheel's safe
   ground.  Only in the Wheel's own zone -- the one with monsters. */
export function wheelCommonsGate(S) {
  if (!S || S.currentZone !== 'wheel') return;
  const z = ZONES.wheel;
  if (!z || !z.safeR) return;
  const R = S.rpg || {};
  if (R._quests && R._quests.tut_1) return;
  const P = S.player;
  if (!P) return;
  const cx = (z.w * TILE) / 2, cy = (z.h * TILE) / 2;
  const dx = P.x - cx, dy = P.y - cy, d = Math.hypot(dx, dy);
  const lim = z.safeR - GATE_INSET;
  if (d <= lim || d === 0) return;
  P.x = cx + (dx / d) * lim;
  P.y = cy + (dy / d) * lim;
  P.vx = 0; P.vy = 0;
  if (!S._mayorGateAt || Date.now() - S._mayorGateAt > 2500) {
    S._mayorGateAt = Date.now();
    S._wheelGateHits = (S._wheelGateHits || 0) + 1;   /* QA readout (mp-wheelhome) */
    if (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function') {
      window._setLevelUpMsg({
        kind: 'warning',
        text: 'Speak to Mayor Bro first',
        sub: "He's beside the Town Hall — he'll arm you",
        ts: Date.now(),
      });
    }
  }
}
