/* ═══ v2.3.3473: DROP AN ITEM (docs/specs/item-drop.md) ═══
 *
 * The owner: "add an option to "drop" items in game. After about a minute
 * they become visible to other players. After 2 minutes it begins flashing
 * and disappears".
 *
 * A bag item -- any inventory key the trade window would take (trade.js
 * _sanitizeTradeOffer), in any number you hold -- leaves the bag and lies at
 * your feet as a pile (AHEAD_PX in front of them, so you can see it).  The pile is the DEATH PILE's own (index.js
 * _spawnDeathPile): `isDeathDrop`, its `deathItems`, `recipients` for its
 * owner window and an `expiry`, so the pickup (_handleLootPickup's
 * isDeathDrop branch: the first picker takes it whole, the pile goes), the
 * owner gate (`ownerOnlyUntil`) and the despawn (_tickLoot) are the code every
 * death pile already runs.  What a drop adds, `dropped`:
 *
 *   0-60 s    YOURS ALONE.  Not even SENT to anyone else: the pile goes to your
 *             socket only, and every pile list leaves it out for everyone but
 *             you (index.js _zoneLootForWire's viewer; _pileHiddenFrom).  Only
 *             you may take it back (the owner gate).
 *   60 s      EVERYONE'S.  _tickLoot tells the room (loot_drop,
 *             _dropRevealDue), and anyone in its zone may pick it up.
 *   120 s     the phones FLASH it (`flashAt`).
 *   130 s     GONE (`expiry`: _tickLoot's loot_despawn).
 *
 * Nothing is stored: like every pile it lives in this.loot (handoff rule 11),
 * so a room restart in those two minutes loses it -- and the bag's save has
 * already left it out, so nothing is ever in two places.  The bag's count,
 * the pile and the save happen in one synchronous run (handoff rule 5): a
 * drop is one row, as a pickup is.
 *
 * Refused, in words on the phone (`item_drop_result`, PRIVILEGED):
 *   'off'       the live flag `itemdrop: false`
 *   'dead'      dead, dying or gone
 *   'not-here'  today's town, the old World View and the farm, where piles
 *               are never shown (the phone empties a safe zone's piles)
 *   'fight'     in a fight with a player (nomansland.js _bagLockedByFight: a
 *               losing bag is the killer's, as for a trade or a sale)
 *   'bad'       a key or count that is not one
 *   'none'      not in the bag
 *   'slow'      one drop every GAP_MS
 *   'too-many'  MAX_LIVE piles of yours on the ground at once
 *
 * Kill switch: `itemdrop: false` in the live flags -- no drop, and
 * `caps.itemdrop` false at a phone's next join (it hides Drop).
 */

export const ITEM_DROP = Object.freeze({
  /* only the dropper sees it, and only they may take it back */
  PRIVATE_MS: 60000,
  /* the phones start flashing it ("After 2 minutes it begins flashing") */
  FLASH_MS: 120000,
  /* ...and it is gone ("...and disappears") */
  GONE_MS: 130000,
  /* one drop this often a player: a bag emptied tile by tile is a tap or two a
     second, and each drop is a row */
  GAP_MS: 400,
  /* piles of yours on the ground at once */
  MAX_LIVE: 12,
  /* the trade sanitizer's own bounds (trade.js) */
  MAX_QTY: 9999,
  KEY_MAX: 32,
  /* the pile lands this far in front of your feet (toward the camera): at
     your feet exactly, your own legs hid it (mp-itemdrop's first picture) */
  AHEAD_PX: 34,
  /* where no pile is ever shown: the phone's safe zones (src/data/zones.js
     `safe`), whose piles the ground-loot loop empties -- today's town, the
     old World View hub (closed, `?trial=off`) and the farm */
  NO_DROP_ZONES: Object.freeze(['town', 'worldview', 'farm_home']),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* the ask, checked: {key, qty} or null -- the trade sanitizer's rules: a short
   string that is no Object.prototype member, a whole count of 1 or more */
export function dropAsk(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const key = msg.key;
  if (typeof key !== 'string' || key.length < 1 || key.length > ITEM_DROP.KEY_MAX) return null;
  if (own(Object.prototype, key)) return null;
  const qty = msg.qty === undefined ? 1 : msg.qty;
  if (!Number.isInteger(qty) || qty < 1) return null;
  return { key, qty: Math.min(qty, ITEM_DROP.MAX_QTY) };
}

export const itemDropMethods = {
  _itemDropOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'itemdrop') && !f.itemdrop);
  },

  _dropReply(sid, out) {
    const ws = sid ? this._wsBySessionId(sid) : null;
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'item_drop_result', payload: out })); } catch (e) { /* the socket is going */ }
  },

  /* `item_drop {key, qty}` */
  _handleItemDrop(session, msg) {
    const sid = session && session.id;
    if (!sid) return;
    const key0 = msg && typeof msg.key === 'string' ? msg.key.slice(0, ITEM_DROP.KEY_MAX) : null;
    const no = (reason) => this._dropReply(sid, { ok: false, reason, key: key0 });
    if (this._itemDropOff()) return no('off');
    const ps = this.playerState[sid];
    if (!ps || ps.dead || ps.dying || ps.disconnected) return no('dead');
    const zone = ps.z;
    if (!zone || typeof zone !== 'string' || ITEM_DROP.NO_DROP_ZONES.includes(zone)) return no('not-here');
    const now = Date.now();
    if (this._bagLockedByFight && this._bagLockedByFight(sid, now)) return no('fight');
    const ask = dropAsk(msg);
    if (!ask) return no('bad');
    const inv = ps.inventory;
    const have = inv && typeof inv === 'object' && own(inv, ask.key) ? Math.floor(Number(inv[ask.key]) || 0) : 0;
    if (have < 1) return no('none');
    if (ps._dropAt && now - ps._dropAt < ITEM_DROP.GAP_MS) return no('slow');
    if (this._dropsLiveOf(sid) >= ITEM_DROP.MAX_LIVE) return no('too-many');
    const qty = Math.min(ask.qty, have);

    /* ONE synchronous run (handoff rule 5): out of the bag, onto the ground,
       saved -- no await between, so nothing can see it in both places */
    if (have - qty > 0) inv[ask.key] = have - qty; else delete inv[ask.key];
    const pile = this._dropPile(session, ps, ask.key, qty, now);
    ps._dropAt = now;
    this._saveRpg(sid, ps);

    /* to the dropper alone: the pile, the bag, the answer */
    const ws = this._wsBySessionId(sid);
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'loot_drop', payload: { pile: this._serializePile(pile) } })); } catch (e) { /* going */ }
      this._sendPlayerState(ws, sid);
    }
    this._dropReply(sid, { ok: true, key: ask.key, qty, lootId: pile.lootId });
  },

  _dropPile(session, ps, key, qty, now) {
    const sid = session.id;
    const zone = ps.z;
    if (!this.loot[zone]) this.loot[zone] = [];
    const pile = {
      lootId: 'dr-' + sid + '-' + now.toString(36) + '-' + (++this._lootSeq),
      zone,
      x: Number(ps.x) || 0,
      y: (Number(ps.y) || 0) + ITEM_DROP.AHEAD_PX,
      coins: 0,
      skull: null,
      shard: null,
      recipients: [sid],
      shares: {}, // proto-ok: player-keyed (a drop carries no shares); join ids gate-hardened v2.3.1202
      killerName: (this._relayName ? this._relayName(session) : (session.name || 'Player')),
      ts: now,
      inventoryClaimed: false,
      claimedBy: {}, // proto-ok: player-keyed; join ids gate-hardened v2.3.1202
      isDeathDrop: true,
      deathItems: [{ key, qty }],
      /* v2.3.3473: what makes it a drop -- drawn as the item, hidden from
         everyone else until privateUntil, flashing from flashAt */
      dropped: true,
      dropBy: sid,
      ownerOnlyUntil: now + ITEM_DROP.PRIVATE_MS,
      privateUntil: now + ITEM_DROP.PRIVATE_MS,
      revealed: false,
      flashAt: now + ITEM_DROP.FLASH_MS,
      expiry: now + ITEM_DROP.GONE_MS,
    };
    this.loot[zone].push(pile);
    return pile;
  },

  /* how many of this player's drops lie on the ground */
  _dropsLiveOf(sid) {
    let n = 0;
    for (const z of Object.keys(this.loot)) {
      const list = this.loot[z];
      if (!list) continue;
      for (const p of list) if (p && p.dropped && p.dropBy === sid) n++;
    }
    return n;
  },

  /* Is this pile hidden from `viewer`: a drop still in its private minute,
     and not theirs.  index.js _zoneLootForWire asks it of every pile it
     lists, so a join, a zone change and a roster's re-send never carry
     someone else's private drop -- a phone that was never sent it cannot
     show it. */
  _pileHiddenFrom(p, viewer, now) {
    return !!(p && p.dropped && !p.revealed && (now === undefined ? Date.now() : now) < p.privateUntil && p.dropBy !== viewer);
  },

  /* does `viewer` own a drop still private in `zone` (spawnscale.js
     _pushZoneRoster sends them their own list) */
  _dropPrivateIn(zone, viewer, now) {
    const list = this.loot[zone];
    if (!list || !viewer) return false;
    const t = now === undefined ? Date.now() : now;
    for (const p of list) {
      if (p && p.dropped && !p.revealed && t < p.privateUntil && p.dropBy === viewer) return true;
    }
    return false;
  },

  /* _tickLoot's: a drop whose minute is up is told to the room, once.  The
     dropper's phone already holds it and skips the id (gameEvents.js). */
  _dropRevealDue(p, now) {
    if (!p || !p.dropped || p.revealed || now < p.privateUntil) return false;
    p.revealed = true;
    this.eventBuffer.push({ type: 'loot_drop', payload: { pile: this._serializePile(p) } });
    return true;
  },

  /* `/dev/dropage {ms}`: this player's drops `ms` older, for the phone test
     (mp-itemdrop) -- a minute and two are long to wait out on a test box.
     The phones' copies are told their new clocks the way any copy of a drop
     refreshes them (a loot_drop of a pile a phone holds: gameEvents.js): a
     drop already everyone's to the room, a private one to its dropper alone
     (a private one now past its minute is told the room by _tickLoot). */
  _dropDevAge(playerId, body) {
    const ms = Math.floor(Number(body && body.ms) || 0);
    if (!(ms > 0) || ms > 10 * 60 * 1000) return { ok: false, error: 'ms 1..600000' };
    let n = 0;
    const ws = this._wsBySessionId(playerId);
    for (const z of Object.keys(this.loot)) {
      for (const p of (this.loot[z] || [])) {
        if (!p || !p.dropped || p.dropBy !== playerId) continue;
        p.ts -= ms; p.ownerOnlyUntil -= ms; p.privateUntil -= ms; p.flashAt -= ms; p.expiry -= ms;
        n++;
        const msg = { type: 'loot_drop', payload: { pile: this._serializePile(p) } };
        if (p.revealed) this.eventBuffer.push(msg);
        else if (ws) { try { ws.send(JSON.stringify(msg)); } catch (e) { /* going */ } }
      }
    }
    return { ok: true, aged: n, ms };
  },
};
