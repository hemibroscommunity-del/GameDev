/* ═══ v2.3.4605: WHAT A MOVE'S CLAIMS BUY ═══
 *
 * The state-machine sweep (2026-11-03; V1 S1-10 / S3-4, S3-26).  Two kinds of
 * protection were bought by a field on the phone's `move` with nothing on the
 * worker behind it:
 *
 *   THE PARRY.  The parry window (index.js _parryOpen, PARRY_WINDOW_MS) opened
 *   on every false->true edge of `blocking`, with no time down before it, so a
 *   modified page sending `blocking: false` then `blocking: true` about every
 *   240 ms parried every blow in its arc: a monster's swing broken and +10
 *   stamina each time (players too, with the extras on).  Beside it, a block
 *   with no `ba` covered all round (the pre-v2.3.1705 fail-open), and nothing
 *   on the worker lowered the guard for an attack -- the "a swing drops the
 *   shield" rule lived on the phone alone (shieldToggle.js, playerActions.js).
 *
 *   THE COOKING / FIREMAKING SHIELD.  Monsters leave a cooking player alone
 *   (gathering.js _extractionShielded).  It needed only a fresh null->'cook'
 *   edge of `ex` (movement.js), so a bundle of an attack, `ex: null` and
 *   `ex: 'cook'` swung and re-armed it before any tick: an attacker monsters
 *   never fought back.
 *
 * THE ORCHESTRATOR'S DECISIONS (the owner delegated the design calls):
 *
 *   parryrearm  A raise opens the parry window only after the guard has been
 *               DOWN on the worker for PARRY_REARM_MS.  A quicker re-raise
 *               still blocks -- the guard is up -- but does not parry.  The
 *               owner's open question 5 ("Should a quick shield down-and-up
 *               need a short time down before the parry is ready again?"),
 *               decided yes: an honest player almost never re-raises inside
 *               400 ms.  `parryrearm: false` in the live flags: every raise
 *               parries again, as before.
 *   swingguard  A sword's claim (a `monster_damage` or `player_attack` the
 *               worker resolves as melee) lowers a raised guard on the worker
 *               first, as the phone already does before it swings
 *               (playerActions.js swingAttack/specialAttack, the auto-attack
 *               in monsterCombat.js).  NOT a bow's or a staff's claim: it is
 *               sent when the shot LANDS (projectiles.js), and an honest
 *               player may have raised the shield again while it flew (the
 *               reason the daze spares a shot, combat.js _resolvePvPAttack).
 *               NOT Shield Bash or Whirlwind (`ability`): the bash is cast out
 *               of a raised shield by design, and the phone keeps it up.  NOT
 *               the element burst: the phone casts it with the shield up.  So
 *               a modified page that keeps `blocking` up while it swings keeps
 *               no parry across a swing (the swing is the guard's down edge,
 *               PARRY_REARM_MS counts from it), and its guard is down from the
 *               claim to its next move.  `swingguard: false`: a claim leaves
 *               the guard as it was.
 *   blockarc    Every phone since v2.3.1705 sends `ba` with a raised shield
 *               (wsClient.js's move shim: the shield's angle, else the facing,
 *               else 0, whenever `_shieldUp`), so a block with no `ba` is not
 *               an old phone any more.  It covers the FRONT arc of the
 *               player's last facing (`f`, else `d`, else south: the phone's
 *               own default, visualSystems.js), not all round.
 *               `blockarc: false`: all round again.
 *   cookshield  The cook / fire shield holds only when the worker itself knows
 *               of a fire for this player: the `firemaking_request` it took a
 *               log for (cooking.js, ps._fireLit) -- a player cooks only at
 *               their own fire (the tap list holds S._campfire alone) -- in
 *               this zone, within COOK_FIRE_REACH of where the activity began,
 *               and still burning when it began (lit, or a fish cooked at it,
 *               within COOK_FIRE_MS).  And after an attack by this player
 *               (gathering.js _endExtraction) it holds again only once
 *               COOK_REARM_MS have passed.  `cookshield: false`: the `ex` edge
 *               alone again.
 *
 * NOT HERE (they wait on the owner's shield questions 1-4): showing the guard
 * break on the phone, a daze or freeze stopping a raise on the worker, the
 * cooldown numbers.
 *
 * A check that protects other players never asks _testMode, and none of these
 * does: a parry staggers a monster another player is fighting, a shielded cook
 * is a player monsters leave for someone else. */

export const MOVE_CLAIMS = Object.freeze({
  /* the guard's time down before a raise parries again */
  PARRY_REARM_MS: 400,
  /* after an attack, how long before the cook / fire shield holds again */
  COOK_REARM_MS: 3000,
  /* how long a fire burns on the worker's clock, from its lighting or the last
     fish cooked at it: the phone's fuse is 45 s from a 0.7 s light, held 15 s
     ahead of the pan while a cook runs (BroTown.jsx), so the next cook begins
     inside 45.7 s of the light or 15 s of the last fish; the rest is slack for
     the network.  Read at the moment the activity BEGAN, never against the
     clock, so a long cook (a slow catch, the window that waits for you) never
     loses the shield under it -- v2.3.2956's lesson. */
  COOK_FIRE_MS: 60000,
  /* how far from where the fire was lit an activity may begin and count as at
     it: the fire burns a stride to the left at the boots (campfireFx.js
     fireLightSpot, 34 px at scale 1) and a cook is begun from the tap's reach;
     the watcher's own bound (effectsRenderer.js PEER_COOK_REACH), "generous on
     purpose -- to throw out a stale or forged relay, not to second-guess a
     real one" */
  COOK_FIRE_REACH: 320,
});

/* The front a guard with no `ba` faces: the move's 8-way `f` (spar.js FACING8,
   the phone's _renderFacing) or the 4-way `d`.  A Map, as both are the phone's
   words (CLAUDE.md: a plain {} answers '__proto__'). */
const Q = Math.PI / 4;
const FACING_ANGLE = new Map([
  ['east', 0], ['southeast', Q], ['south', 2 * Q], ['southwest', 3 * Q],
  ['west', 4 * Q], ['northwest', -3 * Q], ['north', -2 * Q], ['northeast', -Q],
  ['right', 0], ['down', 2 * Q], ['left', 4 * Q], ['up', -2 * Q],
]);

/* The angle a raised guard with no `ba` covers: `f`, else `d`, else south (the
   phone's own default facing, visualSystems.js).  A lag-comp history entry
   (tick.js) carries `d` and not `f`, so it falls to `d`. */
export function guardFacing(ps) {
  const f = ps && typeof ps.f === 'string' ? FACING_ANGLE.get(ps.f) : undefined;
  if (typeof f === 'number') return f;
  const d = ps && typeof ps.d === 'string' ? FACING_ANGLE.get(ps.d) : undefined;
  return typeof d === 'number' ? d : 2 * Q;
}

/* a missing payload: read by fixed names only (kind, slot) */
const NO_PAYLOAD = Object.freeze(Object.create(null));

/* Each switch is off only when written (false), in `monsterguardbreak`'s
   style (hits.js _monsterGuardBreakOff): nothing set leaves it on. */
const off = (room, name) => {
  const f = room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, name) && !f[name]);
};

export const moveClaimMethods = {
  _parryRearmOff() { return off(this, 'parryrearm'); },
  _swingGuardOff() { return off(this, 'swingguard'); },
  _blockArcOff() { return off(this, 'blockarc'); },
  _cookShieldOff() { return off(this, 'cookshield'); },

  /* May the raise the worker just took open the parry window?  Only when the
     guard was down for PARRY_REARM_MS.  `_guardDownAt` 0 or unset is a guard
     whose lowering no move saw (never raised, a takeover, a linger) -- down
     long enough, as every raise was before.  A guard break lowers it too, and
     its 3 s latch (movement.js) is far longer than the re-arm. */
  _parryRearmed(ps, now) {
    if (this._parryRearmOff()) return true;
    const t = ps && ps._guardDownAt;
    return !(typeof t === 'number' && t > 0) || (now - t) >= MOVE_CLAIMS.PARRY_REARM_MS;
  },

  /* After a move's `blocking`: when the worker's guard went down (the first
     move that finds it down; a swing stamps it itself), cleared while up. */
  _guardDownNote(ps, now) {
    if (!ps) return;
    if (ps.blocking) ps._guardDownAt = 0;
    else if (!ps._guardDownAt) ps._guardDownAt = now;
  },

  /* A sword's claim lowers a raised guard first (swingguard, above).  Asked by
     the router before the claim's handler, whatever that handler then decides
     -- the phone's shield is down from the press, landed or not.  The melee
     test is the handler's own: _resolvePvPAttack's `kind` (a ranged or staff
     kind needs its weapon, else it is a swing) and _handleMonsterDamage's
     `_effSlot` (the claim's slot, else the worker's activeSlot). */
  _swingDropsGuard(session, type, payload) {
    const ps = session && session.id ? this.playerState[session.id] : null;
    if (!ps || !ps.blocking || this._swingGuardOff()) return false;
    const p = payload && typeof payload === 'object' ? payload : NO_PAYLOAD;
    let melee;
    if (type === 'player_attack') {
      melee = !((p.kind === 'ranged' && ps.rangedWeapon) || (p.kind === 'staff' && ps.staffWeapon));
    } else {
      const slot = (p.slot === 'melee' || p.slot === 'ranged' || p.slot === 'staff') ? p.slot : (ps.activeSlot || 'melee');
      melee = slot === 'melee';
    }
    if (!melee) return false;
    ps.blocking = false;
    ps.blockStartT = 0;
    ps._guardDownAt = Date.now();
    return true;
  },

  /* The cook / fire branch's two new bounds (cookshield, above), asked by
     gathering.js _extractionShielded after its own.  `t` is its clock. */
  _cookShieldHolds(ps, t) {
    if (this._cookShieldOff()) return true;
    /* not for COOK_REARM_MS after an attack (gathering.js _endExtraction) */
    if (ps._exAttackAt && t - ps._exAttackAt < MOVE_CLAIMS.COOK_REARM_MS) return false;
    /* the worker's own fire: lit here, near where this began, and burning then */
    const f = ps._fireLit;
    if (!f || f.z !== ps.z) return false;
    const dx = (ps._exX || 0) - f.x, dy = (ps._exY || 0) - f.y;
    if (dx * dx + dy * dy > MOVE_CLAIMS.COOK_FIRE_REACH * MOVE_CLAIMS.COOK_FIRE_REACH) return false;
    const lastLife = Math.max(f.at, (ps._lastCookAt && ps._lastCookAt >= f.at) ? ps._lastCookAt : 0);
    return ps._exAt - lastLife <= MOVE_CLAIMS.COOK_FIRE_MS;
  },

  /* cooking.js _handleFiremakingRequest, once the log is spent: the fire as
     the worker knows it -- the zone and the place the worker has the player,
     never anything the message says. */
  _fireLitNote(ps, now) {
    if (!ps) return;
    ps._fireLit = { z: ps.z, x: ps.x || 0, y: ps.y || 0, at: now };
  },
};
