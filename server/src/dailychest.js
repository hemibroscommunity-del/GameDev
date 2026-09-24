/* ═══ v2.3.2820: THE DAILY CHEST ═══
 *
 * Owner, 2026-09-24: "I'd rather have a loot box that has a high chance of
 * coins but a small chance of other items like 10 cooked fish or rare gems or
 * pieces of armor that have a chance of rolling for rarity etc.  Instead of
 * daily coin reward."
 *
 * THE SHAPE.  The daily login consumer (cadence.js) used to credit gold; it
 * now credits ONE `daily_chest` into the bag through the same `_creditPlayer`
 * funnel (opId `daily:<pid>:<day>` -- the idempotency wall is unchanged, so a
 * day still pays exactly once).  The chest is opened from the bag
 * (`chest_open`), and ONLY here is the prize rolled: the worker takes the
 * chest out of ITS copy of the bag, rolls, credits, saves, and tells the
 * client what came out (`chest_opened`).  The client never decrements or
 * grants anything itself -- the firemaking incident (cooking.js) is why that
 * rule exists, and the golden ticket's redeem (eventcapes.js) is the shape
 * this copies.
 *
 * THE ODDS (CHEST.PRIZES).  Coins most of the time, and never LESS than the
 * old daily gold: the coin prize is the old formula (25 + 10 per streak day,
 * capped at day 7) times a 1.0-1.6 roll, so the streak still pays and a chest
 * that "only" gave coins is still at least what the day used to give.  The
 * rest: 10 cooked fish, a rare gem, or a piece of copper/iron armour whose
 * QUALITY is rolled by the same `_rollWeaponQuality` the monster drops use
 * (normal / rare / elite / godly mean the same thing everywhere).  Armour is
 * minted into the provenance ledger (`_gearProvRecord`, src 'chest') and
 * reaches the bag the way a dropped piece does -- the client's loot-credit
 * adoption -- because armour stashes are the client's (quests.js v2.3.1695).
 *
 * DEPLOY ORDER (rule 19).  caps.dailyChest gates the client's Open button.
 * KILL SWITCH: `dailyChest: false` in liveflags un-advertises the cap AND
 * sends the day's reward back to plain gold (cadence.js), with no deploy.
 * A chest already in a bag stays openable only while the cap is up; with the
 * switch off it waits, it is never destroyed. */
import { RARE_GEM_KEY } from './data.js';

export const CHEST = {
  KEY: 'daily_chest',
  /* Weights out of 100. */
  PRIZES: [
    { id: 'coins', weight: 78 },
    { id: 'fish', weight: 8, invKey: 'cooked_fish_minnow', count: 10 },
    { id: 'gem', weight: 8, invKey: RARE_GEM_KEY, count: 1 },
    { id: 'armor', weight: 6 },
  ],
  COINS_BASE: 25,          /* = CADENCE.DAILY_BASE_GOLD -- the old daily floor */
  COINS_PER_STREAK: 10,    /* = CADENCE.DAILY_STREAK_GOLD */
  STREAK_CAP: 7,           /* = CADENCE.DAILY_STREAK_CAP */
  COINS_ROLL_MAX: 1.6,     /* coins = old daily gold x [1.0, 1.6] */
  /* The armour a chest can hold: the two metals that have art and a place on
     the ladder today (gearVariants.js), copper far more often than iron. */
  ARMOR: [
    { weight: 35, slot: 'armor',     name: 'Copper Torso',   mat: 'copper', tierMult: 1.0 },
    { weight: 35, slot: 'legsArmor', name: 'Copper Greaves', mat: 'copper', tierMult: 1.0 },
    { weight: 15, slot: 'armor',     name: 'Iron Torso',     mat: 'iron',   tierMult: 2.0 },
    { weight: 15, slot: 'legsArmor', name: 'Iron Greaves',   mat: 'iron',   tierMult: 2.0 },
  ],
};

function pickWeighted(list, r) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let x = r * total;
  for (const e of list) { x -= e.weight; if (x < 0) return e; }
  return list[list.length - 1];
}

export const dailyChestMethods = {
  /* The kill switch, read the storeGear way (storegear.js _stGearOff). */
  _chestOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'dailyChest') && !f.dailyChest);
  },

  /* Injectable for tests; Math.random in the game. */
  _chestRand() { return Math.random(); },

  /* Roll one chest for a player on login streak `streak`.  Pure apart from the
     quality roll; returns the prize record the handler applies and announces. */
  _chestRoll(streak) {
    const p = pickWeighted(CHEST.PRIZES, this._chestRand());
    if (p.id === 'coins') {
      const s = Math.max(1, Math.min(CHEST.STREAK_CAP, Math.floor(Number(streak) || 1)));
      const base = CHEST.COINS_BASE + CHEST.COINS_PER_STREAK * (s - 1);
      const coins = Math.round(base * (1 + (CHEST.COINS_ROLL_MAX - 1) * this._chestRand()));
      return { kind: 'coins', coins };
    }
    if (p.id === 'fish' || p.id === 'gem') return { kind: p.id, invKey: p.invKey, count: p.count };
    const a = pickWeighted(CHEST.ARMOR, this._chestRand());
    return {
      kind: 'armor',
      piece: { name: a.name, mat: a.mat, slot: a.slot, tierMult: a.tierMult, quality: this._rollWeaponQuality() },
    };
  },

  async _handleChestOpen(session, payload) {
    if (!session || !session.id) return;
    const { invKey, opId } = payload || {};
    if (invKey !== CHEST.KEY) return;                     /* exact match: '__proto__' never passes */
    if (this._chestOff()) return;                          /* switched off: the chest waits */
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    if (opId && typeof opId === 'string' && await this._opSeen('chestop:' + opId)) return;
    if (!ps.inventory || (ps.inventory[CHEST.KEY] || 0) <= 0) return;   /* ownership */

    let streak = 1;
    try {
      const rec = await this._cadenceGet('login', session.id);
      streak = (rec && rec.streak) || 1;
    } catch (e) { /* the floor streak is fine */ }
    if (!ps.inventory || (ps.inventory[CHEST.KEY] || 0) <= 0) return;   /* re-check after the await */

    ps.inventory[CHEST.KEY] -= 1;
    if (ps.inventory[CHEST.KEY] <= 0) delete ps.inventory[CHEST.KEY];

    const prize = this._chestRoll(streak);
    if (prize.kind === 'coins') {
      ps.coins = (ps.coins || 0) + prize.coins;
    } else if (prize.kind === 'fish' || prize.kind === 'gem') {
      ps.inventory[prize.invKey] = (Math.floor(Number(ps.inventory[prize.invKey]) || 0)) + prize.count;
    } else if (prize.kind === 'armor') {
      /* Minted into the ledger before it leaves, exactly as a picked-up drop
         is (index.js loot pickup, src 'drop'). */
      prize.piece = this._gearProvRecord(session.id, prize.piece.slot, { ...prize.piece }, 'chest');
    }
    if (opId && typeof opId === 'string') await this._opStamp('chestop:' + opId);
    this._saveRpg(session.id, ps);

    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'chest_opened', payload: { prize, streak } })); } catch (e) { /* the credit is saved */ }
      this._sendPlayerState(ws, session.id);
    }
    return prize;
  },
};
