/* ═══ v2.3.4384: A DEAD PLAYER'S BAG ON THE GROUND SURVIVES A RESTART ═══
 * (docs/specs/death-pile-saved.md)
 *
 * The state-machine sweep (2026-11-03, V22 S1-9): a death outside town lays
 * the bag on the ground as a pile kept only in memory (this.loot) for
 * DEATH_PILE_TOTAL_MS (2 minutes), and the death's save has already left the
 * items out of the record.  So a worker deploy or a restart inside those two
 * minutes destroyed the whole bag, with no word to the player -- and every
 * merge touching server/ is a deploy.  Handoff rule 11: memory is fine only
 * where a wipe "loses nothing of value".  The owner, 2026-11-10: "save it"
 * (one storage write per death).
 *
 * ONE ROW A DEATH PILE, `death_pile:<lootId>` (DEATHPILE.V's shape below):
 *   - written by the DEATH, in the same synchronous run as the death's own
 *     _saveRpg that leaves the items out of the bag (index.js
 *     _handlePlayerDeath, no await between): a crash keeps both writes or
 *     neither, so the bag is in the record or on the ground, never both,
 *     never neither;
 *   - deleted by the PICKUP, in the same synchronous run as the taker's
 *     _saveRpg that puts the items in their bag (_handleLootPickup's death
 *     branch).  A death pile is taken WHOLE (the first picker takes all), so
 *     the row never shrinks: it is there (nobody has it) or gone (somebody
 *     has).  The row's own delete is the credit's stamp (handoff rules 5 and
 *     6): it commits with the credit or not at all, and the restore below
 *     reads it before it puts anything back, so a restart can neither lose
 *     nor double an item;
 *   - deleted when the pile runs out (_tickLoot), and swept at a start;
 *   - read ONCE a worker's life, one bounded page (DEATHPILE.READ_MAX), at
 *     the first join, before that join's zone list is built (join.js): a pile
 *     still inside its time comes back with its own times (the owner's
 *     minute, `ownerOnlyUntil`, and its end, `expiry`, are absolute, so the
 *     clock kept running while the room was down) and the same rights (its
 *     `recipients`: the dead player, or in No man's land the killer, or
 *     nobody); one past its time is deleted.  Never a read a tick or a join
 *     after that (handoff rule 9's second edge).
 *
 * Only a DEATH's pile is saved.  A dropped item (itemdrop.js, `dropped`) and
 * a monster's pile stay memory-only as they always were (a row a kill would
 * be the bill's biggest line).  `_saved` marks the piles that have a row, so
 * nothing else ever deletes one.
 *
 * KILL SWITCH (lower case): `deathpilesave: false` in the live flags writes
 * no new row (piles in memory only, as before).  Rows already written are
 * still restored, deleted on a pickup and swept: the switch stops writes,
 * never the clean-up of what it left.
 */

export const DEATHPILE = {
  V: 1,                      /* the row's shape; a newer one is left alone */
  PREFIX: 'death_pile:',
  READ_MAX: 256,             /* rows read at a start (a deploy's two minutes of deaths) */
  DEL_BATCH: 128,            /* a storage.delete takes at most 128 keys */
  ITEMS_MAX: 200,            /* kinds on one pile, as read back */
};

export const DEATH_PILE_KEY = (lootId) => DEATHPILE.PREFIX + lootId;

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/* the row, from a pile _spawnDeathPile made */
function rowOf(pile, owner) {
  return {
    v: DEATHPILE.V,
    id: pile.lootId,
    owner,
    zone: pile.zone,
    x: pile.x || 0,
    y: pile.y || 0,
    name: pile.killerName || 'Player',
    recipients: Array.isArray(pile.recipients) ? pile.recipients.slice(0, 4) : null,
    ts: pile.ts,
    open: num(pile.ownerOnlyUntil),
    end: pile.expiry,
    items: (pile.deathItems || []).map((it) => ({ key: it.key, qty: it.qty })),
  };
}

/* the pile, from a row: the same fields _spawnDeathPile gives one, or null
   for a row that is not one */
function pileOf(rec) {
  if (!rec || typeof rec !== 'object' || rec.v !== DEATHPILE.V) return null;
  if (typeof rec.id !== 'string' || typeof rec.zone !== 'string' || !rec.zone) return null;
  if (rec.zone === '__proto__' || rec.zone === 'town' || rec.zone === 'farm_home') return null;
  const end = num(rec.end), ts = num(rec.ts);
  if (end === null || ts === null || !Array.isArray(rec.items)) return null;
  const items = [];
  for (const it of rec.items.slice(0, DEATHPILE.ITEMS_MAX)) {
    const key = it && typeof it.key === 'string' ? it.key : '';
    const qty = Math.floor(Number(it && it.qty) || 0);
    if (key && qty > 0) items.push({ key, qty });
  }
  if (!items.length) return null;
  return {
    lootId: rec.id,
    zone: rec.zone,
    x: num(rec.x) || 0,
    y: num(rec.y) || 0,
    coins: 0,
    skull: null,
    shard: null,
    recipients: Array.isArray(rec.recipients) ? rec.recipients.filter((r) => typeof r === 'string').slice(0, 4) : [rec.owner],
    shares: Object.create(null),
    killerName: typeof rec.name === 'string' ? rec.name : 'Player',
    ts,
    inventoryClaimed: false,
    claimedBy: Object.create(null),
    isDeathDrop: true,
    deathItems: items,
    ownerOnlyUntil: num(rec.open),
    expiry: end,
    _saved: true,
  };
}

export const deathPileMethods = {
  /* `deathpilesave: false` in the live flags: no new row */
  _deathPileSaveOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'deathpilesave') && !f.deathpilesave);
  },

  /* The death's row.  Called from _handlePlayerDeath right before the death's
     own _saveRpg, with no await between (the caller is synchronous): the two
     puts are one write.  Never throws (the death must complete). */
  _deathPileSave(pile, playerId, ps) {
    if (!pile || !pile.isDeathDrop || pile.dropped || pile._saved) return false;
    if (!playerId || (ps && ps._spar)) return false;
    if (this._deathPileSaveOff()) return false;
    try {
      const w = this.state.storage.put(DEATH_PILE_KEY(pile.lootId), rowOf(pile, playerId));
      if (w && typeof w.catch === 'function') w.catch(() => {});
      pile._saved = true;
      return true;
    } catch (e) { return false; }
  },

  /* The row goes: the pile was taken (in the taker's save run) or ran out.
     Only a pile that has one (`_saved`). */
  _deathPileGone(pile) {
    if (!pile || !pile._saved) return;
    pile._saved = false;
    try {
      const w = this.state.storage.delete(DEATH_PILE_KEY(pile.lootId));
      if (w && typeof w.catch === 'function') w.catch(() => {});
    } catch (e) {}
  },

  /* Once a worker's life, at the first join: the saved piles back on the
     ground, the ones past their time deleted.  One bounded page.  A failed
     read leaves it to the next join (nothing is restored twice: a pile whose
     id is already on the ground is skipped). */
  async _deathPilesEnsure() {
    if (this._deathPilesLoaded) return;
    this._deathPilesLoaded = true;
    let rows;
    try {
      rows = await this.state.storage.list({ prefix: DEATHPILE.PREFIX, limit: DEATHPILE.READ_MAX });
    } catch (e) {
      this._deathPilesLoaded = false;
      return;
    }
    const now = Date.now();
    const gone = [];
    for (const [k, rec] of rows || []) {
      /* a newer worker's row: not ours to read or delete */
      if (rec && typeof rec === 'object' && typeof rec.v === 'number' && rec.v > DEATHPILE.V) continue;
      const pile = pileOf(rec);
      if (!pile || k !== DEATH_PILE_KEY(pile.lootId) || now > pile.expiry) { gone.push(k); continue; }
      if (!this.loot[pile.zone]) this.loot[pile.zone] = [];
      const list = this.loot[pile.zone];
      if (list.some((p) => p.lootId === pile.lootId)) continue;
      list.push(pile);
    }
    for (let i = 0; i < gone.length; i += DEATHPILE.DEL_BATCH) {
      try {
        const w = this.state.storage.delete(gone.slice(i, i + DEATHPILE.DEL_BATCH));
        if (w && typeof w.catch === 'function') w.catch(() => {});
      } catch (e) {}
    }
  },
};
