/* ═══ v2.3.3513: A GEM GOES INTO A WEAPON ON THE WORKER ═══
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good" --
 * every recommended answer.  This is the plan's Phase 1, and the last item of
 * ARCHITECTURE-HANDOFF backlog A.  Until now the Enchanter's weapon slot was
 * the game's alone (EnchantPanel.jsx): it took a gem off the browser's own
 * count, wrote the browser's copy of the weapon and told the worker nothing.
 * So:
 *   - the gem was never spent: the worker owns `lifeSkills.gems` (v2.3.1198)
 *     and its next player_state put the gem back;
 *   - the weapon came back plain at the next join, or the next time the
 *     worker sent its weapons (a forge, an equip, a hardening);
 *   - the Element Burst was refused, "needs an enchanted weapon" (burst.js
 *     reads the worker's copy), the flame amulet never counted (combat.js
 *     _computeAttackDamage, the same), and the Blacksmith's Take out found
 *     no gem;
 *   - and each hit's element was the phone's WORD (combat.js
 *     _handleMonsterDamage, pvpextras.js _pvpClaimElement): a modified phone
 *     could claim any element without owning a gem.
 *
 * Now the game asks, and the worker does it:
 *
 *     weapon_gem { slot, gem }    slot 'weapon' | 'rangedWeapon' | 'staffWeapon'
 *
 * The worker takes one polished gem of that element from its own count, puts
 * it into the weapon in that slot -- its first open slot: `element1`, then
 * `element2` on a weapon with two slots and Enchanting 20 (the Enchanter's own
 * rule) -- pays the Enchanting XP, saves, and answers
 *
 *     weapon_gem_result { ok: true, slot, gem, name, element1, element2,
 *                         xp, leveled, newLevel, fromLevel }
 *     weapon_gem_result { ok: false, slot, gem, reason }
 *
 * followed by the player_state that carries the weapon, the gem count and the
 * XP (the game takes its weapons wholesale from that, wsClient.js).
 *
 * WHAT A GEM DOES AND DOES NOT DO (the owner's decisions 9 and 10).  The
 * weapon keeps its metal's damage: `tierMult` is never touched (the old
 * browser-only slot wrote 1.5, which the worker's damage roll never read, and
 * for a metal above 1.5 it would have lowered it).  What the gem adds is its
 * element, on every hit -- read by the worker from ITS copy of the weapon now
 * (`_weaponHitElement`), never from the claim.  `tier` becomes 'elemental'
 * ('fusion' with a second gem) for the colour the game draws it in, and the
 * name says the element ("Copper Flame Great Sword", the shield's own rule,
 * shieldgem.js).  A full slot is NOT overwritten: take the gem out first, and
 * it comes back (amulet.js op 'extract', unchanged; the Enchanter shows it).
 *
 * THE XP, ONCE A GEM.  Decision 11: 400 Enchanting XP a gem set, into a
 * weapon, an amulet or a shield (GEM_SET_XP).  A gem that came back out (Take
 * out, a salvaged weapon) goes back into the count, so without a rule set,
 * take out, set again would buy Enchanting levels with gold -- and Enchanting
 * is on the leaderboard and the chain score.  v2.3.3513 counted the gems that
 * came back (`lifeSkills.gemsBack`) and paid nothing for setting one of those.
 *
 * v2.3.3515: THE XP IS FOR GEMS YOU MADE.  Gems are bag items now (gems.js),
 * so they trade -- and a count of the gems that came back to ME says nothing
 * of a gem that came back to someone else and was handed to me: two players
 * passing one gem (or one gemmed sword) back and forth would each be paid 400
 * a round.  So the XP is counted the other way round, by what cannot change
 * hands: each gem a player MAKES -- a combine, a Rare Gem's cut, the old cut
 * (shardcrack.js, amulet.js) -- is one owed (`lifeSkills.gemsUnpaid`, by
 * element), and setting a gem of that element pays the 400 while one is owed.
 * A gem bought, traded, won, picked up or taken out sets the same, and pays
 * nothing: every gem still pays its XP once, to the player who made it.  The
 * old pouch's polished gems were all made by their owner (it never traded),
 * so the move into the bag owes each of them, less the ones that came back
 * (amulet.js _gemsAdoptOnJoin).
 *
 * ONLY THE PALETTE (data.js WEAPON_GEMS): the eight lands' elements.  Dark and
 * Light are the realms', not built.
 *
 * DEPLOY ORDER (rule 19): the game sends weapon_gem only when the worker
 * advertises caps.weapongem -- an older worker has no case for the type and
 * would relay it.  KILL SWITCH (lower case, TRAPS §117): `weapongem: false` in
 * liveflags un-advertises it (the game falls back to its old browser-only
 * slot), refuses every ask ('off'), and puts the fight back on the claimed
 * element, as before this version.  Weapons that already hold a gem keep it.
 *
 * And the hold rule that comes with real gems: `monsterhold: false` (the
 * movement half lives in elemental.js; `_monsterHoldOff` is read once a tick
 * by _tickMonsters). */
import { WEAPON_GEMS, GEM_SET_XP, BLACKSMITH_TIERS, WOODWORKING_TIERS, BLACKSMITH_TIER_LABELS, WOODWORKING_TIER_LABELS, WEAPON_TYPE_LABELS } from './data.js';
import { ELEMENT_STATUS } from './elemental.js';
import { GEM_ELEMENTS, gemCount, gemTake } from './gems.js'; /* v2.3.3515: gems live in the bag */

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const WEAPON_GEM = Object.freeze({
  XP: GEM_SET_XP,
  /* v2.3.3515: the most gems of one element a player may be owed the XP for
     (`lifeSkills.gemsUnpaid`) -- far past any player's making; a bound on a
     stored number, healed to at the join */
  UNPAID_MAX: 100000,
  /* the second slot's Enchanting level (EnchantPanel's canAddSecond) */
  SECOND_SLOT_LVL: 20,
  SLOTS: Object.freeze(['weapon', 'rangedWeapon', 'staffWeapon']),
  /* the bases a VOLATILE second gem may go into (EnchantPanel's isFusionReady) */
  FUSION_BASES: Object.freeze(['worldbreaker', 'ww_worldbreaker']),
  /* the pairs that make a weapon volatile -- the Enchanter's own list, and the
     old server drop's (index.js before v2.3.3209).  A volatile weapon's
     collisions hit 1.3x (elemental.js resolveElementCollision).
       VOLATILE_PAIRS <-> src/data/weaponGems.js (mirror-audit) */
  VOLATILE_PAIRS: Object.freeze([
    ['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'],
    ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame'],
  ].map((p) => Object.freeze(p))),
});

/* The gem slots a weapon has: its forge tier's `slots` (data.js), by its
   `gearBase` -- 'ww_<wood>' the Woodworker's table, any other the
   Blacksmith's.  A weapon with no known base (a drop) has one.  The game's
   own count gave such a weapon TWO (EnchantPanel's `wpn ? 2 : 0`, for the
   random drops removed in v2.3.3209); one is what every weapon in the
   game's reach has.  Own-key reads: a gearBase of '__proto__' is a plain
   one-slot weapon (TRAPS #6). */
export function weaponGemSlots(w) {
  if (!w || typeof w !== 'object') return 0;
  const base = typeof w.gearBase === 'string' ? w.gearBase : '';
  const ww = base.indexOf('ww_') === 0;
  const key = ww ? base.slice(3) : base;
  const table = ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
  const t = key && hasOwn(table, key) ? table[key] : null;
  const n = t && Number.isInteger(t.slots) ? t.slots : 1;
  return Math.max(1, Math.min(2, n));
}

export function isVolatilePair(a, b) {
  return WEAPON_GEM.VOLATILE_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* The name a weapon takes with its gems: "<metal> <Element> <type>" -- the
   shield's rule ("<metal> <Element> Shield", shieldgem.js) -- the second gem
   joined on as the game always joined it ("Flamefrost").  No metal for a
   weapon with no known base: "Flame Sword", the old drop's own name.  The
   plain name it goes back to is amulet.js _stripGems's. */
export function weaponGemName(w) {
  const base = w && typeof w.gearBase === 'string' ? w.gearBase : '';
  const ww = base.indexOf('ww_') === 0;
  const key = ww ? base.slice(3) : base;
  const labels = ww ? WOODWORKING_TIER_LABELS : BLACKSMITH_TIER_LABELS;
  const metal = key && hasOwn(labels, key) ? labels[key] : null;
  const type = w && typeof w.type === 'string' && hasOwn(WEAPON_TYPE_LABELS, w.type) ? WEAPON_TYPE_LABELS[w.type] : 'Weapon';
  const e1 = w && typeof w.element1 === 'string' ? w.element1 : '';
  const e2 = w && typeof w.element2 === 'string' ? w.element2 : '';
  const el = e1 ? cap(e1) + (e2 ? e2.toLowerCase() : '') : '';
  return [metal, el, type].filter(Boolean).join(' ');
}

/* The element a hit with this weapon carries, from the worker's own copy: the
   first gem, or on a special the second gem when there is one (the
   Enchanter's "Slot 2" -- the special's element, as the game has always
   coloured it).  An own key of the status table, or none. */
export function weaponHitElement(w, special) {
  if (!w || typeof w !== 'object') return null;
  const e = (special && typeof w.element2 === 'string' && w.element2) ? w.element2 : w.element1;
  return (typeof e === 'string' && hasOwn(ELEMENT_STATUS, e)) ? e : null;
}

const SLOT_OF_KIND = Object.freeze({ melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' });

export const weaponGemMethods = {
  _weaponGemOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && hasOwn(f, 'weapongem') && !f.weapongem);
  },

  /* the hold rule's switch (elemental.js elementMoveMult) -- read once a tick */
  _monsterHoldOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && hasOwn(f, 'monsterhold') && !f.monsterhold);
  },

  /* The element a hit by this player carries: from the worker's copy of the
     weapon the hit was made with ('melee' | 'ranged' | 'staff', the slot the
     caller already resolved), {element, w}, or null.  With the switch off,
     null: the caller reads the claim, as before v2.3.3513. */
  _weaponHitElement(ps, kind, special) {
    if (!ps || this._weaponGemOff()) return null;
    const slot = hasOwn(SLOT_OF_KIND, kind) ? SLOT_OF_KIND[kind] : 'weapon';
    const w = ps[slot];
    const element = weaponHitElement(w, special);
    return element ? { element, w } : null;
  },

  _weaponGemSend(pid, payload, withState) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'weapon_gem_result', payload })); } catch (e) { /* the act is saved; the state carries it */ }
    if (withState) this._sendPlayerState(ws, pid);
  },

  /* ═══ THE GEMS A PLAYER MADE (see "THE XP, ONCE A GEM" above) ═══
     `lifeSkills.gemsUnpaid` -- by element, the gems this player made whose
     Enchanting XP is still to come.  Persisted with lifeSkills, healed at the
     join (amulet.js _gemsAdoptOnJoin).  Always an object once made: the page
     merges lifeSkills a key at a time and never drops one the worker left
     out, so an emptied map is sent as {} (wsClient). */
  _gemsUnpaidOf(ps, create) {
    if (!ps) return null;
    if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') {
      if (!create) return null;
      ps.lifeSkills = {};
    }
    const u = ps.lifeSkills.gemsUnpaid;
    if (u && typeof u === 'object' && !Array.isArray(u)) return u;
    if (!create) return null;
    ps.lifeSkills.gemsUnpaid = {};
    return ps.lifeSkills.gemsUnpaid;
  },

  /* `n` gems of `element` were just MADE by this player (a combine, a Rare
     Gem's cut, the old cut): each one's set will pay its XP */
  _gemMade(ps, element, n = 1) {
    const add = Math.floor(Number(n) || 0);
    if (add < 1 || !GEM_ELEMENTS.has(element)) return;
    const u = this._gemsUnpaidOf(ps, true);
    u[element] = Math.min(WEAPON_GEM.UNPAID_MAX, Math.floor(Number(hasOwn(u, element) ? u[element] : 0) || 0) + add);
  },

  /* A gem of `element` was just set.  Pays GEM_SET_XP Enchanting XP while
     the player has made one of that element not yet paid for -- and counts it
     paid -- else nothing (a gem bought, traded, won or taken out). */
  _gemSetXp(ps, element) {
    const u = this._gemsUnpaidOf(ps, false);
    const owed = u && hasOwn(u, element) ? Math.floor(Number(u[element]) || 0) : 0;
    if (owed < 1) return { xp: 0, leveled: false, newLevel: null, fromLevel: null };
    if (owed - 1 > 0) u[element] = owed - 1; else delete u[element];
    const sk = ps.lifeSkills && ps.lifeSkills.enchanting;
    const fromLevel = sk && typeof sk === 'object' ? (Number(sk.level) || 1) : 1;
    const r = this._addLifeSkillXp(ps, 'enchanting', WEAPON_GEM.XP);
    return { xp: WEAPON_GEM.XP, leveled: !!(r && r.leveled), newLevel: r ? r.newLevel : null, fromLevel };
  },

  /* weapon_gem { slot, gem }.  Returns the answer sent (the tests), or null
     when dropped unanswered (no player). */
  _handleWeaponGem(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return null;
    const p = payload && typeof payload === 'object' ? payload : Object.create(null);
    const slot = typeof p.slot === 'string' && WEAPON_GEM.SLOTS.indexOf(p.slot) >= 0 ? p.slot : null;
    const gem = typeof p.gem === 'string' && WEAPON_GEMS.has(p.gem) ? p.gem : null;
    const refuse = (reason) => {
      const r = { ok: false, slot, gem, reason };
      this._weaponGemSend(pid, r, false);
      return r;
    };
    if (this._weaponGemOff()) return refuse('off');
    if (ps.dying || ps.dead || ps.disconnected) return refuse('down');
    if (!slot) return refuse('bad_slot');
    if (!gem) return refuse('bad_gem');
    /* the amulet's and the shield's gate: a gem changes gear, and a guard's
       lock holds gear (threat.js; it tells the game itself) */
    if (this._threatGearLocked(pid, ps)) return refuse('locked');
    const w = ps[slot];
    if (!w || typeof w !== 'object' || (typeof this._isGearNotWeapon === 'function' && this._isGearNotWeapon(w))) return refuse('no_weapon');
    const slots = weaponGemSlots(w);
    const e1 = typeof w.element1 === 'string' && w.element1 ? w.element1 : null;
    const e2 = typeof w.element2 === 'string' && w.element2 ? w.element2 : null;
    /* a full slot is not overwritten (decision 10): Take out first */
    if ((e1 ? 1 : 0) + (e2 ? 1 : 0) >= slots || (e1 && e2)) return refuse('full');
    if (e1) {
      /* the second slot: Enchanting 20, a gem other than the first, and a
         volatile pair only in a base made for it -- the Enchanter's rules */
      const ench = ps.lifeSkills && ps.lifeSkills.enchanting;
      const lvl = ench && typeof ench === 'object' ? (Number(ench.level) || 1) : 1;
      if (lvl < WEAPON_GEM.SECOND_SLOT_LVL) return refuse('level');
      if (gem === e1) return refuse('same');
      if (isVolatilePair(e1, gem) && WEAPON_GEM.FUSION_BASES.indexOf(w.gearBase) < 0) return refuse('volatile');
    }
    /* v2.3.3515: an elemental gem from the bag (gems.js: the bag, then any
       the old pouch still holds) */
    const have = gemCount(ps, gem, false);
    if (have < 1) return refuse('no_gem');

    gemTake(ps, gem, false, 1);
    if (!e1) {
      w.element1 = gem;
      w.tier = 'elemental';
    } else {
      w.element2 = gem;
      w.tier = 'fusion';
    }
    w.isVolatile = !!(w.element1 && w.element2 && isVolatilePair(w.element1, w.element2));
    w.name = weaponGemName(w);
    const x = this._gemSetXp(ps, gem);
    this._saveRpg(pid, ps);
    const r = {
      ok: true, slot, gem, name: w.name,
      element1: w.element1 || null, element2: w.element2 || null,
      xp: x.xp, leveled: x.leveled, newLevel: x.newLevel, fromLevel: x.fromLevel,
    };
    this._weaponGemSend(pid, r, true);
    return r;
  },
};
