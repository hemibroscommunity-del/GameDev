/* ═══ v2.3.3264: WHAT A HIT DOES TO A MONSTER, IT DOES TO A PLAYER ═══
 *
 * Owner, 2026-10-15, after "Everything is 1 version" made the hit itself one
 * number (combat.js _rollHit): asked whether the effects that still landed on
 * monsters only should reach players too -- "Yes the monster only extras
 * should work on players too".
 *
 * WHAT WAS MONSTER-ONLY (the audit, docs/specs/one-formula.md "The extras"),
 * and what of it reaches a player now:
 *   1. the weapon's ELEMENT -- a gem set in it puts its status on what it hits
 *      (elemental.js: burn, freeze, soak, root, shock, fracture, slow, curse,
 *      reveal, thorn), and a second element DETONATES the first (a collision);
 *   2. the staff's SPLASH (a basic bolt: half to the nearest three) and the big
 *      bolt's BLAST (a third to six) -- off a monster only, and a bolt that hit
 *      a player splashed nothing at all;
 *   3. the ELEMENT BURST (burst.js): a nova that hits and statuses everything
 *      within 70 px;
 *   4. the stamina ABILITIES (abilities.js): the shield bash, the whirlwind and
 *      the dodge-lunge (the sword's opening dash is pvplunge.js's, v2.3.3262);
 *   5. the HEAL ON A KILL: melee lifesteal (90% of what it dealt you, back, on
 *      a melee killing blow) and Lifeblood;
 *   6. the PARRY: a block within 250 ms of raising the shield is free, gives 10
 *      stamina back and staggers the attacker for 1.5 s.
 *   The owner's yes was to a list -- "gem burn and root, the staff's splash,
 *   whirlwind, lunge and shield bash, and the sword's heal on a kill" -- and
 *   the burst, the collisions and the parry go with it (the same kinds of
 *   thing, and the fight simulator finds the parry changes nothing).  TWO
 *   MORE ARE NOT ON PLAYERS YET, measured and left to the owner
 *   (docs/specs/one-formula.md "Not on players yet"):
 *     - the KNOCKBACK of an ordinary hit (30 px, a crit 45, a special 60): a
 *       monster walks a shove back (index.js KB_RECOVER_PX_PER_TICK), a
 *       player keeping their distance keeps it;
 *     - the bow volley's BURN (four ordinary hits, 500 ms apart): on a
 *       monster the worker's lane lets most of them through only in place of
 *       the archer's next arrows, against a player a kiting archer gets all
 *       four free -- a skilled sword's fights with a skilled bow 91% won -> 6%.
 *   Retired or dead, so not here: the arrow blast (refused while the volley is
 *   live, arrowblast.js), shield thorns (legacy builds only, telegraph.js).
 *
 * THE RULES, in the order they decide anything:
 *   - ONE DOOR.  Every one of these reaches a player through _strikePlayer
 *     below, which asks _pvpAllowed first (handoff rule 17: a duel, an arena
 *     match, or No man's land), then the shield, the roll, the i-frames.
 *   - THE SAME NUMBERS.  Each is the very function or constant the monster
 *     side uses: the ability's dmgMult over the same roll and its own shove,
 *     the splash's FRAC of the same capped roll, the status table's own
 *     durations and ticks (elemental.js tickElementStatuses), the collision
 *     table, the 90% (combat.js LIFESTEAL_REFUND).  Fracture amplifies on a
 *     player exactly the sources it amplifies on a monster.
 *   - ATTACKING IS A CHOICE (v2.3.3253).  A move that names its target (the
 *     dash, the bash, the lunge, the lock) may hit the player it names.  A move
 *     that hits an AREA (the whirlwind, the burst, a splash, a blast, a bash
 *     with nothing named) hits only players you are already fighting: a duel
 *     or arena partner, or someone you traded a hit with in the last
 *     ENGAGE_MS.  So a whirlwind in No man's land never starts a fight with a
 *     bystander, and never misses the one you are in.
 *   - A PLAYER CANNOT BE LOCKED DOWN.  The one thing that is the target's own,
 *     like armour: a freeze and every ability's stun hold a player as a stone
 *     monster's daze does (DAZE.MS, then DAZE.IMMUNE_MS before another), a
 *     root as a slime's hold does (STUCK), whoever lands it -- the rule the
 *     owner chose for monsters' holds on players (v2.3.2996, v2.3.3014).  A
 *     frozen monster stays frozen for 3 s and a fast frost sword keeps it
 *     there; the same on a player would be a fight with no second half.  The
 *     status itself (its damage, its slow, its part in a collision) runs its
 *     full length, the same as on a monster.
 *   - THE WORKER ROLLS IT ALL.  Every number is the worker's roll and the
 *     targets are the worker's positions.  An ordinary hit's element is the
 *     claim's, read where a hit on a monster reads it (setting a gem is the
 *     page's alone, EnchantPanel: _pvpClaimElement); an ability's or the
 *     burst's, the worker's copy of the weapon, as on a monster.
 *
 * THE WIRE.  No new message: every blow is a pvp_hit (PRIVILEGED), with what
 * it was (`ability`: 'bash' 'whirl' 'lunge' 'burst' 'splash' 'blast'
 * 'collision', or a tick: 'burn' 'root' 'thorn'), and what it did, in
 * monster_attack's own words (`elem`, `st`, `stMs`, `kb` -- a bash's shove or
 * a whirlwind's pull, never an ordinary hit's -- `wd`; `mult` for a slow,
 * `stacks` for a fracture); a parry is the `parry` event with `attackerId`;
 * the heal is lifesteal_credit with `victimId`.  An old page draws a pvp_hit
 * it does not fully understand as a plain hit.
 *
 * SWITCHES.  caps.pvpextras (join.js) tells the page to name a player as an
 * ability's target; `pvpextras: false` in liveflags takes every extra off
 * players at once, and so does `oneformula: false` or `pvpbalance: false`
 * (the extras ride the one formula's numbers).
 *
 * NOTHING IS PERSISTED (handoff rule 1): the statuses, the pairs and the
 * damage records live on playerState's underscore fields and in Maps on the
 * room, keyed by player id (client-supplied at join: Maps and null-prototype
 * objects only, CLAUDE.md's '__proto__' rule). */

import {
  ELEMENT_STATUS, applyElementStatus, resolveElementCollision, tickElementStatuses,
  fractureDmgMult, elemAttackStat, thornRecoil,
} from './elemental.js';
import { GUST, STUCK, DAZE, SHOCK } from './monsterstatus.js';
import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from './data.js';
import { STAFF_BOLT, STAFF_SPLASH, LIFESTEAL_REFUND } from './combat.js';

export const PVP_EXTRAS = Object.freeze({
  /* "already fighting": a hit between the two, either way, this recently --
     the fight-food window (cooking.js PVP_HEAL.WINDOW_MS), the same length */
  ENGAGE_MS: 10000,
  /* pairs kept before the stale ones are swept (a room holds 120) */
  ENGAGE_MAX: 2048,
  /* a thorned player's recoil is per ATTACK (a swing, a cast), not per target
     a whirlwind catches -- a monster's is per swing (index.js) */
  THORN_GAP_MS: 400,
  /* the longest shove the worker grants and the page carries out
     (src/game/elemHits.js MAX_KB_PX): a bash shoves 90, a whirlwind pulls
     from 240 px */
  SHOVE_MAX: 200,
  /* a slowed player walks at this (elemental.js elementMoveMult's slow) */
  SLOW_MULT: 0.4,
});

/* The statuses a player's weapon puts on a player that a monster's hit never
   does (the page's ELEM_STATUSES = monsterstatus.js ELEM_HITS + these;
   mirror-audit.test.mjs): a wind gem's slow, a stone gem's fracture, a flora
   gem's thorns.  The rest borrow the words a monster's element already has
   (burn, stuck, daze, soak, shock). */
export const PVP_STATUSES = Object.freeze(['slow', 'fracture', 'thorn']);

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const SLOT_CAT = (slot) => (slot === 'ranged' ? 'bow' : slot === 'staff' ? 'staff' : 'sword');

export const pvpExtrasMethods = {
  /* The kill switch, read the meals' way, and the two it rides on. */
  _pvpExtrasOn() {
    const f = this._liveFlags;
    if (f && typeof f === 'object' && own(f, 'pvpextras') && !f.pvpextras) return false;
    if (typeof this._oneFormulaOn === 'function' && !this._oneFormulaOn()) return false;
    if (typeof this._pvpBalanceOff === 'function' && this._pvpBalanceOff()) return false;
    return true;
  },

  /* ═══ WHO IS FIGHTING WHOM ═══ */
  _notePvpEngage(a, b, now) {
    if (!a || !b || a === b) return;
    if (!this._pvpEngage) this._pvpEngage = new Map();
    if (this._pvpEngage.size >= PVP_EXTRAS.ENGAGE_MAX) {
      for (const [k, t] of this._pvpEngage) if (now - t > PVP_EXTRAS.ENGAGE_MS) this._pvpEngage.delete(k);
      if (this._pvpEngage.size >= PVP_EXTRAS.ENGAGE_MAX) this._pvpEngage.clear();
    }
    this._pvpEngage.set(this._pvpPairKey(a, b), now);
  },

  /* A duel or arena partner (a live consent pair), or a hit between the two
     within ENGAGE_MS. */
  _pvpEngaged(a, b, now) {
    /* v2.3.3265: a sparring clone and its owner are always fighting (spar.js) */
    if (this._sparById && this._sparById.size && this._sparPair(a, b)) return true;
    const k = this._pvpPairKey(a, b);
    if (this._pvpConsent) {
      const until = this._pvpConsent.get(k);
      if (until && until > now) return true;
    }
    const t = this._pvpEngage && this._pvpEngage.get(k);
    return typeof t === 'number' && now - t <= PVP_EXTRAS.ENGAGE_MS;
  },

  /* The players an AREA effect centred on (x, y) with radius r may hit: alive,
     in the caster's zone, allowed (_pvpAllowed) AND already fighting the
     caster (_pvpEngaged) -- nearest first, ties by id so every run agrees. */
  _pvpAreaPlayers(casterId, casterPs, x, y, r, now, exclude) {
    if (!casterPs || !this._pvpExtrasOn()) return [];
    if (typeof x !== 'number' || typeof y !== 'number' || !(r > 0)) return [];
    const zone = casterPs.z, r2 = r * r, out = [];
    for (const pid of Object.keys(this.playerState)) {
      if (pid === casterId || pid === exclude) continue;
      const t = this.playerState[pid];
      if (!t || t.z !== zone || t.dead || t.dying || t.disconnected || !(t.hp > 0)) continue;
      if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
      const dx = t.x - x, dy = t.y - y, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (!this._pvpAllowed(casterId, pid, zone)) continue;
      if (!this._pvpEngaged(casterId, pid, now)) continue;
      out.push({ pid, ps: t, d2 });
    }
    out.sort((a, b) => a.d2 - b.d2 || (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0));
    return out;
  },

  /* A player NAMED as a move's target (the dash's, the bash's, the lunge's):
     another live player, allowed.  The name was the choice. */
  _pvpNamedPlayer(casterId, casterPs, targetId) {
    if (!casterPs || targetId == null || !this._pvpExtrasOn()) return null;
    const pid = String(targetId);
    if (pid === casterId || !own(this.playerState, pid)) return null;
    const t = this.playerState[pid];
    if (!t || t.z !== casterPs.z || t.dead || t.dying || t.disconnected || !(t.hp > 0)) return null;
    if (!this._pvpAllowed(casterId, pid, casterPs.z)) return null;
    return { pid, ps: t };
  },

  _pvpNameOf(pid) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    const s = ws && this.sessions && this.sessions.get(ws);
    return (s && s.name) || undefined;
  },

  /* ═══ STAGGER: what a parry does to the player who swung ═══
     A parried monster loses its next swing and any wind-up (index.js
     _applyParry, PARRY_STAGGER_MS); a parried player's attacks are refused
     for the same 1.5 s -- every road a blow takes (_resolvePvPAttack,
     _handleMonsterDamage, the abilities, the burst, the lunge). */
  _pvpStaggered(ps, now) {
    return !!(ps && ps._staggerUntil && (now || Date.now()) < ps._staggerUntil);
  },

  _pvpParry(attackerId, attackerPs, targetId, targetPs, now) {
    if (typeof targetPs.stamina === 'number') {
      targetPs.stamina = Math.min(targetPs.maxStamina || 100, targetPs.stamina + this.PARRY_STAMINA_REWARD);
    }
    attackerPs._staggerUntil = now + this.PARRY_STAGGER_MS;
    this.eventBuffer.push({
      type: 'parry',
      payload: {
        zone: attackerPs.z, attackerId, targetId,
        x: Math.round(attackerPs.x || 0), y: Math.round(attackerPs.y || 0), ms: this.PARRY_STAGGER_MS,
      },
    });
    this._queuePlayerStateFlush(targetId);
  },

  /* ═══ THE ELEMENT ON A PLAYER ═══
     The worker's own copy of the weapon in that slot -- what the burst and the
     lunge read for a monster too (burst.js, abilities.js). */
  _pvpSlotElement(ps, slot) {
    const w = !ps ? null : slot === 'ranged' ? ps.rangedWeapon : slot === 'staff' ? ps.staffWeapon : ps.weapon;
    const e = w && w.element1;
    return (typeof e === 'string' && own(ELEMENT_STATUS, e)) ? { element: e, w } : null;
  },

  /* An ORDINARY hit's element: the claim's `element`, exactly where a hit on
     a monster reads it (combat.js _handleMonsterDamage, monster_damage's
     `element`) -- setting a gem in a weapon is still the page's alone
     (EnchantPanel), so the worker's copy of a weapon carries none once its
     record exists, and the claim is the only place the gem is.  The same
     trust a monster hit has, and the same check: an element the status table
     has (an own key: '__proto__' and 'constructor' are nothing).  Volatile
     from the worker's copy, as on a monster.  No claimed element (an older
     page): the worker's copy. */
  _pvpClaimElement(ps, slot, payload) {
    const e = payload && payload.element;
    if (typeof e === 'string' && own(ELEMENT_STATUS, e)) {
      const w = !ps ? null : slot === 'ranged' ? ps.rangedWeapon : slot === 'staff' ? ps.staffWeapon : ps.weapon;
      return { element: e, w: w || {} };
    }
    return this._pvpSlotElement(ps, slot);
  },

  /* A player's statuses: the same holder a monster carries (`statuses`,
     elemental.js), in its own field so nothing else reads it as a monster. */
  _pvpStatusHolder(pid, ps, create) {
    let h = ps._wst;
    if (h && h.zone !== ps.z) { h = ps._wst = null; }
    if (!h && create) {
      h = ps._wst = { statuses: Object.create(null), zone: ps.z, level: 1 };
      if (!this._pvpStPlayers) this._pvpStPlayers = new Set();
      this._pvpStPlayers.add(pid);
    }
    return h || null;
  },

  _pvpClearStatuses(pid, ps) {
    if (ps) ps._wst = null;
    if (this._pvpStPlayers) this._pvpStPlayers.delete(pid);
  },

  /* A hold on a player, by the player's own rule: 'daze' (no walk, swing,
     roll or shield) or 'stuck' (no walk or roll), DAZE.MS / STUCK.MS long,
     then immune for IMMUNE_MS -- whoever holds them.  `w` the land ward.
     Returns the ms it held, or 0 while immune. */
  _pvpHold(ps, kind, now, w) {
    const C = kind === 'daze' ? DAZE : STUCK;
    const imm = kind === 'daze' ? '_dazeImmuneUntil' : '_stuckImmuneUntil';
    const until = kind === 'daze' ? '_dazeUntil' : '_stuckUntil';
    if (now < (ps[imm] || 0)) return 0;
    const ms = w > 0 ? Math.max(1, Math.round(C.MS * (1 - w))) : C.MS;
    ps[until] = now + ms;
    ps[imm] = now + ms + C.IMMUNE_MS;
    return ms;
  },

  /* The weapon's status lands on a player: the same applyElementStatus a
     monster takes (its duration, refresh, stacks and the attacker's power
     snapshot, priced with the edge against the target's level), and then what
     it means for a player -- in monster_attack's own words, so the page
     carries it out the way it carries out a monster's.  Returns those fields. */
  _pvpApplyWeaponStatus(attackerId, attackerPs, targetId, targetPs, element, cat, now) {
    if (typeof element !== 'string' || !own(ELEMENT_STATUS, element)) return null;
    const h = this._pvpStatusHolder(targetId, targetPs, true);
    h.level = this._prog3OpponentLevel(targetPs);
    const power = elemAttackStat(attackerPs, 'power', cat, h.level);
    if (!applyElementStatus(h, element, attackerId, power, now, this._attuneMult(attackerPs))) return null;
    const sid = ELEMENT_STATUS[element];
    const st = h.statuses[sid];
    const ms = Math.max(1, Math.round((st ? st.remaining : 0) * 1000));
    /* the pet out with them wards its land's element, from a player's weapon
       as from a monster (monsterstatus.js _elemOnHit) */
    const w = this._petWard ? this._petWard(targetId, targetPs, element) : 0;
    const out = { elem: element };
    if (sid === 'burn') { out.st = 'burn'; out.stMs = ms; }
    else if (sid === 'root') {
      const held = this._pvpHold(targetPs, 'stuck', now, w);
      if (held) { out.st = 'stuck'; out.stMs = held; }
    } else if (sid === 'freeze') {
      const held = this._pvpHold(targetPs, 'daze', now, w);
      if (held) { out.st = 'daze'; out.stMs = held; }
    } else if (sid === 'slow') {
      const sm = w > 0 ? Math.max(1, Math.round(ms * (1 - w))) : ms;
      out.st = 'slow'; out.stMs = sm; out.mult = PVP_EXTRAS.SLOW_MULT;
    } else if (sid === 'soak') {
      /* a monster has no stamina; a soaked player's refills at SOAK's pace
         (the regen tick reads _soakUntil, monsterstatus.js) */
      const sm = w > 0 ? Math.max(1, Math.round(ms * (1 - w))) : ms;
      targetPs._soakUntil = Math.max(targetPs._soakUntil || 0, now + sm);
      out.st = 'soak'; out.stMs = sm;
    } else if (sid === 'shock') { out.st = 'shock'; out.stMs = SHOCK.MS; }
    else if (sid === 'fracture') { out.st = 'fracture'; out.stMs = ms; out.stacks = (st && st.stacks) || 1; }
    else if (sid === 'thorn') { out.st = 'thorn'; out.stMs = ms; }
    if (w > 0 && out.st && (sid === 'root' || sid === 'freeze' || sid === 'slow' || sid === 'soak')) out.wd = Math.round(w * 100);
    return out;
  },

  /* Fracture on a player: the same +6% a stack (elemental.js), on the same
     sources it amplifies on a monster -- a weapon hit, a splash, a blast, the
     burst -- and nothing else (a monster's ability strikes, ticks and
     collisions never read it either). */
  _pvpFractureMult(ps) {
    const h = ps && ps._wst;
    return h ? fractureDmgMult(h) : 1;
  },

  /* The resonance streak's mana (combat.js _collisionResonance) is the
     attacker's, whatever the collision went off on. */
  _pvpCollision(attackerId, attackerPs, targetId, targetPs, element, cat, isVolatile, now) {
    const h = targetPs._wst;
    if (!h) return null;
    h.level = this._prog3OpponentLevel(targetPs);
    const col = resolveElementCollision(h, element, attackerPs, !!isVolatile, now, cat);
    if (col && this._collisionResonance) this._collisionResonance(attackerId, attackerPs, col, now);
    return col;
  },

  /* ═══ THE SHOVE ═══
     [dx, dy] in whole px.  `away` px straight away from (fx, fy) -- a hit's
     knockback, a bash's -- x the zone's depth where they stand, as a monster's
     is; or `pullTo` px from (fx, fy), the whirlwind's ring.  The page moves
     itself (src/game/elemHits.js, the gust's machinery) and the worker widens
     its speed bound by the same length for GUST.ALLOW_MS, never more than
     SHOVE_MAX (movement.js reads _gustAllowance). */
  _pvpShove(ps, fx, fy, spec, now) {
    if (!spec || typeof fx !== 'number' || typeof fy !== 'number') return null;
    const dx0 = (ps.x || 0) - fx, dy0 = (ps.y || 0) - fy;
    const d = Math.hypot(dx0, dy0);
    if (!(d > 0.5)) return null;
    const k = this._depthK ? (this._depthK(ps.z, ps.y) || 1) : 1;
    let len, ux = dx0 / d, uy = dy0 / d;
    if (spec.pullTo > 0) {
      const ring = spec.pullTo * k;
      if (d <= ring) return null;
      len = d - ring; ux = -ux; uy = -uy;
    } else {
      len = (spec.away || 0) * k;
    }
    len = Math.min(PVP_EXTRAS.SHOVE_MAX, len);
    if (!(len >= 1)) return null;
    const live = (now < (ps._gustUntil || 0) && ps._gustLeft > 0) ? ps._gustLeft : 0;
    ps._gustLeft = Math.min(PVP_EXTRAS.SHOVE_MAX, live + len);
    ps._gustUntil = now + GUST.ALLOW_MS;
    /* whole px toward zero, so the shove on the wire is never longer than
       the room granted (rounded, a 200 px pull at a slant read 200.1, and the
       page refuses anything over SHOVE_MAX) */
    return [Math.trunc(ux * len), Math.trunc(uy * len)];
  },

  /* ═══ WHAT A BLOW DOES AFTER IT IS PRICED ═══
     Shared by the claim path (_resolvePvPAttack) and every server-rolled
     strike (_strikePlayer).  `o`: slot, element (the weapon's), cat, volatile,
     noStatus, noCollision, kb ({away} | {pullTo}, from fromX/fromY), hold
     ('daze'), dot.  Returns { wire, col }: the fields the blow's pvp_hit
     carries, and a collision to strike after it. */
  _pvpAfterBlow(attackerId, attackerPs, targetId, targetPs, res, o, now) {
    const wire = {};
    let col = null;
    const landed = !!res && !res.dodged && res.dmgTaken > 0 && targetPs.hp > 0;
    /* the target's record of what this attacker dealt them, for the melee
       lifesteal THEY are owed if they kill this attacker (a monster's
       dmgFromMonster, combat.js _trackMonsterDamage, which counts its burn's
       ticks and its storm's arcs too) */
    if (res && !res.dodged) {
      const amt = res.graced ? (res.dmgIntent || 0) : (res.dmgTaken || 0);
      if (amt > 0) {
        if (!(targetPs._dmgFromPlayer instanceof Map)) targetPs._dmgFromPlayer = new Map();
        targetPs._dmgFromPlayer.set(attackerId, (targetPs._dmgFromPlayer.get(attackerId) || 0) + amt);
      }
    }
    if (!landed) return { wire, col };
    if (o.element && !o.noStatus) {
      const st = this._pvpApplyWeaponStatus(attackerId, attackerPs, targetId, targetPs, o.element, o.cat || 'sword', now);
      if (st) Object.assign(wire, st);
      if (!o.noCollision) col = this._pvpCollision(attackerId, attackerPs, targetId, targetPs, o.element, o.cat || 'sword', o.volatile, now);
    }
    if (o.hold) {
      const held = this._pvpHold(targetPs, o.hold, now, 0);
      if (held && !wire.st) { wire.st = o.hold; wire.stMs = held; }
    }
    if (o.kb) {
      const kb = this._pvpShove(targetPs, o.fromX, o.fromY, o.kb, now);
      if (kb) wire.kb = kb;
    }
    return { wire, col };
  },

  /* ═══ THE ONE DOOR FOR A SERVER-ROLLED BLOW ON A PLAYER ═══
     Every extra above reaches a player here: an ability, a splash, a blast,
     the burst, a collision, a tick, a thorn's recoil.  The
     claim path (_resolvePvPAttack) keeps its own front half -- the rewind, the
     lanes, the roll -- and shares the back half (_pvpAfterBlow, the kill heal).
     `raw` is the blow before the target's guards; `o` as _pvpAfterBlow's, plus
     ability, isCrit, fromX/fromY (where it came from: the shield's arc),
     elemental (Resist reads it, Dodge does not), noBlock (a tick, a recoil),
     fracture (the sources fracture amplifies), collision (an id).
     Returns { res, blocked, parried } or null when it could not land at all. */
  _strikePlayer(attackerId, attackerPs, targetId, targetPs, raw, o) {
    o = o || {};
    if (!attackerPs || !targetPs || attackerId === targetId) return null;
    if (targetPs.dead || targetPs.dying || targetPs.disconnected || !(targetPs.hp > 0)) return null;
    if (targetPs.z !== attackerPs.z) return null;
    if (!this._pvpAllowed(attackerId, targetId, targetPs.z)) return null;
    const now = Date.now();
    const fx = typeof o.fromX === 'number' ? o.fromX : attackerPs.x;
    const fy = typeof o.fromY === 'number' ? o.fromY : attackerPs.y;
    /* a roll's i-frames dodge a blow; a tick is already in you -- and a
       dazed player cannot roll (the lunge's rule, pvplunge.js _pvpDazed).
       v2.3.3292: a roll the worker charged for, and not over (movement.js
       ROLL) -- `dodging` alone was the phone's word, with no end to it */
    if (!o.noBlock && this._rollOn(targetPs, now) && !(this._pvpDazed && this._pvpDazed(targetPs, now))) return null;
    let blocked = false, parried = false, drain = 0;
    if (!o.noBlock && this._blockArcCovers(targetPs, fx, fy)) {
      blocked = true;
      if (!o.dot && this._parryOpen(targetPs, now)) {
        parried = true;
        this._pvpParry(attackerId, attackerPs, targetId, targetPs, now);
      } else if (BLOCK_COSTS_STAMINA && typeof targetPs.stamina === 'number') {
        drain = Math.max(1, Math.round(BLOCK_STAMINA_COST * this._blockStaminaMult(targetPs)));
        targetPs.stamina = Math.max(0, targetPs.stamina - drain);
        if (targetPs.stamina <= 0) {
          targetPs.blocking = false;
          targetPs.blockStartT = 0;
          targetPs._guardBrokenUntil = now + this.GUARD_BREAK_MS;
        }
        this._queuePlayerStateFlush(targetId);
      }
    }
    let r = Math.max(1, Math.round(raw || 0));
    if (o.fracture) r = Math.max(1, Math.round(r * this._pvpFractureMult(targetPs)));
    const res = this._applyDamage(targetPs, r, blocked,
      { attackerLevel: this._prog3OpponentLevel(attackerPs), elemental: !!o.elemental });
    if (!o.dot) attackerPs._lastDealtAt = now;
    if (this._notePvpExchange) this._notePvpExchange(attackerId, targetId, now);
    this._notePvpEngage(attackerId, targetId, now);
    const { wire, col } = this._pvpAfterBlow(attackerId, attackerPs, targetId, targetPs, res, o, now);
    this.eventBuffer.push({
      type: 'pvp_hit',
      payload: {
        attacker: attackerId,
        attackerName: this._pvpNameOf(attackerId),
        target: targetId,
        ...(o.slot ? { slot: o.slot } : null),
        ...(o.ability ? { ability: o.ability } : null),
        ...(o.collision ? { collision: o.collision } : null),
        ...(o.elem ? { elem: o.elem } : null),
        dmgBase: r,
        dmgTaken: res.dmgTaken,
        isCrit: !!o.isCrit,
        blocked,
        dodged: !!res.dodged,
        ...(parried ? { parried: true } : null),
        ...(drain > 0 ? { staminaDrain: drain } : null),
        secondWind: res.secondWind || undefined,
        lastStand: res.lastStand || undefined,
        died: targetPs.hp <= 0,
        hp: Math.max(0, Math.round(targetPs.hp)),
        maxHp: Math.max(1, Math.round(targetPs.maxHp || 1)),
        ts: now,
        ...wire,
      },
    });
    /* a blow under No man's land's rule skulls both, as the claim path's does
       (a tick rides the blow that set it) */
    /* v2.3.3301: ...and a tick keeps the kill that player's without a skull
       of its own (nomansland.js _nmlTouch): a poison's last tick a little
       after its blow killed with nothing taken, as if a monster had */
    if (this._nmlAllowed && attackerPs.z === 'wheel' && this._nmlAllowed(attackerId, targetId)
        && !(this._pvpConsent && (this._pvpConsent.get(this._pvpPairKey(attackerId, targetId)) || 0) > now)) {
      if (!o.dot) this._nmlOnHit(attackerId, targetId, now);
      else if (this._nmlTouch) this._nmlTouch(attackerId, targetId, now);
    }
    this._saveRpgVitals(targetId, targetPs);
    this._queuePlayerStateFlush(targetId);
    if (col && targetPs.hp > 0 && !targetPs.dying) {
      /* part of the blow that set it off: no shield, no skull of its own, and
         a kill by it is that blow's (a monster's collision kill pays that
         hit's lifesteal, combat.js) */
      this._strikePlayer(attackerId, attackerPs, targetId, targetPs, col.dmg,
        { slot: o.slot, ability: 'collision', collision: col.id, elemental: true, noBlock: true, dot: true,
          killSlot: o.dot ? 'dot' : (o.slot || 'melee') });
    }
    if (targetPs.hp <= 0 && !targetPs.dying) {
      this._pvpKillHeal(attackerId, attackerPs, targetId, o.killSlot || (o.dot ? 'dot' : (o.slot || 'melee')));
      this._handlePlayerDeath(targetPs, targetId, 'pvp:' + attackerId);
    }
    return { res, blocked, parried };
  },

  /* ═══ THE HEAL ON A KILL ═══
     A monster's kill pays the killer Lifeblood and, on a melee killing blow,
     90% of what that monster dealt them (combat.js _resolveMonsterKill).  A
     player's kill, the same: Lifeblood, and on a melee killing blow 90% of
     what the victim dealt the killer.  lifesteal_credit says so, with
     `victimId` where a monster's says `monsterId`. */
  _pvpKillHeal(killerId, killerPs, victimId, slot) {
    if (!this._pvpExtrasOn() || !killerPs || killerPs.dying || !(killerPs.hp > 0)) return;
    const maxHp = killerPs.maxHp || 100;
    const lb = this._lifebloodFlat ? this._lifebloodFlat(killerPs) : 0;
    if (lb > 0) killerPs.hp = Math.min(maxHp, killerPs.hp + lb);
    let refund = 0, reason = 'ok';
    const rec = killerPs._dmgFromPlayer instanceof Map ? killerPs._dmgFromPlayer : null;
    if (slot !== 'melee') reason = 'not-melee';
    else {
      const taken = rec ? (rec.get(victimId) || 0) : 0;
      if (taken > 0) {
        refund = Math.ceil(taken * LIFESTEAL_REFUND);
        killerPs.hp = Math.min(maxHp, killerPs.hp + refund);
        rec.delete(victimId);
      } else reason = 'no-damage';
    }
    const ws = this._wsBySessionId(killerId);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'lifesteal_credit',
          payload: { playerId: killerId, victimId, refund, reason, slot: slot || null },
        }));
      } catch (e) {}
    }
    if (refund > 0 || lb > 0) {
      this._saveRpgVitals(killerId, killerPs);
      this._queuePlayerStateFlush(killerId);
    }
  },

  /* ═══ THE TICKS ═══
     Once a tick (tick.js): every player's statuses tick by the SAME function a
     monster's do (elemental.js tickElementStatuses: a burn 5 + 0.3 x power
     every 0.5 s, a root 3 + 0.15 x power every 1 s) and expire by it.  A tick
     is the source's blow, elemental, through the one door -- so it goes out
     the moment the two may no longer fight (a duel over, No man's land left),
     and with the zone, a death or a respawn (the holder is per zone). */
  _tickPvpStatuses(now) {
    const set = this._pvpStPlayers;
    if (!set || set.size === 0) { this._pvpStTickAt = now; return; }
    const last = this._pvpStTickAt || now;
    this._pvpStTickAt = now;
    const dt = Math.max(0, Math.min(1, (now - last) / 1000));
    const on = this._pvpExtrasOn();
    for (const pid of [...set]) {
      const ps = this.playerState[pid];
      const h = ps && ps._wst;
      if (!on || !h || ps.dead || ps.dying || ps.disconnected || ps.z !== h.zone || !(ps.hp > 0)) {
        this._pvpClearStatuses(pid, ps);
        continue;
      }
      if (dt > 0) {
        const evs = tickElementStatuses(h, dt, now);
        for (const ev of evs) {
          if (!(ps.hp > 0) || ps.dying) break;
          const src = this.playerState[ev.sourceId];
          if (!src || src.disconnected || !this._pvpAllowed(ev.sourceId, pid, ps.z)) {
            if (h.statuses) delete h.statuses[ev.statusId];
            continue;
          }
          const st = h.statuses[ev.statusId];
          const elem = st && st.element;
          const w = this._petWard && elem ? this._petWard(pid, ps, elem) : 0;
          const raw = Math.max(1, Math.round(ev.dmg * (w > 0 ? 1 - w : 1)));
          this._strikePlayer(ev.sourceId, src, pid, ps, raw,
            { ability: ev.statusId, elemental: true, noBlock: true, dot: true, ...(elem ? { elem } : null) });
        }
      }
      if (ps._wst && Object.keys(ps._wst.statuses).length === 0) this._pvpClearStatuses(pid, ps);
    }
  },

  /* ═══ THORNS ═══
     A monster carrying thorn takes 4 + 0.25 x power every time it attacks
     (index.js, elemental.js thornRecoil).  A thorned player, every time they
     attack -- once per THORN_GAP_MS, a swing and not a whirlwind's every
     target -- credited to whoever thorned them, through the one door. */
  _pvpThornRecoil(attackerId, attackerPs, now) {
    const h = attackerPs && attackerPs._wst;
    const th = h && h.statuses && h.statuses.thorn;
    if (!th || !this._pvpExtrasOn()) return;
    if (now - (attackerPs._thornRecoilAt || 0) < PVP_EXTRAS.THORN_GAP_MS) return;
    attackerPs._thornRecoilAt = now;
    const src = this.playerState[th.sourceId];
    if (!src) return;
    const w = this._petWard ? this._petWard(attackerId, attackerPs, 'flora') : 0;
    const raw = Math.max(1, Math.round(thornRecoil(th) * (w > 0 ? 1 - w : 1)));
    this._strikePlayer(th.sourceId, src, attackerId, attackerPs, raw,
      { ability: 'thorn', elemental: true, noBlock: true, dot: true, elem: 'flora' });
  },

  /* ═══ THE STAFF'S SPLASH AND THE BIG BOLT'S BLAST, ON PLAYERS ═══
     The same scan as the monsters' (combat.js _staffSplash): `spec`'s
     RADIUS_PX x Detonation round the impact, FRAC of the bolt's capped roll,
     MAX_TARGETS in all (`taken` already spent on monsters), the target's
     fracture on top -- every player in it the caster is already fighting.
     No status (the splash never carries the bolt's element, on anything). */
  _pvpSplashPlayers(attackerId, attackerPs, ox, oy, primaryDmg, spec, taken, exclude, ability) {
    const sp = spec || STAFF_SPLASH;
    const left = sp.MAX_TARGETS - (taken || 0);
    if (!(left > 0) || !this._pvpExtrasOn()) return 0;
    const r = sp.RADIUS_PX * this._staffSplashMult(attackerPs);
    const near = this._pvpAreaPlayers(attackerId, attackerPs, ox, oy, r, Date.now(), exclude);
    const base = Math.max(1, Math.round(primaryDmg * sp.FRAC));
    let n = 0;
    for (const p of near.slice(0, left)) {
      if (this._strikePlayer(attackerId, attackerPs, p.pid, p.ps, base,
        { slot: 'staff', ability: ability || 'splash', fromX: ox, fromY: oy, fracture: true })) n++;
    }
    return n;
  },

  /* A bolt that hit a PLAYER splashes like one that hit a monster: the
     monsters round the impact (combat.js _staffSplash, with no primary to
     skip) and the players the caster is fighting, the struck one aside. */
  _pvpSplashFromPlayer(attackerId, attackerPs, targetId, targetPs, primaryDmg, bigBolt) {
    if (!this._pvpExtrasOn() || !targetPs) return;
    this._staffSplash(attackerPs.z, null, targetPs.x, targetPs.y, attackerId, attackerPs,
      primaryDmg, bigBolt ? STAFF_BOLT.BLAST : undefined, { exclude: targetId });
  },
};
