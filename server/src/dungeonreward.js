/* ═══ v2.3.3563: THE BOSS'S CHEST, AND THE CLEAR'S XP INTO THE WEAPONS YOU USED ═══
 *
 * The owner's "Yes" to the dungeons' recommendation "A reward worth the trip"
 * (docs/specs/dungeons-today.md): "the boss drops a chest with sure rewards,
 * for example extra gold, the land's shards and a chance at its gem.  The
 * clear's XP would go into the weapon you used."
 *
 * THE CHEST.  Every player standing in a world dungeon when it clears (zone
 * presence, as the clear has always paid: dungeon.js _dungeonComplete) gets
 * the boss's chest, paid in the clear's own synchronous run and its save:
 *   - GOLD_PER_LEVEL gold for each level of the run (20: 60 at a level-3 Goo
 *     Grotto, 560 at 28, 860 at 43);
 *   - SHARDS of the land's own shard (`shard_<land>`, 3).  They are the one
 *     road to its raw gems: the owner's gem plan keeps raw gems for cracking
 *     shards (docs/GEM-PLAN.md, decision 1: "Raw gems coming only from shards
 *     keeps them as the one road"), so the chest's "chance at its gem" is
 *   - a RARE GEM one time in RARE_IN (10).  It is the drop any monster gives
 *     1 time in 200 (data.js RARE_GEM_MONSTER_DROP), and the Gem Works cuts
 *     it into the land's gem or any other.
 * A Workshop run (no `home`) has no chest: its monsters, their number and
 * their level are the player's to choose.
 *
 * THE CLEAR'S XP.  It went into the old single counter no skill reads
 * (grids.js _addCombatXp; v2.3.3543 took the number out of the words).  Now
 * it is paid FLAT into the weapon skills the player fought with in this run,
 * by the share of fight XP each earned there.  prog3.js _prog3AwardXp notes
 * that share while you stand in a dungeon (`_dungeonNoteXp`: ps._dgXp, in
 * memory, never saved).
 *   - A player who earned none in the run (a party member who only watched)
 *     gets it in the weapon in their hand (ps.activeSlot).
 *   - It fades as fight XP does (xpdecay.js: from five levels below the run's
 *     level), so "it should always be most efficient ... within your current
 *     level" still holds.
 *   - A skill at its cap takes none.
 *   - The old counter still gets the number, as before.
 *   - Only a world dungeon's: a Workshop run's clear XP would be a farm (the
 *     XP is per wave, not per level, and its monsters are the player's choice).
 *
 * THE WIRE.  dungeon_complete (already PRIVILEGED) carries `chest: {gold,
 * items: [{key, n}]}` and `skillXp: {sword|bow|staff: n}`.  An older phone
 * ignores both, and the echo of coins and the bag brings the truth anyway
 * (handoff rule 20).  No new event type, no caps flag, no stored key.
 *
 * Kill switches (lower case, TRAPS §117): `bosschest: false` (no chest) and
 * `clearxp: false` (the clear's XP to the old counter only).
 */
import { ZONES, RARE_GEM_KEY } from './data.js';
import { PROG3 } from './prog3.js';

export const BOSS_CHEST = {
  GOLD_PER_LEVEL: 20,
  SHARDS: 3,
  /* a Rare Gem one time in this many */
  RARE_IN: 10,
};

/* the weapon in a hand, as the skill it trains */
const SLOT_SKILL = Object.freeze({ melee: 'sword', ranged: 'bow', staff: 'staff' });
export const CLEAR_SKILLS = Object.freeze(['sword', 'bow', 'staff']);
const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* `xp` split over the skills by `shares` ({skill: weight}): whole numbers that
   add up to `xp`, the biggest share taking what rounding leaves.  A skill
   with no weight gets nothing. */
export function splitClearXp(xp, shares) {
  const out = {};
  const n = Math.max(0, Math.floor(Number(xp) || 0));
  const w = (k) => Math.max(0, Number(shares && own(shares, k) ? shares[k] : 0) || 0);
  const total = CLEAR_SKILLS.reduce((s, k) => s + w(k), 0);
  if (!n || !(total > 0)) return out;
  let given = 0, top = null;
  for (const k of CLEAR_SKILLS) {
    if (!w(k)) continue;
    out[k] = Math.floor(n * w(k) / total);
    given += out[k];
    if (!top || w(k) > w(top)) top = k;
  }
  if (top && given < n) out[top] += n - given;
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

export const dungeonRewardMethods = {
  /* KILL SWITCHES: `bosschest: false`, `clearxp: false` */
  _bossChestOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'bosschest') && !f.bosschest);
  },
  _clearXpOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'clearxp') && !f.clearxp);
  },

  /* prog3.js _prog3AwardXp: fight XP earned while standing in a dungeon, kept
     by weapon for the run's clear.  A new run is a new zone, so a record from
     an older one is simply started again. */
  _dungeonNoteXp(ps, cat, amount) {
    if (!ps || typeof ps.z !== 'string' || !CLEAR_SKILLS.includes(cat) || !(amount > 0)) return;
    let r = ps._dgXp;
    if (!r || r.zone !== ps.z) r = ps._dgXp = { zone: ps.z, sword: 0, bow: 0, staff: 0 };
    r[cat] += amount;
  },

  /* The chest's one random number (a test sets it). */
  _bossChestRoll() {
    return Math.random();
  },

  /* Called by dungeon.js _dungeonComplete for each player it pays, BEFORE its
     save: pays the chest and the clear's XP.  Returns what the clear's event
     says: { chest?, skillXp? }. */
  _dungeonReward(pid, ps, inst, xp) {
    const out = {};
    const cfg = inst && inst.cfg;
    if (!ps || !cfg || !cfg.home) return out;
    if (cfg.hasBoss && !this._bossChestOff()) {
      const lvl = Math.max(1, Math.floor(Number(cfg.monsterLevel) || 1));
      const gold = BOSS_CHEST.GOLD_PER_LEVEL * lvl;
      ps.coins = (ps.coins || 0) + gold;
      if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
      const inv = ps.inventory;
      const items = [];
      const add = (key, n) => {
        inv[key] = Math.max(0, Math.floor(Number(own(inv, key) ? inv[key] : 0) || 0)) + n;
        items.push({ key, n });
      };
      /* only a land that HAS a shard (index.js _rollShardForKill's rule) */
      if (own(ZONES, cfg.home) && BOSS_CHEST.SHARDS > 0) add('shard_' + cfg.home, BOSS_CHEST.SHARDS);
      if (this._bossChestRoll() < 1 / BOSS_CHEST.RARE_IN) add(RARE_GEM_KEY, 1);
      out.chest = { gold, items };
    }
    const sk = ps.prog3 && ps.prog3.sk;
    if (xp > 0 && sk && !this._clearXpOff()) {
      const open = (k) => own(sk, k) && !!sk[k] && sk[k].level < PROG3.LEVEL_CAP;
      const r = ps._dgXp && ps._dgXp.zone === inst.zone ? ps._dgXp : null;
      const shares = {};
      if (r) for (const k of CLEAR_SKILLS) if (open(k) && r[k] > 0) shares[k] = r[k];
      if (!Object.keys(shares).length) {
        const held = own(SLOT_SKILL, ps.activeSlot) ? SLOT_SKILL[ps.activeSlot] : 'sword';
        if (open(held)) shares[held] = 1;
      }
      const lvl = Math.max(1, Math.floor(Number(cfg.monsterLevel) || 1));
      const paid = {};
      const split = splitClearXp(xp, shares);
      for (const k of Object.keys(split)) {
        const fade = typeof this._combatXpDecay === 'function' ? this._combatXpDecay(ps, k, lvl) : 1;
        const n = Math.round(split[k] * fade);
        if (n > 0) {
          this._prog3AwardXp(pid, ps, k, n, { flat: true });
          paid[k] = n;
        }
      }
      if (Object.keys(paid).length) out.skillXp = paid;
    }
    return out;
  },
};
