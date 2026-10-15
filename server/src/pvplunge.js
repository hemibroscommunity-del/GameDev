/* ═══ v2.3.3262: THE SWORD'S OPENING LUNGE, AT A PLAYER ═══
 *
 * Owner, 2026-10-15, on v2.3.3260's honest limit -- a sword cannot catch a
 * bow or a staff that keeps its distance, because everyone runs at the same
 * speed and one formula leaves no number of the sword's own in a fight with a
 * player: "Yes make opening lunge work on players too".
 *
 * The lunge is `sworddash` (abilities.js STAM_ABILITIES): the sword's first
 * attack of an engagement, a zoom to the locked target and a swing on arrival,
 * free, on a 2,500 ms cooldown, out to 900 px.  Until now it named only a
 * MONSTER -- the phone sent no lunge at a locked player, and the worker's
 * declared-target lookup ran over this.monsters only.  It is the SAME MOVE at a
 * player now: the same cooldown, cost and reach, the same contact the worker
 * puts you at, the same sword hit.  What it needed of its own was the one
 * thing v2.3.3260 said it needed: what its stun does to a player.
 *
 * WHAT HAPPENS.  A sworddash that names a player (`pid`, never `targetId`,
 * which is a monster's) is resolved here, from abilities.js _abilityResolve,
 * after the worker charged the cooldown:
 *   1. the player must be one you may fight -- in your zone, alive, not you,
 *      and _pvpAllowed (No man's land's rule, a duel, an arena match; handoff
 *      rule 17: PvP fails closed) -- and within the lunge's reach;
 *   2. the worker puts you at contact, STOP_PX from them, as it does at a
 *      monster (its copy then agrees with where the phone's dash ends);
 *   3. the strike goes through THE ONE DOOR for a hit between players,
 *      combat.js _resolvePvPAttack: the consent gate again, the lag-comp
 *      rewind, the shield's arc (a guard raised at you blocks it, and costs the
 *      blocker the block's stamina as any hit does), a roll's i-frames, the
 *      sword's lane (one hit a swing: the lunge is a swing with its own `sw`),
 *      the worker's own roll (one formula: the hit a monster would take, and
 *      sworddash's dmgMult is 1.0), armour, the 30% cap, the eating clock, No
 *      man's land's skulls, a death.  Nothing here rolls or applies damage;
 *   4. a hit that LANDED -- not blocked, not dodged, more than nothing --
 *      DAZES the player (below), and the pvp_hit says so: `st: 'daze'` and
 *      `stMs`, the fields a rock monster's monster_attack already carries, so
 *      the phone carries it out with the same code (game/elemHits.js
 *      applyElemHit: no walk, swing, roll or shield; stars round the head).
 * A lunge that reached nobody, or was refused, is a whiff (the cooldown spent,
 * as at a monster: "Missed!").  A blocked or dodged one is not a whiff -- it
 * connected, and the pvp_hit says "Blocked" or "Dodged".
 *
 * WHAT ITS STUN DOES TO A PLAYER.  Against a monster sworddash stuns for
 * 1,600 ms.  Against a player a stun that long, every 2,500 ms, would hold a
 * bow or staff player still for two thirds of the fight.  So the player gets
 * the rock monsters' DAZE -- the very numbers, by reference (monsterstatus.js
 * DAZE): DAZE_MS of no walk, swing, roll or shield, then IMMUNE_MS in which no
 * daze -- the lunge's or a rock monster's, they share it -- lands again, so at
 * the lunge's 2,500 ms cooldown about every other lunge that lands dazes.  One
 * daze in the game, at the length players already know.  The fight simulator
 * (tools/pvp-sim/lunge.mjs, docs/specs/pvp-lunge.md) chose it: the LUNGE is
 * what lets a sword catch a bow or a staff that keeps its distance; the daze
 * adds a few points at average skill and up to ~15 at the top, and a longer
 * daze, or one on every lunge, tips top-skill fights further to the sword.
 *
 * AND WHILE DAZED, AGAINST PLAYERS (the worker's half of "no swing, no roll"):
 * the phone refuses a dazed player's swing, roll and lunge
 * (combatHelpers.dazeRefused), and an honest one never sends them; the worker
 * now also lands no SWING from a dazed player on a player, takes no lunge from
 * one, and a dazed player's roll buys no i-frames against one (combat.js
 * _resolvePvPAttack, `_pvpDazed`).  A SHOT still lands: its claim is sent when
 * it lands, so an arrow loosed before the daze arrives inside it, and the
 * worker cannot tell it from one loosed after.  Monsters are untouched: the
 * rock monster's daze was the phone's alone before this and still is there.
 *
 * NO KNOCKBACK.  A monster takes sworddash's 40 px shove; a player does not:
 * a phone moves its own body (a gust's shove is the only exception, and it
 * needs the worker's allowance machinery), and a shove at the end of a lunge
 * would push the target back out of the reach the lunge just closed.
 *
 * Kill switch `pvplunge: false` (liveflags): caps.pvplunge goes false, the
 * phone sends no lunge at a player, a lunge that names one is a whiff, and the
 * dazed gates in _resolvePvPAttack are off -- the game as it was.  An older
 * worker never advertises the cap, so a new phone never lunges at a player
 * against it (rule 19); an older phone never names a player, so a new worker
 * changes nothing for it.
 */

import { DAZE } from './monsterstatus.js';

export const PVP_LUNGE = Object.freeze({
  /* the daze a landed lunge puts on a player, and the window after it in which
     none lands again: the rock monsters' own (500 / 2,500), as they share the
     player's `_dazeImmuneUntil` -- the simulator's pick, the spec's table */
  DAZE_MS: DAZE.MS,
  IMMUNE_MS: DAZE.IMMUNE_MS,
  /* the client's DASH_STOP_PX: where the dash stops, contact range */
  STOP_PX: 46,
  /* the strike's claimed range: the melee cap (combat.js PVP_TUNING.RANGE_CAP.
     melee).  The worker has just put the attacker STOP_PX from where the
     target is NOW, but _resolvePvPAttack measures to where the attacker SAW
     it (the lag-comp rewind, up to LAGCOMP_BUFFER_TICKS x TICK_RATE ~300 ms:
     ~60 px at a sprint), so the claim is the cap, not the contact */
  RANGE_PX: 250,
  /* the widest arc _resolvePvPAttack honours: the rewound target can sit off
     the line to where it is now */
  ARC: Math.PI * 1.41,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const pvpLungeMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _pvpLungeOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'pvplunge') && !f.pvplunge);
  },

  /* Is `ps` dazed right now, for a fight between players?  False with the
     switch off (the game as it was). */
  _pvpDazed(ps, now) {
    if (!ps || this._pvpLungeOff()) return false;
    return (typeof now === 'number' ? now : Date.now()) < (ps._dazeUntil || 0);
  },

  /* The strike half of a sworddash that named player `pid`.  Called from
     abilities.js _abilityResolve once the worker has charged the cast.
     Returns true when the lunge connected (the pvp_hit went out: landed,
     blocked or dodged), false for a whiff. */
  _swordDashPlayer(sid, ps, cfg, pid) {
    if (this._pvpLungeOff()) return false;
    if (typeof pid !== 'string' || !pid || pid === sid) return false;
    /* a dazed swordsman lunges nowhere: the phone refuses the cast
       (castAbility's dazeRefused), and the strike would be refused below
       anyway -- AFTER the move, so this is what keeps them where they are */
    if (this._pvpDazed(ps)) return false;
    /* compared as a key of playerState, never used to make one: own() keeps
       '__proto__' and friends from reaching the prototype (CLAUDE.md rule 4) */
    if (!own(this.playerState, pid)) return false;
    const tps = this.playerState[pid];
    if (!tps || tps.z !== ps.z || tps.dead || tps.dying || tps.disconnected) return false;
    if (!(tps.hp > 0)) return false;
    if (typeof tps.x !== 'number' || typeof tps.y !== 'number') return false;
    if (!this._pvpAllowed(sid, pid, ps.z)) return false;
    const dx = tps.x - (ps.x || 0), dy = tps.y - (ps.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const reach = cfg.reach || cfg.radius || 0;
    if (!(dist <= reach)) return false;
    /* contact, as at a monster (abilities.js: "a lunge the server accepts is
       a lunge the server performs") -- and the very next move is a first
       move, not a teleport from where the worker just put you */
    if (dist > PVP_LUNGE.STOP_PX) {
      ps.x = tps.x - (dx / dist) * PVP_LUNGE.STOP_PX;
      ps.y = tps.y - (dy / dist) * PVP_LUNGE.STOP_PX;
      ps.lastMoveAt = undefined;
    }
    /* the one door.  The real session when there is one (its rtt is the
       rewind; its name goes on the hit) */
    const ws = this._wsBySessionId(sid);
    const session = (ws && this.sessions.get(ws)) || { id: sid, name: ps.name || 'Bro', rtt: 0 };
    if (!session.id) return false;
    this._pvpLungeSeq = (this._pvpLungeSeq || 0) + 1;
    const mark = this.eventBuffer.length;
    this._resolvePvPAttack(session, {
      kind: 'melee', target: pid, x: ps.x, y: ps.y,
      angle: Math.atan2(tps.y - ps.y, tps.x - ps.x),
      range: PVP_LUNGE.RANGE_PX, arc: PVP_LUNGE.ARC,
      /* a swing of its own on the sword's lane: negative, so never one of
         the phone's swing clocks */
      sw: -this._pvpLungeSeq,
    });
    let hit = null;
    for (let i = mark; i < this.eventBuffer.length; i++) {
      const e = this.eventBuffer[i];
      if (e && e.type === 'pvp_hit' && e.payload && e.payload.attacker === sid && e.payload.target === pid) { hit = e; break; }
    }
    if (!hit) return false;
    hit.payload.ability = 'sworddash';
    const p = hit.payload;
    if (!p.blocked && !p.dodged && p.dmgTaken > 0 && !p.died) {
      const ms = this._pvpLungeDaze(tps, Date.now());
      if (ms > 0) { p.st = 'daze'; p.stMs = ms; }
    }
    return true;
  },

  /* The daze a landed lunge puts on a player, with its window after (shared
     with the rock monsters' daze, monsterstatus.js).  Returns its length, 0
     while the player is still in the window. */
  _pvpLungeDaze(tps, now) {
    if (!tps) return 0;
    const t = typeof now === 'number' ? now : Date.now();
    if (t < (tps._dazeImmuneUntil || 0)) return 0;
    tps._dazeUntil = t + PVP_LUNGE.DAZE_MS;
    tps._dazeImmuneUntil = t + PVP_LUNGE.DAZE_MS + PVP_LUNGE.IMMUNE_MS;
    return PVP_LUNGE.DAZE_MS;
  },
};
