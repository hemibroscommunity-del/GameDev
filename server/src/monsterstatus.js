/* ═══ v2.3.2996: A MONSTER'S HIT CARRIES ITS ELEMENT ═══
 *
 * Owner, 2026-10-03: "eventually I want elemental damage per monster type so
 * using a snowflake icon for instance when hit by a snowman's snowball and
 * slowing down for a second or having burning tick damage from a fire goblin
 * with a fire icon as the damage type.  From desert winds mummy an air icon
 * that blows the character back.  Etc"  And then: "Yeah and slime for floral
 * damage.  You can [use] a brief held in place effect, then push to main".
 *
 * So a monster's landed hit now does what its element does, by the element
 * its home zone gives it (index.js _makeZoneMonster `element`, the Wheel's
 * monsters included -- wheelzone.js builds each one in its home zone):
 *
 *   frost  the snowman      CHILL  you walk at CHILL.MULT for CHILL.MS
 *   flame  the fire goblin  BURN   BURN.TICKS ticks of damage, one a BURN.EVERY_MS
 *   wind   the mummies      GUST   shoved GUST.PX straight away from it
 *   flora  the blue slime   STUCK  held in place for STUCK.MS
 *
 * The other four elements (stone, storm, water, venom) carried nothing at
 * first: the owner's "Etc" was theirs to choose.  ═══ v2.3.3014: THEY DO NOW ═══
 * Offered "stone stuns briefly; storm shocks nearby players; water slows
 * stamina refill; venom poisons over time", the owner: "Yes continue working
 * on those items" --
 *
 *   stone  the rock monsters    DAZE    no walk, swing, roll or shield for DAZE.MS
 *   storm  the Storm Peaks'     SHOCK   the hit arcs to every other player within
 *          slimes                       SHOCK.R of you, SHOCK.PCT of it each
 *   water  the fishmen          SOAK    your stamina refills at SOAK.REGEN_MULT
 *                                       for SOAK.MS (index.js, the regen tick)
 *   venom  the wisps, the       POISON  POISON.TICKS ticks of damage, the burn's
 *          bog lurkers                  machinery, slower and longer
 *
 * Still only the elements that do something are named on the wire, so an
 * element's icon on a hit always means "this did something".
 *
 * WHO OWNS WHAT.  The SERVER decides every status: whether the hit landed
 * (not dodged, not blocked, more than 0 damage -- a graced or shielded hit
 * carries nothing), what it is, for how long, and which way a gust goes.  It
 * rides the hit's own monster_attack as four optional fields:
 *
 *   elem   'frost' | 'flame' | 'wind' | 'flora'  the damage type (the icon)
 *   st     'chill' | 'burn' | 'gust' | 'stuck'  what it did, when it did
 *   stMs   how long it lasts (a gust: how long the shove takes)
 *   kb     [dx, dy] the gust's shove in world px
 *
 * MOVEMENT IS THE CLIENT'S (movement.js), so the slow, the hold and the shove
 * are carried out by the client (src/game/elemHits.js), which acts ONLY on
 * these fields -- never on a monster's element it read for itself -- so a
 * client never shoves itself against a worker that did not grant the room for
 * it.  The worker does not enforce the slow or the hold: rejecting a move is a
 * snap-back, and at a status's length a snap-back timed by one round trip
 * would rubber-band an honest player.  It DOES widen its own speed bound for
 * a gust it granted (_gustAllowance below, read by movement.js), spent as the
 * shove is walked out and never by anything on the wire.
 *
 * THE BURN is damage, so it is the worker's alone: its ticks run here
 * (_tickMonsterBurns, once per tick from tick.js), each priced through
 * _applyDamage as ELEMENTAL (the Resist stat reads it, Dodge does not --
 * combat.js v2.3.2680) and announced as an ordinary monster_attack stamped
 * `ability: 'burn'` -- the v2.3.2235 "the worker resolved this one" bypass, so
 * a tick lands its number with the goblin long gone, exactly as the fire
 * trail's ticks do (firetrail.js).  A tick on a harvester is skipped (the
 * v2.3.1704 shield); stepping onto the Wheel's safe ground puts it out (no
 * monster damage lands there, v2.3.2978).
 *
 * DEPLOY ORDER (rule 19): every field is additive.  An old client ignores
 * them and takes exactly the damage it always did -- a burn tick shows as an
 * ordinary hit, through the same `ability` bypass the fire trail uses.  A new
 * client against an old worker never sees a field, so nothing moves.  No caps
 * flag: the client acts on what the worker SAYS happened, not on what it
 * guesses the worker supports.  Kill switch: `elemhits: false` in liveflags
 * stops every new status at once (lower case, TRAPS §117); a burn already
 * burning finishes its ticks.
 *
 * NOTHING HERE IS PERSISTED (handoff rule 1: never the rpg blob).  The burns
 * live in this._burns, the rest in underscore fields on playerState; a worker
 * restart forgetting a second of slow is correct, not a bug.  this._burns is
 * keyed by player id, client-supplied at join -- a Map, never a plain {}
 * (CLAUDE.md, the '__proto__' rule). */

import { WHEEL_ZONE } from './wheelzone.js';

export const ELEM_HITS = Object.freeze({
  frost: 'chill',
  flame: 'burn',
  wind: 'gust',
  flora: 'stuck',
  /* v2.3.3014 */
  stone: 'daze',
  storm: 'shock',
  water: 'soak',
  venom: 'poison',
});

/* "slowing down for a second" */
export const CHILL = Object.freeze({
  MS: 1000,
  /* the client's walk multiplier (src/game/elemHits.js CHILL_MULT mirrors it;
     mirror-audit.test.mjs pins the pair).  The worker never reads it. */
  MULT: 0.55,
});

/* "burning tick damage".  A level 1-2 fire goblin hits for 10-11, so a burn
   is three ticks of 2: about half a hit again, spread where you can watch it.
   Refreshed by the next hit, never stacked -- a goblin swinging once a second
   keeps one burn alight, it does not pile up a second and a third.  Tried at
   30% (ticks of 3) first: with a pack of six on you that made the Flame
   Fields' first goblins -- among the first monsters a new player meets --
   hit ~45% harder, and mp-wheelmonsters' walk through them stopped surviving. */
export const BURN = Object.freeze({
  TICKS: 3,
  EVERY_MS: 1000,
  PCT: 0.2,          /* of the hit's monster's damage, per tick */
  MAX_HP_PCT: 0.1,   /* never more than this of your max HP a tick (the no-one-shot rail) */
});

/* "blows the character back".  48 px is a step and a half: out of a mummy's
   reach (its melee ring is ~45), not across the screen.  The owner has cut
   every knockback in this game by half or more as too much (v2.3.1356,
   v2.3.1402), so this starts small -- one number to change. */
export const GUST = Object.freeze({
  PX: 48,
  MS: 240,           /* how long the client takes to carry it out */
  ALLOW_MS: 1500,    /* how long the worker's speed bound stays wider for it */
  ALLOW_MAX: 96,     /* two gusts' worth at most, however many land */
});

/* "a brief held in place effect".  IMMUNE_MS after it ends you cannot be held
   again: blue slimes are fast and travel in sixes, and without it three of
   them would hold you for good. */
export const STUCK = Object.freeze({
  MS: 700,
  IMMUNE_MS: 2000,
});

/* v2.3.3014: "stone stuns briefly".  Shorter than the slime's hold, and more:
   no walk, no swing, no roll, no shield (the client's to carry out, as the
   hold is: src/game/elemHits.js, combatHelpers.dazeRefused) -- stars round
   your head.  The Hollows' rock monsters come in sixes and hit hard, so the
   window after it before another is longer than the hold's. */
export const DAZE = Object.freeze({
  MS: 500,
  IMMUNE_MS: 2500,
});

/* v2.3.3014: "storm shocks nearby players".  A landed hit arcs from you to
   every other player within R px (the nearest MAX_ARCS of them), PCT of the
   monster's damage each, priced as elemental (Resist reads it, Dodge does
   not), never more than MAX_HP_PCT of their max HP -- the burn's no-one-shot
   rail.  Alone, it is the crackle round you (MS, the look's length); in a
   crowd it says spread out. */
export const SHOCK = Object.freeze({
  R: 150,
  PCT: 0.5,
  MAX_HP_PCT: 0.15,
  MAX_ARCS: 4,
  MS: 450,
});

/* v2.3.3014: "water slows stamina refill".  Soaked for MS (each hit starts it
   again), your stamina refills at REGEN_MULT of its pace -- the sprint, the
   roll and the shield all draw on it.  The worker's regen tick reads it
   (_soakRegenMult); the client draws the drips and the chip. */
export const SOAK = Object.freeze({
  MS: 4000,
  REGEN_MULT: 0.4,
});

/* v2.3.3014: "venom poisons over time".  The burn's machinery (one a player,
   refreshed by the next hit, never stacked, put out by the same things), but
   slower and longer: five ticks, a second apart, 12% of the hit each -- the
   burn's 60% of a hit again, spread over five seconds instead of three. */
export const POISON = Object.freeze({
  TICKS: 5,
  EVERY_MS: 1000,
  PCT: 0.12,
  MAX_HP_PCT: 0.08,
});

/* The two damage-over-time statuses, each in its own Map keyed by player id
   (client-supplied at join: a Map, never a plain {} -- the '__proto__' rule).
   `ability` is what its ticks say on the wire (the v2.3.2235 bypass), `elem`
   their icon. */
const DOTS = Object.freeze({
  burn: Object.freeze({ map: '_burns', cfg: BURN, ability: 'burn', elem: 'flame' }),
  poison: Object.freeze({ map: '_poisons', cfg: POISON, ability: 'poison', elem: 'venom' }),
});

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const monsterStatusMethods = {
  /* The element a monster's hit carries, when it carries one that does
     something: 'frost' | 'flame' | 'wind' | 'flora' (and since v2.3.3014
     'stone' | 'storm' | 'water' | 'venom'), else null.  Server-authored
     (`m.element`), checked against the table all the same. */
  _elemHitOf(m) {
    const e = m && m.element;
    return own(ELEM_HITS, e) ? e : null;
  },

  _elemHitsOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'elemhits') && !f.elemhits);
  },

  /* A monster's hit on player `pid` has been priced (`res`, _applyDamage's
     answer).  Applies what its element does and returns the fields the hit's
     monster_attack carries -- or null for a monster with no such element.
     Called from the two places a monster's own hit lands:
     _monsterStrikePlayer (the swing, the snowball, the burrow) and
     _telegraphHitPlayer (the telegraphed kits: a lunge, a burst). */
  _elemOnHit(zoneId, m, pid, ps, res, now) {
    const elem = this._elemHitOf(m);
    if (!elem || !ps || !this._elemHitsOn()) return null;
    const out = { elem };
    /* a dodge, a block, the zone-entry grace and a fully soaked hit all land
       nothing, so they carry nothing but the name */
    if (!res || res.dodged || !(res.dmgTaken > 0)) return out;
    if (ps.dead || ps.dying || !(ps.hp > 0)) return out;
    const t = typeof now === 'number' ? now : Date.now();
    const st = ELEM_HITS[elem];
    if (st === 'chill') {
      ps._chillUntil = t + CHILL.MS;
      out.st = st; out.stMs = CHILL.MS;
    } else if (st === 'burn') {
      this._igniteBurn(zoneId, m, pid, t);
      out.st = st; out.stMs = BURN.TICKS * BURN.EVERY_MS;
    } else if (st === 'gust') {
      const kb = this._gustShove(zoneId, m, ps);
      if (kb) {
        /* what is left of an earlier gust still counts, up to ALLOW_MAX */
        const live = (t < (ps._gustUntil || 0) && ps._gustLeft > 0) ? ps._gustLeft : 0;
        ps._gustLeft = Math.min(GUST.ALLOW_MAX, live + Math.hypot(kb[0], kb[1]));
        ps._gustUntil = t + GUST.ALLOW_MS;
        out.st = st; out.stMs = GUST.MS; out.kb = kb;
      }
    } else if (st === 'stuck') {
      if (!(t < (ps._stuckImmuneUntil || 0))) {
        ps._stuckUntil = t + STUCK.MS;
        ps._stuckImmuneUntil = t + STUCK.MS + STUCK.IMMUNE_MS;
        out.st = st; out.stMs = STUCK.MS;
      }
    } else if (st === 'daze') {
      /* v2.3.3014: the stun, with its window after (STUCK's rule) */
      if (!(t < (ps._dazeImmuneUntil || 0))) {
        ps._dazeUntil = t + DAZE.MS;
        ps._dazeImmuneUntil = t + DAZE.MS + DAZE.IMMUNE_MS;
        out.st = st; out.stMs = DAZE.MS;
      }
    } else if (st === 'shock') {
      /* v2.3.3014: the crackle on you, and the arcs to whoever stands near */
      const n = this._shockArcs(zoneId, m, pid, ps, t);
      out.st = st; out.stMs = SHOCK.MS;
      if (n > 0) out.arcs = n;
    } else if (st === 'soak') {
      ps._soakUntil = t + SOAK.MS;
      out.st = st; out.stMs = SOAK.MS;
    } else if (st === 'poison') {
      this._igniteDot('poison', zoneId, m, pid, t);
      out.st = st; out.stMs = POISON.TICKS * POISON.EVERY_MS;
    }
    return out;
  },

  /* ═══ v2.3.3014: THE STORM'S ARCS ═══
     From the player a storm monster just struck (`ps`) to every other player
     standing within SHOCK.R of them -- the nearest SHOCK.MAX_ARCS, ties by id
     so it is the same on every run.  Not the dead, the dying, the
     disconnected, a harvester (the v2.3.1704 shield) or anyone on the Wheel's
     safe ground (no monster damage lands there).  Each takes PCT of the
     monster's damage, elemental, under the no-one-shot rail, announced as its
     own monster_attack `ability: 'shock'` from where the struck player stands
     (attackerX/Y: the arc's start, and the bypass past the client's range
     filter, as the burn's ticks have it).  Returns how many it reached. */
  _shockArcs(zoneId, m, pid, ps, now) {
    if (!ps || typeof ps.x !== 'number' || typeof ps.y !== 'number') return 0;
    const r2 = SHOCK.R * SHOCK.R;
    const near = [];
    for (const oid of Object.keys(this.playerState)) {
      if (oid === pid) continue;
      const o = this.playerState[oid];
      if (!o || o.z !== zoneId || o.dead || o.dying || o.disconnected || !(o.hp > 0)) continue;
      if (typeof o.x !== 'number' || typeof o.y !== 'number') continue;
      const dx = o.x - ps.x, dy = o.y - ps.y, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (zoneId === WHEEL_ZONE && this._wheelSheltered && this._wheelSheltered(m, oid, o.x, o.y, now)) continue; /* v2.3.3056: unless it provoked m */
      if (this._extractionShielded && this._extractionShielded(oid, now)) continue;
      near.push({ oid, o, d2 });
    }
    near.sort((a, b) => a.d2 - b.d2 || (a.oid < b.oid ? -1 : a.oid > b.oid ? 1 : 0));
    let n = 0;
    for (const { oid, o } of near.slice(0, SHOCK.MAX_ARCS)) {
      const raw = Math.max(1, Math.min(Math.round((m.dmg || 0) * SHOCK.PCT), Math.floor((o.maxHp || 100) * SHOCK.MAX_HP_PCT)));
      const res = this._applyDamage(o, raw, false, { elemental: true, attackerLevel: m.level });
      if (!res.dodged) this._trackMonsterDamage(o, m.id, res.graced ? (res.dmgIntent || 0) : res.dmgTaken);
      const landed = res.dmgTaken > 0;
      this.eventBuffer.push({
        type: 'monster_attack',
        payload: {
          monsterId: m.id, targetId: oid, dmg: raw, dmgTaken: res.dmgTaken,
          dodged: res.dodged, lastStand: res.lastStand || undefined,
          secondWind: res.secondWind || undefined,
          zone: zoneId,
          /* the arc comes from the player it struck first */
          attackerX: ps.x, attackerY: ps.y,
          ability: 'shock',
          elem: 'storm',
          ...(landed ? { st: 'shock', stMs: SHOCK.MS } : {}),
        },
      });
      this._saveRpgVitals(oid, o);
      this._queuePlayerStateFlush(oid);
      if (o.hp <= 0 && !o.dying) this._handlePlayerDeath(o, oid, 'monster:' + m.id);
      n++;
    }
    return n;
  },

  /* v2.3.3014: the regen tick's stamina multiplier (index.js): SOAK.REGEN_MULT
     while soaked, else exactly 1. */
  _soakRegenMult(ps, now) {
    return ps && ps._soakUntil && now < ps._soakUntil ? SOAK.REGEN_MULT : 1;
  },

  /* The gust's shove, [dx, dy] in whole px: straight away from the monster
     that struck, GUST.PX long times the zone's depth where you stand (the
     dunes' far edge draws everything smaller, depth.js).  null when you stand
     on top of it and there is no "away". */
  _gustShove(zoneId, m, ps) {
    const dx = ps.x - m.x, dy = ps.y - m.y;
    const d = Math.hypot(dx, dy);
    if (!(d > 0.5)) return null;
    const k = this._depthK ? this._depthK(zoneId, ps.y) : 1;
    const len = GUST.PX * (k > 0 ? k : 1);
    return [Math.round(dx / d * len), Math.round(dy / d * len)];
  },

  /* movement.js: how much further than walking this player may move in one
     step right now -- what is left of the gusts the worker granted. */
  _gustAllowance(ps, now) {
    if (!ps || !(ps._gustLeft > 0)) return 0;
    if (!(now < (ps._gustUntil || 0))) { ps._gustLeft = 0; return 0; }
    return ps._gustLeft;
  },

  /* ...and the part of it a move just used. */
  _spendGust(ps, over) {
    if (!ps || !(over > 0) || !(ps._gustLeft > 0)) return;
    ps._gustLeft = Math.max(0, ps._gustLeft - over);
  },

  /* Set player `pid` burning, or keep the burn alight: a hit while burning
     restarts the count but not the clock, so a goblin swinging faster than a
     tick cannot hold the next tick off for ever. */
  _igniteBurn(zoneId, m, pid, now) {
    return this._igniteDot('burn', zoneId, m, pid, now);
  },

  /* v2.3.3014: the burn's rule for either damage-over-time status (DOTS):
     the burn, and the venom's poison in its own Map. */
  _igniteDot(kind, zoneId, m, pid, now) {
    const D = DOTS[kind], C = D.cfg;
    if (!this[D.map]) this[D.map] = new Map();
    const per = Math.max(1, Math.round((m.dmg || 0) * C.PCT));
    const b = this[D.map].get(pid);
    if (b && b.zone === zoneId) {
      b.left = C.TICKS;
      b.dmg = Math.max(b.dmg, per);
      b.mid = m.id; b.lvl = m.level;
      return b;
    }
    const nb = { zone: zoneId, mid: m.id, lvl: m.level, dmg: per, left: C.TICKS, next: now + C.EVERY_MS };
    this[D.map].set(pid, nb);
    return nb;
  },

  /* Once a tick (tick.js): every burn whose next tick is due.  Burns that
     can no longer land -- the player gone, dead, in another zone, or on the
     Wheel's safe ground -- are put out here rather than wherever that
     happened, so nothing else has to remember them.  v2.3.3014: and every
     poison, by the same rules (the name stays: tick.js calls it). */
  _tickMonsterBurns(now) {
    this._tickDots('burn', now);
    this._tickDots('poison', now);
  },

  _tickDots(kind, now) {
    const D = DOTS[kind], C = D.cfg;
    const dots = this[D.map];
    if (!dots || dots.size === 0) return;
    for (const [pid, b] of dots) {
      const ps = this.playerState[pid];
      if (!ps || ps.dead || ps.dying || ps.disconnected || ps.z !== b.zone || !(ps.hp > 0)) { dots.delete(pid); continue; }
      /* v2.3.3056: put out on the safe ground unless the player is still fighting from it */
      if (b.zone === WHEEL_ZONE && this._wheelSheltered && this._wheelSheltered(null, pid, ps.x, ps.y, now)) { dots.delete(pid); continue; }
      if (now < b.next) continue;
      b.next = now + C.EVERY_MS;
      b.left--;
      /* the harvester takes no monster damage (v2.3.1704): the tick passes */
      if (!(this._extractionShielded && this._extractionShielded(pid, now))) this._dotTick(kind, pid, ps, b);
      if (b.left <= 0 || !this.playerState[pid] || ps.dying || ps.dead) dots.delete(pid);
    }
  },

  /* One tick of a burn on one player: the fire trail's shape (firetrail.js
     _fireTrailHitPlayer) -- the no-one-shot clamp, _applyDamage as elemental,
     kill credit to the goblin who lit it, the monster_attack, the vitals save
     and the death check. */
  _burnTick(pid, ps, b) {
    return this._dotTick('burn', pid, ps, b);
  },

  /* v2.3.3014: ...and of a poison, its own ability and icon */
  _dotTick(kind, pid, ps, b) {
    const D = DOTS[kind], C = D.cfg;
    const raw = Math.min(b.dmg, Math.max(1, Math.floor((ps.maxHp || 100) * C.MAX_HP_PCT)));
    const res = this._applyDamage(ps, raw, false, { elemental: true, attackerLevel: b.lvl });
    if (!res.dodged) this._trackMonsterDamage(ps, b.mid, res.graced ? (res.dmgIntent || 0) : res.dmgTaken);
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: b.mid, targetId: pid, dmg: raw, dmgTaken: res.dmgTaken,
        dodged: res.dodged, lastStand: res.lastStand || undefined,
        secondWind: res.secondWind || undefined,
        zone: b.zone,
        /* the fire is on you, not on the goblin: the client points its
           feedback at attackerX/Y */
        attackerX: ps.x, attackerY: ps.y,
        /* v2.3.2235's bypass: the goblin may be dead or across the map by the
           time his fire bites, and without it the number is dropped by the
           handler's first filter */
        ability: D.ability,
        elem: D.elem,
      },
    });
    this._saveRpgVitals(pid, ps);
    this._queuePlayerStateFlush(pid);
    if (ps.hp <= 0 && !ps.dying) this._handlePlayerDeath(ps, pid, 'monster:' + b.mid);
    return res.dmgTaken;
  },
};
