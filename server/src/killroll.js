/* ═══ v2.3.3209: ONE ROLL A KILL -- EACH DROP OWNS ITS OWN NUMBERS ═══
 *
 * The owner, on the monster codex's Roll column ("1–1,000 (10%)", "1–500
 * (5%)", ... each drop on its own 1-to-10,000 die): "Shouldn't these numbers
 * not overlap each other? Getting a roll of 1 implies you'd get all the loot
 * with 1, but it's really just the gold nugget. I think these should be number
 * ranges. That way a player hunting for something can also be looking for a
 * roll number within that range".
 *
 * So a kill rolls ONE number, 1 to SIDES, and every drop that is not on every
 * kill OWNS a run of those numbers: its chance x SIDES of them, laid from 1 up
 * in ORDER, the rarest first (the owner, earlier: "The rarest drop in the
 * table is the lowest number beginning at 1").  A frost snowman's:
 *     1              Gold Nugget        1 in 10,000
 *     2–21           Iron Great Sword   1 in 500
 *     22–41          Iron Greaves       1 in 500
 *     42–61          Iron Torso         1 in 500
 *     62–111         Rare Gem           1 in 200
 *     112–611        Raw Frost Gem      1 in 20
 *     612–1,611      Frost Shard        1 in 10
 *     1,612–10,000   nothing more (its gold and remnants drop on every kill)
 * The three 1-in-500s are laid in the reverse of the codex's rows, so its
 * table, most common first, reads straight down from 612–1,611 to 1.  A drop
 * a monster cannot give has no numbers -- the blue slime's land has no gem the
 * Gem Cutter takes, so its shard is 112–1,111 -- and every number of a
 * monster's table is one drop's, or no drop's.
 *
 * WHAT CHANGED, AND WHAT DID NOT.  Each drop's chance is exactly what it was:
 * its numbers over SIDES (mirror-audit holds every chance to a whole number of
 * them), so a hundred thousand kills drop as many of each as before.  What
 * changed is that a kill drops at most ONE of them -- each had its own roll,
 * and about one kill in 170 dropped two.
 *
 * WHO GETS IT is as before: the pile's drops (the shard, the rare gem, the
 * iron pieces) go to whoever picks the pile up, the raw gem and the nugget to
 * the killing blow (combat.js _resolveMonsterKill).  A Workshop run's flat
 * drops (dungeon.js _workshopDropScale) keep their numbers and drop on them at
 * the run's share -- one more draw, only when that share is under 1 -- so the
 * chance there is what it was too.  `disable_weapon_drops` leaves the iron
 * blade's numbers where they are, dropping nothing: every other drop keeps the
 * numbers the codex shows.
 *
 * THE WIRE: combat_credit `roll` (1 to SIDES) to everyone the kill credits,
 * and `rh`, the codex's row id of the drop it landed on, when that drop is
 * theirs to have -- a pile's drop for whoever may pick the pile up, the
 * killing blow's for the killer.  The game shows it over the monster
 * (src/game/killRoll.js).  caps.killroll; `killroll: false` in liveflags is
 * the kill switch: every drop on its own roll again, nothing sent.
 * Spec: docs/specs/monster-codex.md "One roll a kill".  Suite: drops.test.mjs
 * §9, and mirror-audit holds the codex's table to killRollLayout. */
import {
  GOLD_NUGGET_MONSTER_DROP, GEM_RAW_MONSTER_DROP, RARE_GEM_MONSTER_DROP,
  MONSTER_ARMOR_DROPS, MONSTER_IRON_WEAPON_DROP, SHARD_MONSTER_DROP,
  AMULET_GEMS, ZONES,
} from './data.js';

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const armorChance = (slot) => {
  const d = MONSTER_ARMOR_DROPS.find((a) => a && a.slot === slot);
  return d ? d.chance : 0;
};

export const KILL_ROLL = Object.freeze({
  SIDES: 10000,
  /* from 1 up: the codex's row ids (src/data/codexDrops.js) */
  ORDER: Object.freeze(['nugget', 'irongreatsword', 'irongreaves', 'irontorso', 'raregem', 'rawgem', 'shard']),
  /* the killing blow's, into the bag; the rest are the pile's */
  KILLER: Object.freeze(['nugget', 'rawgem']),
  /* the drops a monster may not have: everything else, every monster has */
  MAYBE: Object.freeze(['rawgem', 'shard']),
  /* the armour pieces' slots (MONSTER_ARMOR_DROPS) */
  ARMOR_SLOT: Object.freeze({ irontorso: 'armor', irongreaves: 'legsArmor' }),
});

/* every drop's chance, the very constants its old roll read */
export const KILL_ROLL_CHANCES = Object.freeze({
  nugget: GOLD_NUGGET_MONSTER_DROP,
  irongreatsword: MONSTER_IRON_WEAPON_DROP.chance,
  irongreaves: armorChance('legsArmor'),
  irontorso: armorChance('armor'),
  raregem: RARE_GEM_MONSTER_DROP,
  rawgem: GEM_RAW_MONSTER_DROP,
  shard: SHARD_MONSTER_DROP,
});

/** A monster's numbers: [{ id, from, to }], from 1 up, none overlapping.
 *  `can` = { rawgem, shard }: whether this monster has them. */
export function killRollLayout(can) {
  const out = [];
  let at = 1;
  for (const id of KILL_ROLL.ORDER) {
    if (KILL_ROLL.MAYBE.includes(id) && !(can && can[id])) continue;
    const n = Math.round(KILL_ROLL_CHANCES[id] * KILL_ROLL.SIDES);
    if (!(n >= 1)) continue;
    out.push({ id, from: at, to: at + n - 1 });
    at += n;
  }
  return out;
}

/** The drop `roll` lands on, or null. */
export function killRollHit(layout, roll) {
  for (const r of layout || []) if (roll >= r.from && roll <= r.to) return r.id;
  return null;
}

export const killRollMethods = {
  _killRollOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'killroll') && !f.killroll);
  },

  /* What of the rolled drops this kill can give that not every kill can: its
     shard (the zone it pays out for has one: index.js _rollShardForKill's own
     test) and its raw gem (that zone's element is one the Gem Cutter takes:
     amulet.js _gemRawOnKill's). */
  _killRollCan(zone, m) {
    const rz = this._rewardZone ? this._rewardZone(zone, m) : zone;
    const cfg = typeof rz === 'string' && has(ZONES, rz) ? ZONES[rz] : null;
    const elem = (cfg && cfg.element) || null;
    /* v2.3.3516: no raw gem off a kill while shards are cracked for them
       (shardcrack.js; the gem plan's decision 1) -- its numbers go, and the
       shard's move down to where the raw gem's began (the codex's page drops
       the row with caps.shardcrack) */
    const crack = typeof this._shardCrackOff === 'function' && !this._shardCrackOff();
    return { shard: !!cfg, rawgem: !crack && !!elem && AMULET_GEMS.has(elem) };
  },

  /* THE KILL'S ROLL: { roll, hit, minted } -- `minted` set by whichever drop
     it landed on, once that drop is made (it may not be: no one to claim the
     pile, the iron blade's kill switch, a Workshop share).  Null with the kill
     switch thrown: every drop rolls on its own, as before. */
  _killRollFor(zone, m, killerId) {
    if (this._killRollOff()) return null;
    const layout = killRollLayout(this._killRollCan(zone, m));
    let roll = 1 + Math.floor(Math.random() * KILL_ROLL.SIDES);
    /* the test lever's roll for this killer's next kill (devtools /dev/killroll) */
    const forced = this._killRollForced instanceof Map && killerId ? this._killRollForced.get(killerId) : undefined;
    if (forced !== undefined) { this._killRollForced.delete(killerId); roll = forced; }
    if (!(roll >= 1)) roll = 1;
    if (roll > KILL_ROLL.SIDES) roll = KILL_ROLL.SIDES;
    return { roll, hit: killRollHit(layout, roll), minted: false };
  },

  /* Is the drop it landed on this player's to have?  Told as `rh` only then:
     the pile's to anyone the pile is for (the gold rule's 5%), the killing
     blow's to the killer. */
  _killRollTheirs(kr, pid, killerId, pileFor) {
    if (!kr || !kr.hit || !kr.minted) return false;
    if (KILL_ROLL.KILLER.includes(kr.hit)) return pid === killerId;
    return Array.isArray(pileFor) && pileFor.includes(pid);
  },

  /* ═══ THE TEST LEVER (devtools /dev/killroll) ═══
     A 1-in-10,000 is a long way to swing for: `next` is this player's next
     kill's roll, as its killing blow; `kill` (a live monster's id in their
     zone) kills it now, through the one kill there is. */
  _killRollDev(playerId, body) {
    const ps = this.playerState[playerId];
    if (!ps) return { ok: false, error: 'not online' };
    const b = body && typeof body === 'object' ? body : Object.create(null);   /* rule 4: never a plain {} */
    const out = { ok: true };
    if (b.next != null) {
      const n = Math.floor(Number(b.next));
      if (!(n >= 1 && n <= KILL_ROLL.SIDES)) return { ok: false, error: 'next: a roll of 1 to ' + KILL_ROLL.SIDES };
      if (!(this._killRollForced instanceof Map)) this._killRollForced = new Map();
      this._killRollForced.set(playerId, n);
      out.next = n;
    }
    if (typeof b.kill === 'string' && b.kill) {
      const m = (this.monsters[ps.z] || []).find((x) => x && x.id === b.kill);
      if (!m || !m.alive) return { ok: false, error: 'no such live monster in your zone' };
      out.layout = killRollLayout(this._killRollCan(ps.z, m));
      m.dmgByPlayer = Object.create(null);
      m.dmgByPlayer[playerId] = m.maxHp || 1;
      m.hp = 0;
      this._resolveMonsterKill(ps.z, m, playerId, ps, 'dev');
      out.killed = m.id;
    }
    return out;
  },
};
