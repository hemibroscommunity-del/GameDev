/* ═══ v2.3.3296: ONE DOOR FOR EVERY MONSTER HIT ON A PLAYER ═══
 * (spec: docs/specs/hit-door.md; pinned by server/test/hit-door.test.mjs)
 *
 * The GDD's damage pipeline (README.md §8, "Damage Pipeline (Interceptor
 * Chain)") is one ordered list of steps that every hit goes through.  The
 * worker kept one part of it in one place -- the HP arithmetic, combat.js
 * _applyDamage -- and wrote the steps around it once for each way a monster
 * can hurt you: _monsterStrikePlayer (index.js), the basic swing's and the
 * snowball's own shield branches, _telegraphHitPlayer, _dungeonBossHitPlayer,
 * _fireTrailHitPlayer, _shockArcs and _dotTick.  Seven copies.  Every rule
 * that came later (the safe ground, the sparring clones, the harvest shield,
 * the one-hit rail) had to be copied into each by hand, and the copies that
 * missed one are still there: the test's table is the map of them.
 *
 * THE DOOR is _monsterHit below.  Every one of those entry points is now a
 * thin wrapper that works out WHO is hit, by WHAT and FOR HOW MUCH, and hands
 * that to the door with the name of its row in MONSTER_HITS.  The door runs
 * the steps in one order:
 *
 *   1. the harvest shield    6. the dice (_applyDamage), after the one-hit rail
 *   2. the safe ground       7. what the monster's own blow does after
 *   3. a roll                   (thorn's answer, the hexer's curse, the element)
 *   4. a rock in the way     8. the event, the save, the death
 *   5. the shield: cost, parry, or a hit of 0
 *
 * and MONSTER_HITS says what each row does at each step.  It is TODAY'S
 * behaviour, cell for cell -- the suite passed before this file existed and
 * passes unchanged with it -- including the cells docs/specs/hit-door.md
 * puts to the owner (the two 15s, the wrong-way snowball, the harvest shield
 * the kits miss, rolls, parry, rails, rocks).  Changing a rule for a way of
 * being hit is changing its cell, and the test's row with it.
 *
 * WHAT STAYS WITH THE CALLERS: who is hit (alive, the zone, a sparring clone,
 * a kit's reach, a ball's landing spot, which players a storm arc picks) and
 * for how much before the rail (a kit's multiplier, a patch's flat number, a
 * burn's per-tick share).  Those are each source's own and differ for real
 * reasons.  A cell that says 'tick' is a step the caller's tick loop takes
 * before it ever comes here -- the storm picks its arcs among players the
 * harvest shield and the safe ground allow, the safe ground PUTS A BURN OUT
 * rather than skipping its tick -- so the door does not ask it again.
 *
 * WHAT THE DOOR EVENS OUT (display only; listed in hit-door.md):
 *   - every event says the target's HP after the blow (`hp`).  A blow the
 *     shield stopped did not, on four of the five rows that can be stopped,
 *     and the phone reads an event without `hp` as an older worker's -- it
 *     floated the hit's whole number over another player who had blocked it
 *     (gameEvents.js, the onlooker branch of monster_attack);
 *   - every landed blow carries `lastStand` when it fires.  Three rows left it
 *     out; it only fires on a character from before the trained skills, which
 *     no joined player is (join.js gives every one a prog3 record).
 * Nothing the worker stores, charges or decides changes.
 *
 * Rule 13 (handoff): no new event type, so nothing to add to PRIVILEGED_EVENTS.
 */
import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from './data.js';
import { WHEEL_ZONE } from './wheelzone.js';
import { TELEGRAPH } from './telegraph.js';
import { BOSS_ABILITIES } from './dungeon.js';
import { SHOCK, BURN, POISON } from './monsterstatus.js';
import { attackBlocked } from './props.js';
import { thornRecoil } from './elemental.js';

/* The block cost the snow pile and the boss kept when v2.3.1731 named
   BLOCK_STAMINA_COST (10) "so the cost has ONE home" -- it replaced the melee
   site's inline 15 and missed these two.  Its own name here so the table says
   which cells still carry it (hit-door.md decision 1). */
const LEFTOVER_BLOCK_COST = 15;

/* One row per way a monster's blow reaches a player.  Cells:
 *
 *   shield   the harvest shield (gathering.js _extractionShielded): 'door' --
 *            asked here; 'tick' -- the caller's loop asks it first; null --
 *            not asked (a harvester is hit).
 *   shelter  the Wheel's safe ground (wheelzone.js _wheelSheltered, which lets
 *            a monster you provoked through): 'door', 'tick', or null.
 *   roll     a roll dodges it.  No row says so today; the step reads the
 *            server's own roll window (movement.js _rollOn, v2.3.3292) and
 *            does nothing on a worker without it.
 *   sight    a rock between the blow's origin and you stops it (props.js
 *            attackBlocked): 'door' -- asked before the shield;
 *            'after-shield' -- asked only of a blow the shield let past, so a
 *            raised shield pays for a swing through a rock; 'flight' -- the
 *            caller tests the ball's own flight line; null -- not asked.
 *   block    null -- it cannot be blocked.  Otherwise the shield facing the
 *            blow's origin (index.js _blockArcCovers) meets it:
 *              cost     stamina per blocked hit (x _blockStaminaMult, at least
 *                       1, only while BLOCK_COSTS_STAMINA); 0 = free
 *              parry    a shield raised within PARRY_WINDOW_MS parries it: no
 *                       cost, stamina back, the attacker staggered
 *              counts   the shield takes it as a HIT OF 0 rather than ending
 *                       it: it is still a hit (regen waits, the monster's own
 *                       blow still does what it does after), saved coalesced
 *              save     'whole' -- a cost writes the whole character
 *                       (_saveRpg); otherwise the pools, coalesced
 *              thorns   the old Defense grid's thorns hurt the attacker back
 *                       (a character from before the trained skills only)
 *   wrongWay the snowball's: after its own shield test from the thrower, a
 *            second from where it LANDED, which a raised shield always passes
 *            (a zero-length direction counts as covered) -- so a shield facing
 *            away still blocks a ball, at `cost`, counted as a hit
 *            (hit-door.md decision 2).
 *   rail     the most one blow may take, as a share of max HP (at least 1);
 *            0 = none.
 *   elemental  priced as elemental damage: Elem Resist reads it, Dodge and
 *            Defense do not (combat.js _applyDamage).
 *   own      what a monster's own blow does after the dice: 'contact' --
 *            thorn's answer (Flora's status on the monster), the hexer's
 *            curse, the element's status (monsterstatus.js _elemOnHit) and the
 *            monster marked moved for the tick; 'elem' -- the element's status
 *            only; null -- nothing. */
const row = (r) => Object.freeze({
  shield: null, shelter: null, roll: false, sight: null, block: null,
  wrongWay: null, rail: 0, elemental: false, own: null, ...r,
});
const block = (b) => Object.freeze({ cost: 0, parry: false, counts: false, save: null, thorns: false, ...b });

export const MONSTER_HITS = Object.freeze({
  /* a basic swing, at impact (telegraph.js _resolveBasicSwingHit) */
  swing: row({
    shield: 'door', shelter: 'door', sight: 'after-shield',
    block: block({ cost: BLOCK_STAMINA_COST, parry: true, thorns: true }),
    own: 'contact',
  }),
  /* a snowman's ball, where it lands (index.js _tickMonsters) */
  snowball: row({
    shield: 'door', shelter: 'door', sight: 'flight',
    block: block({ cost: 0 }),
    wrongWay: block({ cost: LEFTOVER_BLOCK_COST, counts: true }),
    own: 'contact',
  }),
  /* the snow pile's touch (telegraph.js _resolveBurrow) -- and every direct
     call of _monsterStrikePlayer, whose behaviour this row is */
  pile: row({
    shield: 'door', shelter: 'door', sight: 'door',
    block: block({ cost: LEFTOVER_BLOCK_COST, counts: true }),
    own: 'contact',
  }),
  /* a telegraphed cast: the brute's slam, the fodder's lunge
     (telegraph.js _resolveMonsterTelegraph -> _telegraphHitPlayer) */
  kit: row({
    shelter: 'door',
    block: block({ cost: BLOCK_STAMINA_COST, parry: true }),
    rail: TELEGRAPH.MAX_HIT_PCT, own: 'elem',
  }),
  /* a blue slime going off (telegraph.js _resolveSlimeBurst) */
  burst: row({
    shelter: 'door',
    block: block({ cost: BLOCK_STAMINA_COST, parry: true }),
    rail: TELEGRAPH.MAX_HIT_PCT, elemental: true, own: 'elem',
  }),
  /* a dungeon boss's ability (dungeon.js _dungeonBossHitPlayer) */
  boss: row({
    block: block({ cost: LEFTOVER_BLOCK_COST, save: 'whole' }),
    rail: BOSS_ABILITIES.MAX_HIT_PCT,
  }),
  /* ground a fire goblin set alight (firetrail.js _tickFireTrail);
     the rail is the telegraph's 0.5, which firetrail.js always wrote out */
  fire: row({ shelter: 'tick', rail: 0.5, elemental: true }),
  /* a storm monster's arc to a player near the one it struck
     (monsterstatus.js _shockArcs) */
  shock: row({ shield: 'tick', shelter: 'tick', rail: SHOCK.MAX_HP_PCT, elemental: true }),
  /* a burn's and a poison's tick (monsterstatus.js _tickDots) */
  burn: row({ shield: 'tick', shelter: 'tick', rail: BURN.MAX_HP_PCT, elemental: true }),
  poison: row({ shield: 'tick', shelter: 'tick', rail: POISON.MAX_HP_PCT, elemental: true }),
});

export const hitMethods = {
  /* THE DOOR.  `h`:
       src      the row's name in MONSTER_HITS
       zoneId, pid
       m        the monster whose blow it is (null for a patch's or a
                burn's tick, whose goblin may be dead)
       mid, lvl the monster's id and level: kill credit, the death's cause,
                the event, the level edge on Dodge/Defense/Resist
       raw      the blow before the rail
       at       {x, y}: the event's attackerX/Y, and where a rock and a
                counted block are measured from
       from     {x, y}: where the shield is measured from, when not `at`
                (the snowball: the thrower, while `at` is where it landed)
       ability  the event's tag, display only
       extra    more event fields, or a function of _applyDamage's answer
       now      the caller's clock, when it has one
     Returns the HP the blow took (0 when it was stopped, blocked or
     dodged). */
  _monsterHit(h) {
    const R = Object.prototype.hasOwnProperty.call(MONSTER_HITS, h.src) ? MONSTER_HITS[h.src] : null;
    const ps = this.playerState[h.pid];
    if (!R || !ps) return 0;
    const now = h.now || Date.now();
    const { zoneId, pid, m } = h;

    /* 1-4: the gates.  Silent: no event, so the phone draws nothing rather
       than a "0" it would have to explain. */
    if (R.shield === 'door' && this._extractionShielded(pid, now)) return 0;
    if (R.shelter === 'door' && zoneId === WHEEL_ZONE && this._wheelSheltered && this._wheelSheltered(m, pid, ps.x, ps.y, now)) return 0;
    if (R.roll && typeof this._rollOn === 'function' && this._rollOn(ps, now)) return 0;
    if (R.sight === 'door' && attackBlocked(zoneId, h.at.x, h.at.y, ps.x, ps.y)) return 0;

    /* 5: the shield */
    let B = null;
    if (R.block) {
      const from = h.from || h.at;
      if (this._blockArcCovers(ps, from.x, from.y)) B = R.block;
      else if (R.wrongWay && this._blockArcCovers(ps, h.at.x, h.at.y)) B = R.wrongWay;
    }
    if (B && !B.counts) return this._hitStopped(h, B, ps, now);
    if (!B && R.sight === 'after-shield' && attackBlocked(zoneId, h.at.x, h.at.y, ps.x, ps.y)) return 0;

    /* 6: the dice */
    const raw = R.rail > 0 ? Math.min(h.raw, Math.max(1, Math.floor((ps.maxHp || 100) * R.rail))) : h.raw;
    const res = this._applyDamage(ps, raw, !!B, R.elemental ? { elemental: true, attackerLevel: h.lvl } : { attackerLevel: h.lvl });
    let drain = 0;
    if (B && BLOCK_COSTS_STAMINA && B.cost > 0 && typeof ps.stamina === 'number') {
      drain = Math.max(1, Math.round(B.cost * this._blockStaminaMult(ps)));
      ps.stamina = Math.max(0, ps.stamina - drain);
      this._saveRpgPools(pid, ps);
    }

    /* 7: what the monster's own blow does after */
    if (R.own === 'contact') {
      /* v2.3.1569: THORN answers the monster's own aggression, the moment it
         commits to an attack -- through the normal kill-credit path, so a
         monster that thorns itself to death still pays out */
      if (m.statuses && m.statuses.thorn) {
        const recoil = thornRecoil(m.statuses.thorn);   /* v2.3.3264: elemental.js */
        if (recoil > 0) this._applyMonsterDot(zoneId, m, recoil, m.statuses.thorn.sourceId, 'thorn');
      }
      /* v2.3.1139: a hexer's blow curses its victim -- -30% outgoing damage
         for 4 s, read by _computeAttackDamage */
      if (m.arch === 'hexer' && !res.dodged) ps._cursedUntil = now + 4000;
    }
    /* the damage counts toward a melee kill's lifesteal -- the zone-entry
       grace's would-be damage too, so the next kill still refunds */
    if (!res.dodged) this._trackMonsterDamage(ps, h.mid, res.graced ? (res.dmgIntent || 0) : res.dmgTaken);
    /* v2.3.2996: a chill, a burn, a gust, a hold... (monsterstatus.js); a
       block, a dodge and the grace carry the element's name only */
    const elemHit = (R.own === 'contact' || R.own === 'elem') && this._elemOnHit
      ? this._elemOnHit(zoneId, m, pid, ps, res, now) : null;

    /* 8: the event, the save, the death */
    const extra = typeof h.extra === 'function' ? h.extra(res) : h.extra;
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: h.mid, targetId: pid,
        dmg: raw, dmgTaken: res.dmgTaken, dodged: res.dodged,
        hp: Math.max(0, Math.round(ps.hp || 0)),   /* v2.3.3263: the bar after the blow, as pvp_hit carries it */
        /* v2.3.1686: "Blocked!" and the cost in place of a number; undefined
           -- and so off the wire -- on every hit that was not blocked */
        blocked: B ? true : undefined,
        staminaDrain: drain > 0 ? drain : undefined,
        lastStand: res.lastStand || undefined,
        secondWind: res.secondWind || undefined,
        zone: zoneId, attackerX: h.at.x, attackerY: h.at.y,
        /* v2.3.2235: the source's tag gets the number past the phone's
           "no attacker near you" filter, which a cast, a patch and a tick
           would fail */
        ability: h.ability || undefined,
        ...(elemHit || null),
        ...(extra || null),
      },
    });
    this._saveRpgVitals(pid, ps);   /* v2.3.1623: coalesced unless near death */
    this._queuePlayerStateFlush(pid);
    if (ps.hp <= 0 && !ps.dying) this._handlePlayerDeath(ps, pid, 'monster:' + h.mid);
    /* the monster's position rides the next tick, so a stationary monster
       hitting a stationary player is never a hit from nowhere */
    if (R.own === 'contact') this._markMonsterDirty(zoneId, m.id);
    return res.dmgTaken;
  },

  /* A blow the shield stopped (5, when its block does not count as a hit):
     the parry, the cost, the old thorns, "Blocked!", and nothing else -- no
     HP touched, nothing counted as being hit. */
  _hitStopped(h, B, ps, now) {
    const { zoneId, pid, m } = h;
    /* v2.3.1731: a shield raised in time parries -- the attacker staggered,
       the stamina back instead of spent */
    const parried = B.parry && this._parryOpen(ps, now);
    if (parried) this._applyParry(zoneId, m, pid, ps, now);
    const cost = (BLOCK_COSTS_STAMINA && !parried && B.cost > 0)
      ? Math.max(1, Math.round(B.cost * this._blockStaminaMult(ps)))
      : 0;
    if (cost > 0 && typeof ps.stamina === 'number') {
      ps.stamina = Math.max(0, ps.stamina - cost);
      if (B.save === 'whole') this._saveRpg(pid, ps);
      else this._saveRpgPools(pid, ps);   /* coalesced -- see v2.3.1619b */
      this._queuePlayerStateFlush(pid);
    }
    if (B.thorns) this._legacyThornsReflect(zoneId, m, pid, ps);
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: m.id, targetId: pid, dmg: m.dmg, dmgTaken: 0, blocked: true,
        parried: parried || undefined,
        staminaDrain: cost > 0 ? cost : undefined,
        /* v2.3.3296: the bar, unchanged -- see the header */
        hp: Math.max(0, Math.round(ps.hp || 0)),
        zone: zoneId, attackerX: h.at.x, attackerY: h.at.y,
      },
    });
    return 0;
  },

  /* The old Defense grid's thorns: a blocked swing hurts the attacker back.
     A character from before the trained skills only (prog3 has no such
     channel), and never a monster that cannot be hit -- v2.3.2221: a pile
     that cannot be swung at must not be hurt by being blocked.  Moved here
     verbatim from the swing's own block branch (telegraph.js). */
  _legacyThornsReflect(zoneId, m, pid, ps) {
    const pts = (ps && !ps.prog3 && ps.defenseSpec && ps.defenseSpec.thorns) || 0;
    if (!(pts > 0) || !this._monsterDamageable(m)) return;
    const reflect = Math.min(Math.max(0, m.hp), Math.max(1, this._t2Flat(ps, 'defense', 'thorns')));
    m.hp -= reflect;
    if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null);
    m.dmgByPlayer[pid] = (m.dmgByPlayer[pid] || 0) + reflect;
    this.eventBuffer.push({
      type: 'monster_hit',
      payload: {
        monsterId: m.id, zone: zoneId, dmg: reflect, isCrit: false,
        attackerId: pid, thorns: true,
        hpPct: Math.max(0, m.hp / m.maxHp),
      },
    });
    this._markMonsterDirty(zoneId, m.id);
    if (m.hp <= 0) this._resolveMonsterKill(zoneId, m, pid, ps, 'thorns');
  },
};
