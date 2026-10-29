/* ═══ v2.3.3785: THE BANK'S VAULT ═══
 * Spec: docs/specs/bank-vault.md
 *
 * The owner, 2026-10-29: "Oh yeah make it so you can actually deposit and
 * retrieve items and gold from the bank".  Until now the Bank's window showed
 * your gold and what you wear and sent nothing ("Nothing can be stored here
 * yet", v2.3.3481).  This is the vault behind it: bag items and gold the
 * worker holds for you, out of the bag, so a death -- the Remains it drops, a
 * loss in No man's land -- never reaches them.
 *
 * THE RECORD.  Its own key, `bank:<playerId>` (handoff rule 2's registry):
 *   { _v: BANK.V, gold, items: [{ key, n }], ops: [opId, ...] }
 * Not a field on the rpg record (rule 1's fixed list, the gearstash.js road):
 * `rpg:` is the hot row, written on nearly every action, and a 48-slot vault
 * riding it would make each of those writes bigger for a store most players
 * open now and then.  Its own key is written only by a bank op, read once per
 * session on the first bank message (never on the join path), and cached in
 * memory until the player leaves (webSocketClose / linger, like gear_prov).
 *
 * ONE WRITE (handoff rules 5 and 7, inbox.test §8c).  A deposit or a
 * withdrawal changes the bag or the purse (`rpg:`) and the vault (`bank:`):
 * both puts are issued in ONE synchronous run with no await between them, so
 * the Durable Object commits them together and a restart can never keep the
 * item in both places or in neither.  The op's id rides inside the `bank:`
 * put, so "it happened" and "its id is spent" are the same write: a replayed
 * opId (a phone resending after a drop) answers the result it had and moves
 * nothing.  Only an op that moved something spends its id; a refusal writes
 * nothing at all, and asking again re-asks.
 *
 * WHERE.  At the Bank's door in the Wheel and nowhere else -- the Hotel's rule
 * (rest.js): the door's offset from the Wheel's middle, held to the door the
 * ground worker places for the bank by tools/world/test-world-core.mjs, so no
 * Wheel coordinate is written here and either Wheel's size is served.
 *
 * WHAT GOES IN.  A stackable of the bag (`ps.inventory`), by its key and a
 * count, and gold.  Everything but the gathering tools: they are kept through
 * a death anyway, every harvest reads them in the bag, and a quest grants one
 * when the bag has none (data.js grantOnAccept `max: 1`), so an axe in the
 * vault could be granted again.  A quest's objective items do go in: a
 * turn-in counts what is in the bag, so one banked waits for its owner to
 * take it out, which is theirs to choose.  Weapons and gear pieces are a
 * follow-up (the spec's "Not in this version").
 *
 * DENY BY DEFAULT.  bank_open, bank_deposit and bank_withdraw are handled on
 * purpose (index.js), awaited; bank_state is privileged.  Every key a phone
 * names is checked against the player's own bag or vault, own-property only,
 * and '__proto__' / 'constructor' / 'prototype' are never a key (TRAPS #6):
 * the vault in memory is a Map.
 *
 * KILL SWITCH (lower case, TRAPS §117): `bank: false` in the live flags
 * un-advertises caps.bank (the flags spread over the caps, join.js) and
 * refuses every deposit and withdrawal with 'off'.  What is in a vault stays
 * there, and bank_open still shows it, so a switch thrown in a hurry hides
 * nothing anybody owns.
 */
import { PACE } from './flood.js';

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const BANK = Object.freeze({
  /* the record's shape number: bump it when the shape changes */
  V: 1,
  /* the vault's room: one slot a kind of item, whatever its count.  A data
     bound (the record stays a few KB), not a play cap */
  SLOTS: 48,
  /* the most one stack or the vault's gold can hold */
  MAX_N: 1e9,
  /* the ids of the ops that moved something, the newest last: enough for a
     phone's resends, small enough to ride every put */
  OPS: 32,
  /* The Bank's door (the foot of its steps), game px from the Wheel's middle.
     The town is the same ground on both Wheels (race.js), so one offset
     serves either; tools/world/test-world-core.mjs holds it to the door the
     ground worker places for the bank. */
  DOOR: Object.freeze([1120, -117]),
  /* How near the door counts, from your middle: the Hotel's reach (rest.js
     HOTEL_R) for the same reasons, and the Bank's nearest neighbour's door
     is 800+ px away */
  DOOR_R: 260,
});

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const okKey = (k) => typeof k === 'string' && k.length > 0 && k.length <= 64 && !BAD_KEYS.has(k);
const okOp = (o) => typeof o === 'string' && o.length > 0 && o.length <= 64;
const wholeN = (n) => (Number.isInteger(n) && n >= 1 && n <= BANK.MAX_N ? n : 0);

/* A stored record, healed into the in-memory form: a Map of key -> count, in
   the order the items went in.  Junk entries drop; a shape from a NEWER
   worker is kept as it is and marked, so this one never rewrites it
   (docs/specs/migrations.md: refused, never rewritten). */
export function normalizeVault(rec) {
  const v = { gold: 0, items: new Map(), ops: [], newer: false };
  if (!rec || typeof rec !== 'object') return v;
  if (typeof rec._v === 'number' && rec._v > BANK.V) { v.newer = true; v.raw = rec; return v; }
  const g = Math.floor(Number(rec.gold) || 0);
  v.gold = g > 0 ? Math.min(g, BANK.MAX_N) : 0;
  for (const it of (Array.isArray(rec.items) ? rec.items : [])) {
    if (v.items.size >= BANK.SLOTS) break;
    const n = Math.floor(Number(it && it.n) || 0);
    if (!it || !okKey(it.key) || n < 1) continue;
    v.items.set(it.key, Math.min(BANK.MAX_N, (v.items.get(it.key) || 0) + n));
  }
  v.ops = (Array.isArray(rec.ops) ? rec.ops : []).filter(okOp).slice(-BANK.OPS);
  return v;
}

/* The stored form of a vault. */
export function vaultRecord(v) {
  return { _v: BANK.V, gold: v.gold, items: [...v.items].map(([key, n]) => ({ key, n })), ops: v.ops.slice(-BANK.OPS) };
}

export const bankMethods = {
  _bankOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'bank') && !f.bank);
  },

  _bankMap() {
    if (!this._bankCache) this._bankCache = new Map();
    return this._bankCache;
  },

  _bankForget(pid) {
    if (!pid) return;
    this._bankMap().delete(pid);
    if (this._bankLoading) this._bankLoading.delete(pid);
  },

  /* The vault, read once per session: ONE storage get, never a prefix list
     (rule 9).  Two messages arriving together share one read, and whichever
     resolves second finds the first's copy already cached and keeps it, so
     an op made between the two is never overwritten by a stale read. */
  /* ═══ A READ THAT FAILS IS NOT AN EMPTY VAULT (the review of #1267) ═══
     A storage.get that throws used to read as "no record", which is an EMPTY
     vault -- cached for the session, so the player's next deposit put it over
     the real `bank:<pid>` and every coin and item banked was gone.  It fails
     toward "no transfer" now, the pets record's posture (petbook.js
     _petbookLoadOnJoin, `locked`): the vault comes back marked `failed`, is
     NOT cached (nor left loading), every move against it is refused 'busy'
     before anything moves, and the next bank message reads again.
     And a read still in flight when the player left, or when a restart
     deleted the vault, is not cached either: only the read that is still
     this player's own (`_bankLoading` still holds it) may fill the cache. */
  async _bankLoad(pid) {
    const cached = this._bankMap().get(pid);
    if (cached) return cached;
    if (!this._bankLoading) this._bankLoading = new Map();
    let p = this._bankLoading.get(pid);
    if (!p) {
      p = (async () => {
        let rec = null;
        try { rec = await this.state.storage.get('bank:' + pid); } catch (e) { return { failed: true }; }
        return normalizeVault(rec);
      })();
      this._bankLoading.set(pid, p);
    }
    const v = await p;
    const mine = this._bankLoading.get(pid) === p;
    if (mine) this._bankLoading.delete(pid);
    if (v.failed) {
      return { gold: 0, items: new Map(), ops: [], newer: false, failed: true };
    }
    if (mine && !this._bankMap().has(pid)) this._bankMap().set(pid, v);
    return this._bankMap().get(pid) || v;
  },

  /* Standing at the Bank's door in the Wheel this room plays. */
  _bankPlaceOk(ps) {
    if (!ps || ps.z !== 'wheel' || typeof ps.x !== 'number' || typeof ps.y !== 'number') return false;
    const T = typeof this._wheelT === 'function' ? this._wheelT() : null;
    const c = T && Array.isArray(T.WHEEL_CENTRE) ? T.WHEEL_CENTRE : null;
    if (!c) return false;
    return Math.hypot(ps.x - (c[0] + BANK.DOOR[0]), ps.y - (c[1] + BANK.DOOR[1])) <= BANK.DOOR_R;
  },

  /* The bag's keys that may not go in: the gathering tools (the header). */
  _bankKept(key) {
    return typeof this._GATHER_TOOL_KEYS === 'function' && this._GATHER_TOOL_KEYS().has(key);
  },

  /* bank_state: the vault as the phone draws it, and the op it answers */
  _bankSend(pid, v, last) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    const ps = this.playerState[pid];
    const inv = (ps && ps.inventory) || {};
    const noBank = Object.keys(inv).filter((k) => (Number(inv[k]) || 0) > 0 && this._bankKept(k));
    const payload = {
      ok: !v.newer && !v.failed,   /* a failed read: "try again", never an empty vault drawn as the truth */
      on: !this._bankOff(),
      failed: !!v.failed,
      gold: v.gold,
      items: [...v.items].map(([key, n]) => ({ key, n })),
      slots: BANK.SLOTS,
      noBank,
      last: last || null,
    };
    try { ws.send(JSON.stringify({ type: 'bank_state', payload })); } catch (e) { /* the vault stands */ }
  },

  /* bank_open {} -- the vault, read (once) and shown.  Anywhere: it moves
     nothing, and the window asks it as it opens. */
  async _handleBankOpen(session) {
    if (!session || !session.id) return;
    const pid = session.id;
    const v = await this._bankLoad(pid);
    if (!this.playerState[pid]) return;
    this._bankSend(pid, v, null);
  },

  /* bank_deposit / bank_withdraw { kind: 'item'|'gold', id, n, opId } */
  async _handleBankMove(session, payload, dir) {
    if (!session || !session.id) return;
    const pid = session.id;
    const p = payload && typeof payload === 'object' ? payload : {};
    const kind = p.kind === 'gold' ? 'gold' : p.kind === 'item' ? 'item' : null;
    const opId = okOp(p.opId) ? p.opId : null;
    const n = wholeN(p.n);
    const id = kind === 'item' ? p.id : null;
    const last = (ok, err) => ({ opId, dir, kind, id: kind === 'item' && okKey(id) ? id : null, n, ok, err: err || null });
    const v = await this._bankLoad(pid);
    /* ── after the read, everything below is ONE synchronous run ── */
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    if (v.newer) return this._bankSend(pid, v, last(false, 'newer'));
    if (v.failed) return this._bankSend(pid, v, last(false, 'busy'));   /* the read failed: move nothing, read again next time */
    if (opId && v.ops.includes(opId)) return this._bankSend(pid, v, last(true, null));
    if (this._bankOff()) return this._bankSend(pid, v, last(false, 'off'));
    if (!kind || !opId || !n) return this._bankSend(pid, v, last(false, 'bad'));
    if (kind === 'item' && !okKey(id)) return this._bankSend(pid, v, last(false, 'bad_key'));
    if (!this._bankPlaceOk(ps)) return this._bankSend(pid, v, last(false, 'not_here'));
    if (this._paceTake && !this._paceTake('bank', pid, PACE.BANK)) return this._bankSend(pid, v, last(false, 'busy'));

    if (kind === 'gold') {
      const purse = Math.floor(Number(ps.coins) || 0);
      if (dir === 'in') {
        if (purse < n) return this._bankSend(pid, v, last(false, 'not_enough'));
        if (v.gold + n > BANK.MAX_N) return this._bankSend(pid, v, last(false, 'vault_full'));
        ps.coins = purse - n;
        v.gold += n;
      } else {
        if (v.gold < n) return this._bankSend(pid, v, last(false, 'not_enough'));
        ps.coins = purse + n;
        v.gold -= n;
      }
    } else {
      if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {}; // proto-ok: the bag's own shape; every key reaching it passed okKey (no '__proto__' / 'constructor' / 'prototype') and is read own-property only
      const inv = ps.inventory;
      if (dir === 'in') {
        const held = has(inv, id) ? Math.floor(Number(inv[id]) || 0) : 0;
        if (held < 1) return this._bankSend(pid, v, last(false, 'bad_key'));
        if (this._bankKept(id)) return this._bankSend(pid, v, last(false, 'kept'));
        if (held < n) return this._bankSend(pid, v, last(false, 'not_enough'));
        const inVault = v.items.get(id) || 0;
        if (!inVault && v.items.size >= BANK.SLOTS) return this._bankSend(pid, v, last(false, 'vault_full'));
        if (inVault + n > BANK.MAX_N) return this._bankSend(pid, v, last(false, 'vault_full'));
        if (held - n > 0) inv[id] = held - n; else delete inv[id];
        v.items.set(id, inVault + n);
      } else {
        const inVault = v.items.get(id) || 0;
        if (inVault < 1) return this._bankSend(pid, v, last(false, 'bad_key'));
        if (inVault < n) return this._bankSend(pid, v, last(false, 'not_enough'));
        const held = has(inv, id) ? Math.floor(Number(inv[id]) || 0) : 0;
        if (held + n > BANK.MAX_N) return this._bankSend(pid, v, last(false, 'bag_full'));
        inv[id] = held + n;
        if (inVault - n > 0) v.items.set(id, inVault - n); else v.items.delete(id);
      }
    }
    v.ops.push(opId);
    if (v.ops.length > BANK.OPS) v.ops.splice(0, v.ops.length - BANK.OPS);
    /* THE ONE WRITE: the bag or purse and the vault, no await between them */
    this._saveRpg(pid, ps);
    try {
      const w = this.state.storage.put('bank:' + pid, vaultRecord(v));
      if (w && typeof w.catch === 'function') w.catch(() => {});
    } catch (e) { /* the output gate holds the answer until both land */ }
    const ws = this._wsBySessionId(pid);
    if (ws) this._sendPlayerState(ws, pid);
    this._bankSend(pid, v, last(true, null));
  },
};
