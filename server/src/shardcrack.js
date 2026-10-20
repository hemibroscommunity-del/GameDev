/* ═══ v2.3.3516: SHARDS INTO RAW GEMS INTO ELEMENTAL GEMS ═══
 *
 * The owner, 2026-10-19: "a fun method would be for the shards to have a
 * certain percent chance of containing that elements raw gem.  Like maybe a
 * 10% chance.  Then after collecting a certain number of raw gems they can be
 * combined into an elemental gem."  And on docs/GEM-PLAN.md, 2026-10-20: "All
 * of that sounds good" -- its Phase 2, every recommended answer:
 *
 *   decision 1  raw gems come only from cracking shards (they stop dropping
 *               off monsters; the ones players hold still count);
 *   decision 2  1 in 10, rising with Gem Cutting: 12% from 15, 15% from 35,
 *               20% from 60 (GEM_CUT_TIERS' own four steps);
 *   decision 3  three raw gems make one elemental gem;
 *   decision 4  a combine never fails: the luck is all in the crack;
 *   decision 6  a Rare Gem cuts into any of the eight elemental gems;
 *   decision 7  a Flora gem, for weapons;
 *   decision 11 40 Gem Cutting XP a crack (found or not), 200 a combine.
 *
 * THE CRACK.  shard_crack { land, count }  (count 1..50: one message for
 * "Crack all").  Takes up to `count` of that land's shards (`shard_<land>`,
 * never more than the bag holds), rolls each 1..100 against the chance for the
 * player's own Gem Cutting level, puts what was found in the bag as raw gems
 * (gems.js), pays the XP for every crack, saves once, and answers
 *     shard_crack_result { ok: true, land, element, chance, rolls, found,
 *                          left, xp, leveled, newLevel, fromLevel }
 *     shard_crack_result { ok: false, land, reason }
 * followed by the player_state.  `rolls` is every roll in order, so the phone
 * plays the reveal from the worker's own numbers; a roll at or under `chance`
 * held a gem.
 *
 * THE COMBINE.  gem_combine { element }  -- three raw gems of it into one
 * elemental gem; gem_combine { element, rare: true } -- one Rare Gem
 * (`rare_gem`) into an elemental gem of the eight lands' elements.  Pays the
 * XP, saves, answers gem_combine_result { ok, element, rare, made, xp, ... }
 * or { ok: false, element, reason, need, have }, then the player_state.
 *
 * THE OLD CUT (amulet.js _handleGemCut: one raw gem into one polished gem at
 * 60-98%) is refused while this is on -- three raw gems are the price now, and
 * a page from before this version would otherwise make a gem from one.
 *
 * WHAT IS NOT HERE.  The shard drops are unchanged (index.js, gathering.js).
 * The kill roll's raw gem (killroll.js `rawgem`) is gone while this is on
 * (_killRollCan says no raw gem; the codex's page drops its row with
 * caps.shardcrack).
 *
 * DEPLOY ORDER (rule 19): the phone shows the crack and the combine only
 * against a worker that advertises caps.shardcrack.  KILL SWITCH (lower case,
 * TRAPS §117): `shardcrack: false` in liveflags un-advertises it, refuses every
 * crack and combine ('off'), brings back the old cut, and puts the raw gem back
 * on the kill roll.  Gems stay in the bag either way (gems.js).
 *
 * Nothing new is persisted: shards, gems and XP are the rpg record's own
 * `inventory` and `lifeSkills`, written once an act by `_saveRpg` before the
 * answer (handoff rule 10). */
import { WEAPON_GEMS } from './data.js';
import { GEM_ELEMENTS, gemCount, gemTake, gemGive } from './gems.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const SHARD_CRACK = Object.freeze({
  /* each land's shard (`shard_<land>`) and the element of the raw gem it may
     hold -- the land's element (data.js ZONES, the Wheel's lands' homes).
     The meadow's "Verdant Shard" has no element, so it holds none.
       LANDS <-> src/data/shards.js SHARD_GEM_ELEMENT (mirror-audit) */
  LANDS: Object.freeze({
    frost: 'frost', ember: 'flame', sky: 'wind', hollows: 'stone',
    thunder: 'storm', tidal: 'water', mist: 'venom', verdant: 'flora',
  }),
  /* the chance a shard holds its raw gem, in percent, by Gem Cutting level:
     the cut's own four steps (data.js GEM_CUT_TIERS: 1, 15, 35, 60) */
  CHANCE: Object.freeze([
    Object.freeze({ minLvl: 1, pct: 10 }),
    Object.freeze({ minLvl: 15, pct: 12 }),
    Object.freeze({ minLvl: 35, pct: 15 }),
    Object.freeze({ minLvl: 60, pct: 20 }),
  ]),
  SIDES: 100,
  MAX_PER_ASK: 50,
  RAW_PER_GEM: 3,
  CRACK_XP: 40,
  COMBINE_XP: 200,
});

/** The chance (percent) a shard holds a gem at Gem Cutting `level`. */
export function shardCrackChance(level) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  let pct = SHARD_CRACK.CHANCE[0].pct;
  for (const step of SHARD_CRACK.CHANCE) if (lv >= step.minLvl) pct = step.pct;
  return pct;
}

const lifeLevel = (ps, skill) => {
  const s = ps && ps.lifeSkills && ps.lifeSkills[skill];
  return s && typeof s === 'object' ? Math.max(1, Math.floor(Number(s.level) || 1)) : 1;
};

export const shardCrackMethods = {
  _shardCrackOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'shardcrack') && !f.shardcrack);
  },

  _shardCrackSend(pid, type, payload, withState) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* saved; the state carries it */ }
    if (withState) this._sendPlayerState(ws, pid);
  },

  /* Gem Cutting XP, with what the phone needs to celebrate a level */
  _gemCuttingXp(ps, xp) {
    const fromLevel = lifeLevel(ps, 'gemCutting');
    const r = this._addLifeSkillXp(ps, 'gemCutting', xp);
    return { xp, leveled: !!(r && r.leveled), newLevel: r ? r.newLevel : fromLevel, fromLevel };
  },

  /* shard_crack { land, count }.  Returns the answer sent (the tests), or
     null when dropped unanswered (no player). */
  _handleShardCrack(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return null;
    const p = payload && typeof payload === 'object' ? payload : Object.create(null);
    const land = typeof p.land === 'string' && own(SHARD_CRACK.LANDS, p.land) ? p.land : null;
    const refuse = (reason) => {
      const r = { ok: false, land, reason };
      this._shardCrackSend(pid, 'shard_crack_result', r, false);
      return r;
    };
    if (this._shardCrackOff()) return refuse('off');
    if (ps.dying || ps.dead || ps.disconnected) return refuse('down');
    if (!land) return refuse('bad_land');
    const key = 'shard_' + land;
    const inv = ps.inventory && typeof ps.inventory === 'object' ? ps.inventory : null;
    const have = inv && own(inv, key) ? Math.max(0, Math.floor(Number(inv[key]) || 0)) : 0;
    if (have < 1) return refuse('short');
    const want = Math.max(1, Math.min(SHARD_CRACK.MAX_PER_ASK, Math.floor(Number(p.count) || 1)));
    const n = Math.min(want, have);
    const element = SHARD_CRACK.LANDS[land];
    const chance = shardCrackChance(lifeLevel(ps, 'gemCutting'));
    const rolls = [];
    let found = 0;
    for (let i = 0; i < n; i++) {
      const roll = 1 + Math.floor(Math.random() * SHARD_CRACK.SIDES);
      rolls.push(roll);
      if (roll <= chance) found++;
    }
    if (have - n > 0) inv[key] = have - n; else delete inv[key];
    if (found) gemGive(ps, element, true, found);
    const x = this._gemCuttingXp(ps, SHARD_CRACK.CRACK_XP * n);
    this._saveRpg(pid, ps);
    const r = { ok: true, land, element, chance, rolls, found, left: have - n, ...x };
    this._shardCrackSend(pid, 'shard_crack_result', r, true);
    return r;
  },

  /* gem_combine { element } | { element, rare: true }. */
  _handleGemCombine(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return null;
    const p = payload && typeof payload === 'object' ? payload : Object.create(null);
    const rare = p.rare === true;
    const element = typeof p.element === 'string' && (rare ? WEAPON_GEMS.has(p.element) : GEM_ELEMENTS.has(p.element)) ? p.element : null;
    const refuse = (reason, extra) => {
      const r = { ok: false, element, rare, reason, ...(extra || null) };
      this._shardCrackSend(pid, 'gem_combine_result', r, false);
      return r;
    };
    if (this._shardCrackOff()) return refuse('off');
    if (ps.dying || ps.dead || ps.disconnected) return refuse('down');
    if (!element) return refuse('bad_gem');
    if (rare) {
      const inv = ps.inventory && typeof ps.inventory === 'object' ? ps.inventory : null;
      const have = inv && own(inv, 'rare_gem') ? Math.max(0, Math.floor(Number(inv.rare_gem) || 0)) : 0;
      if (have < 1) return refuse('no_rare', { need: 1, have: 0 });
      if (have - 1 > 0) inv.rare_gem = have - 1; else delete inv.rare_gem;
    } else {
      const have = gemCount(ps, element, true);
      if (have < SHARD_CRACK.RAW_PER_GEM) return refuse('short', { need: SHARD_CRACK.RAW_PER_GEM, have });
      gemTake(ps, element, true, SHARD_CRACK.RAW_PER_GEM);
    }
    gemGive(ps, element, false, 1);
    /* a gem this player made: its set pays the Enchanting XP (weapongem.js
       "THE XP, ONCE A GEM") */
    this._gemMade(ps, element, 1);
    const x = this._gemCuttingXp(ps, SHARD_CRACK.COMBINE_XP);
    this._saveRpg(pid, ps);
    const r = { ok: true, element, rare, made: 'gem_' + element, ...x };
    this._shardCrackSend(pid, 'gem_combine_result', r, true);
    return r;
  },
};
