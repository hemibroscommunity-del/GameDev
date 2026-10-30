import { GEAR_STASH_CAP } from './gearstash.js';                      /* v2.3.2536 */
import { isGearStashField, slotForGearField, PROV_MINTED, PROV_LEGACY } from './gearprov.js'; /* v2.3.2536 */
import { swordToGreatsword } from './swordconvert.js';   /* v2.3.3895: a sword in the post arrives a greatsword */

/* ═══ v2.3.1117: INBOX + ESCROW PRIMITIVES (PR2 of the heavy-systems
 * plan; spec in docs/specs/inbox-escrow.md) ═══
 *
 * v2.3.1165 (P4 decomposition): extracted verbatim from index.js into
 * this mixin (same pattern as market.js).  These are the most-shared
 * primitives in the room -- market, trade, trade2, duel, clans,
 * cadence, and sponsorship all settle through _creditPlayer /
 * _escrowDebitGold / _escrowTakeItem via `this` (prototype dispatch),
 * so the move changes no call site.
 *
 * The settlement plumbing every economy system builds on: the
 * marketplace (PR3), trade sessions (PR4), and duel wagers (PR6) all
 * credit and debit players through these methods instead of trusting
 * the client to pay itself (the self-credit hole this plan retires).
 *
 * Storage layout -- all SEPARATE keys, never inside the rpg blob
 * (_saveRpg rewrites the blob from a fixed field list and would drop
 * foreign fields on the next save):
 *   inbox:<playerId>  array of pending credit entries (offline mail)
 *   oplog:<opId>      idempotency journal, ts value, pruned after 48h
 *
 * Concurrency: every method runs inside one DO event and only awaits
 * STORAGE ops, so input gates make each call a critical section.
 * Callers must keep the discipline rule: no cross-DO await between a
 * validation and the commit that depends on it. */

/* v2.3.2438: one page of the oplog sweep per tick slot.  PAGE is sized so a
   page is one small list() plus at most four batched delete()s; the slot
   cadence (tick.js) sets the sweep's throughput, ~10k keys a minute. */
export const OP_PRUNE = {
  PAGE: 500,
  TTL_MS: 172800000,     // 48h, unchanged
  INTERVAL_MS: 3600000,  // one full sweep per hour, unchanged
  SLOT_MS: 3000,         // one page every 3s while the room is occupied
};

/* ═══ v2.3.3488: ACHIEVEMENT POINTS PAID ONCE A CHARACTER ═══
   The names a credit's `apOnce` may carry, each a prize whose points a
   character is paid the first time only (_applyCreditToPs).  The marks are
   their own record, `aponce:<pid>` -> {name: 1} (ARCHITECTURE-HANDOFF rule 1:
   no new field in the rpg blob), read at the join before the mail
   (_apOnceLoadOnJoin) and written by _saveRpg in the same synchronous run as
   the blob that holds the points (persistence.js).  cleanApOnce keeps only
   these names, only 1. */
export const AP_ONCE = new Set(['arena']);
export function cleanApOnce(v) {
  const out = {};
  if (v && typeof v === 'object') for (const k of AP_ONCE) if (v[k] === 1 || v[k] === true) out[k] = 1;
  return out;
}

export const inboxMethods = {
  /* v2.3.3488: the once-a-character prizes this character has been paid
     (AP_ONCE above) -- one GET at the join, BEFORE the mail drains, so a
     champion's prize waiting there is judged by them.  A failed read marks
     the character `_apOnceFailed`: no once-a-character points until the next
     join, and no mark written. */
  async _apOnceLoadOnJoin(playerId, ps) {
    if (!playerId || !ps) return;
    try {
      ps.apOnce = cleanApOnce(await this.state.storage.get('aponce:' + playerId));
      ps._apOnceFailed = false;
    } catch (e) {
      ps.apOnce = {};
      ps._apOnceFailed = true;
    }
    ps._apOnceDirty = false;
  },

  /* ═══ v2.3.1971: HOW MANY OF `k` DOES THIS PLAYER ACTUALLY HOLD ═══
   *
   * Every ownership gate in the economy was spelled `(inv[k] || 0) < n`,
   * which is wrong twice for a client-supplied key:
   *   - `constructor` (and the other ten Object.prototype members) is
   *     INHERITED and truthy, so `||` never fires and `Object < 7` is a
   *     NaN comparison -- false -- so the gate passes on goods nobody
   *     owns and the debit below writes NaN into a persisted blob.
   *   - a count that is already junk (a string or NaN left by an older
   *     build, or by a hand-edited blob) sails through the same way.
   * Own property, coerced to a number, or zero.  Read it INSTEAD of
   * indexing `ps.inventory` anywhere a client chose the key; the
   * sanitizer (trade.js `_sanitizeTradeOffer`) is the first gate and
   * this is the second, because the first is one edit away from being
   * widened by someone who does not know why it is there. */
  _invCount(ps, k) {
    const inv = ps && ps.inventory;
    if (!inv || typeof k !== 'string') return 0;
    if (!Object.prototype.hasOwnProperty.call(inv, k)) return 0;
    return Number(inv[k]) || 0;
  },

  // Idempotency journal.  Settlement callers pass a deterministic opId
  // (e.g. 'refund:<orderId>'); a retry after a crash or double-fire
  // finds the stamp and reports already-applied instead of paying twice.
  async _opSeen(opId) {
    if (!opId) return false;
    return (await this.state.storage.get('oplog:' + opId)) !== undefined;
  },

  async _opStamp(opId) {
    if (opId) await this.state.storage.put('oplog:' + opId, Date.now());
  },

  /* ═══ v2.3.3185: SEVERAL STAKES AND THEIR RECORD IN ONE WRITE ═══
     For players who are online (a duel's two sides).  Every purse is checked
     first; then every debit, its save, its oplog stamp and the caller's
     records (`puts`: [[key, value], ...]) are issued in ONE synchronous run,
     so they commit together -- all of them, or none (rule 8).
     _escrowDebitGold took each stake in a write of its own and the caller
     wrote its escrow record after, so a restart between them (every server
     merge restarts the room) took a stake with no record for the sweep to
     refund: the gold was simply gone.  The opIds are the caller's and must
     be fresh (a new duel's id); nothing here is a retry. */
  async _escrowDebitGoldTogether(debits, puts) {
    const list = Array.isArray(debits) ? debits : [];
    if (!list.length) return { ok: false, reason: 'nothing' };
    for (const d of list) {
      const ps = d && this.playerState[d.id];
      const amt = Math.floor(Number(d && d.amount) || 0);
      if (!ps || !(amt > 0) || !d.opId) return { ok: false, reason: 'bad' };
      if ((ps.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold', who: d.id };
    }
    const writes = [];
    for (const d of list) {
      const ps = this.playerState[d.id];
      ps.coins -= Math.floor(Number(d.amount));
      writes.push(this._saveRpg(d.id, ps));
      writes.push(this._opStamp(d.opId));
    }
    for (const kv of Array.isArray(puts) ? puts : []) {
      if (Array.isArray(kv) && typeof kv[0] === 'string') writes.push(this.state.storage.put(kv[0], kv[1]));
    }
    for (const d of list) this._queuePlayerStateFlush(d.id);
    await Promise.all(writes);
    return { ok: true };
  },

  /* ═══ v2.3.2438: THE PRUNE THAT STOPPED THE ROOM ═══
   *
   * This used to be one call: list EVERY `oplog:` stamp ever written, then
   * `await storage.delete(k)` one key at a time, awaited on the JOIN path
   * before state_sync, on the first inbox drain after every deploy and
   * hourly after that.  Every one of those awaits is a storage await, and
   * a storage await keeps the Durable Object's input gate CLOSED (handoff
   * rule 9) -- so for as long as the sweep ran, the room answered nothing:
   * not the join that triggered it, not the next player's join, not the
   * admin HTTP surface.  On 2026-09-10, after four deploys in a day and
   * months of stamps (every credit, refund, daily reward, trade, duel,
   * arena payout), that was long enough that the owner's client gave up
   * waiting for state_sync and fell into its client-local legacy game --
   * reported as "zeros for combat primary skills" and "old menus" -- while
   * the test panel's flags request timed out against the same object,
   * repeatedly.  A restart mid-sweep loses the progress and the next join
   * starts the whole list again, so it survived redeploys.
   *
   * Now the sweep is a JOB, not a call: one bounded page per tick slot
   * (tick.js), a cursor carried in memory, stale keys deleted in one
   * batched call per page.  No single event holds the gate for more than
   * two small storage operations, and the join path never waits on it at
   * all -- `_drainInbox` no longer calls it.  A page that comes back short
   * ends the sweep and arms the hourly anchor; a restart forgets the
   * cursor and simply starts a fresh sweep, which is now harmless.
   *
   * `_opPruneMaybe()` keeps its name and its contract for callers and for
   * the suite: it runs ONE page.  Everything the old comment said still
   * holds -- there is no storage TTL, and 48h is far beyond any legitimate
   * retry window. */
  async _opPruneMaybe(now) {
    now = now || Date.now();
    if (!this._opPrune) {
      // Idle between sweeps: honour the hourly anchor.
      if (this._lastOpPrune && now - this._lastOpPrune < OP_PRUNE.INTERVAL_MS) return false;
      this._opPrune = { after: null, pages: 0, deleted: 0 };
    }
    const job = this._opPrune;
    try {
      const opts = { prefix: 'oplog:', limit: OP_PRUNE.PAGE };
      if (job.after) opts.startAfter = job.after;
      const entries = await this.state.storage.list(opts);
      const stale = [];
      let last = null;
      for (const [k, ts] of entries) {
        last = k;
        if (typeof ts !== 'number' || now - ts > OP_PRUNE.TTL_MS) stale.push(k);
      }
      /* Batched: the runtime takes up to 128 keys per delete(). */
      for (let i = 0; i < stale.length; i += 128) {
        await this.state.storage.delete(stale.slice(i, i + 128));
      }
      job.pages++;
      job.deleted += stale.length;
      if (entries.size < OP_PRUNE.PAGE || !last) {
        // Sweep complete.
        this._lastOpPrune = now;
        this._opPruneLast = { pages: job.pages, deleted: job.deleted, at: now };
        this._opPrune = null;
        return false;
      }
      job.after = last;
      return true; // more to do
    } catch (e) {
      /* Best-effort, but a page that throws must not spin the slot: end
         the sweep and let the hourly anchor try again later. */
      this._lastOpPrune = now;
      this._opPrune = null;
      return false;
    }
  },

  /* Credit a player.  entry = { opId, source, kind, payload, note }:
   *   kind 'gold'   payload { amount }
   *   kind 'item'   payload { invKey, count }
   *   kind 'weapon' payload { weapon }   (opaque blob, sanitized on apply)
   *   kind 'gear'   payload { field, piece, row } -- one of the five gear
   *                 stashes (v2.3.2531, gearstash.js; sanitized on apply),
   *                 plus, since v2.3.2536, the piece's detached provenance
   *                 row so the delivered copy can be marked from the ledger
   * Online -> applied to live playerState immediately (+ inbox_delivered
   * notification).  Offline, or online with a full weapon stash -> parked
   * in inbox:<id> and drained at the next join.  Returns 'delivered' |
   * 'inboxed' | 'dup'. */
  /* ═══ v2.3.3294: THE STAMP GOES OUT WITH THE PAYMENT ═══
     This stamped `oplog:<opId>` first, awaited, and paid after -- two writes.
     Under the project's own crash model (an await between two writes is a
     place a restart can land: v2.3.3165, v2.3.3185) a restart between them
     left "paid" on file and nothing paid, and every retry reads the stamp as
     proof: a duel's pot, an arena prize, a market or auction rebuild, the
     daily spin -- 49 callers ride this one function.  Found by the
     architecture review (2026-10-17).  Now everything is READ first (the
     stamp, the mailbox, the gear row's ledger -- the row's grant is
     idempotent, so a retry converges on one), and the stamp is issued in the
     same synchronous run as the payment's own write -- the player's save, or
     the mailbox -- so the two commit together: both, or neither, and a retry
     pays as if for the first time.
     And the stamp alone never kept two calls with ONE opId apart: both read
     "not seen" before either wrote it.  A call already running for an opId
     answers 'dup' to the second (in memory; a restart has nothing running). */
  async _creditPlayer(playerId, entry) {
    const opId = entry && entry.opId;
    if (opId) {
      if (!this._opInFlight) this._opInFlight = new Set();
      if (this._opInFlight.has(opId)) return 'dup';
      this._opInFlight.add(opId);
    }
    try {
      return await this._creditPlayerOnce(playerId, entry);
    } finally {
      if (opId) this._opInFlight.delete(opId);
    }
  },

  /* ═══ v2.3.3294: A SWAP'S CREDITS IN THE SAME WRITE AS ITS DEBITS ═══
     A trade debited both sides and saved them, then paid each side with an
     awaited _creditPlayer of its own: a restart in between (every server
     merge restarts the room) took what each had given and paid neither, and
     a trade lives in memory, so nothing ever came back for it.  The input
     gate kept other players out of the middle of the trade, but it never
     made its writes one (the architecture review, 2026-10-17).
     For a swap whose sides are both in the room -- they just accepted or
     confirmed -- the caller debits in memory and calls this in the SAME
     synchronous run: each credit is applied to its player's live state, and
     every player in `saves` and every recipient is saved and every credit's
     opId stamped before the first await, so the debits, the credits and the
     stamps commit as ONE batch.  The trade happened, or it did not.
     Returns the promise of those writes; or null with NOTHING done when a
     recipient is not in the room, or a credit is a kind that might not land
     now (only gold and stackable items always do) -- the caller then credits
     one by one through _creditPlayer, as before. */
  _creditLiveTogether(credits, saves) {
    const list = Array.isArray(credits) ? credits : [];
    for (const c of list) {
      if (!c || !c.entry || !this.playerState[c.pid]) return null;
      if (c.entry.kind !== 'gold' && c.entry.kind !== 'item') return null;
    }
    const touched = new Set(Array.isArray(saves) ? saves : []);
    const byPid = new Map();
    for (const c of list) {
      this._applyCreditToPs(this.playerState[c.pid], c.entry, c.pid);
      touched.add(c.pid);
      if (!byPid.has(c.pid)) byPid.set(c.pid, []);
      byPid.get(c.pid).push(c.entry);
    }
    const writes = [];
    for (const pid of touched) {
      const ps = this.playerState[pid];
      if (ps) writes.push(this._saveRpg(pid, ps));
    }
    for (const c of list) writes.push(this._opStamp(c.entry.opId));
    for (const pid of touched) this._queuePlayerStateFlush(pid);
    for (const [pid, entries] of byPid) this._sendInboxDelivered(pid, entries, 0);
    return Promise.all(writes);
  },

  async _creditPlayerOnce(playerId, entry) {
    if (await this._opSeen(entry.opId)) return 'dup';
    /* ═══ v2.3.2539: THE ROW ONLY LANDS IF THE PIECE DOES ═══
       v2.3.2536 granted the provenance row FIRST and unconditionally, on
       the argument that an offline recipient has no output gate holding a
       message for them.  That argument is right about durability and wrong
       about ordering: `_applyCreditToPs` also declines when the target
       stash is at GEAR_STASH_CAP, and that happens while the player is
       ONLINE -- so the ledger claimed they held a piece that was sitting in
       their inbox, and they could sell a rebuilt copy of it and then
       receive the real one on reconnect.  Two pairs of greaves.  (Review of
       #650, reproduced against a real GameRoom.)

       So the row is granted only when the piece will actually land, and
       otherwise travels INSIDE the durable inbox entry -- which satisfies
       the offline case for the same reason the entry itself does, and is
       granted by the drain at the moment the piece is really applied.
       A storage await holds the input gate closed (rule 9), so nothing
       interleaves between this and the commit below. */
    const ps = this.playerState[playerId];
    const _fits = entry.kind !== 'gear' || !!(ps && this._gearCreditFits(ps, entry));
    if (_fits) await this._creditGearRow(playerId, entry);
    if (ps && _fits && this._applyCreditToPs(ps, entry, playerId)) {
      /* v2.3.3294: the save and the stamp in ONE synchronous run (above) */
      this._saveRpg(playerId, ps);
      const stamped = this._opStamp(entry.opId);
      this._queuePlayerStateFlush(playerId);
      this._sendInboxDelivered(playerId, [entry], 0);
      await stamped;
      return 'delivered';
    }
    /* v2.3.3294: the mailbox and the stamp in one write (_inboxAppend) */
    await this._inboxAppend(playerId, entry, entry.opId);
    /* Parked: the gate has to know this id is mail, not property, for as
       long as it sits there (gearprov.js _gearSellable, reason 'in_mail'). */
    this._gearCreditMail(playerId, entry, true);
    return 'inboxed';
  },

  /* v2.3.2539: would a gear credit fit right now?  Mirrors the capacity
     test in _applyCreditToPs's gear branch so the caller can decide whether
     to grant the row BEFORE applying -- the two must agree, which is why
     this reads the same cap from the same place rather than restating it. */
  _gearCreditFits(ps, entry) {
    if (!ps || !entry || entry.kind !== 'gear') return true;
    const p = entry.payload || {};
    if (!isGearStashField(p.field)) return true;   /* malformed: "fits", so it is consumed and dropped */
    const list = ps[p.field];
    return !Array.isArray(list) || list.length < GEAR_STASH_CAP;
  },

  /* Mark / unmark a parked gear entry's id in the pending-mail set. */
  _gearCreditMail(playerId, entry, on) {
    if (!entry || entry.kind !== 'gear') return;
    const row = entry.payload && entry.payload.row;
    if (row && row.id) this._gearProvMailMark(playerId, row.id, on);
  },

  // Apply one credit entry to a live playerState.  Returns false ONLY
  // when the entry must stay queued (weapon + full stash -- _saveRpg
  // truncates the stash at cap, so pushing past it would silently
  // DESTROY the weapon).  Malformed entries return true so a bad
  // payload can never wedge the inbox forever.
  /* v2.3.2536: `playerId` is the third argument so the `gear` kind below
     can put the piece's provenance row back into the right player's ledger
     (gearprov.js).  `ps` carries no id of its own and both call sites above
     already hold one. */
  _applyCreditToPs(ps, entry, playerId) {
    const p = entry.payload || {};
    if (entry.kind === 'gold') {
      ps.coins = Math.max(0, (ps.coins || 0) + Math.max(0, Math.floor(p.amount || 0)));
      /* v2.3.3481: a prize may carry ACHIEVEMENT POINTS with its gold (the
         arena's champion, gladiator.js ARENA.CHAMPION_AP) -- added here, in
         the same apply as the gold, so the points are paid exactly when the
         gold is: once, live or from the mail at the next join.  Only a
         server-made credit ever carries `ap` (no client message builds one).
         v2.3.3527: no credit is made with it any more -- the arena's points
         are the Gladiator achievement's (`achv` below) -- but one waiting in
         a mailbox from v2.3.3481 is an arena crown: it goes through that
         achievement, so it pays once a character like a new one (and its
         gold, whatever becomes of the points). */
      const ap = Math.max(0, Math.floor(Number(p.ap) || 0));
      /* ═══ v2.3.3488 (#1026): ...ONCE A CHARACTER, WHEN THE CREDIT SAYS SO ═══
         The owner, on the arena's 500 AP on every win (two accounts in a
         2-player bracket could farm them): "I don't want anyone exploiting
         the achievement points from it".  A credit carrying `apOnce` (a name
         in AP_ONCE) pays its points only if this character has never been
         paid them under that name, and marks it -- here, in the same apply
         as the gold, so a mailed prize decides at the drain, and the mark is
         saved with the gold in the one write that follows (`ps.apOnce`,
         persistence.js).  The gold is paid either way.
         v2.3.3527: an ARENA credit still carrying points (v2.3.3481's, or
         v2.3.3488's with `apOnce`, waiting in a mailbox) pays them through
         the Gladiator achievement above all, which honours the same mark
         and sets it when it pays (achievements.js AP_ONCE_OF): once a
         character, by either road.  A record that cannot be read pays none
         (both roads fail closed: the points are the cheaper loss). */
      const once = (typeof p.apOnce === 'string' && AP_ONCE.has(p.apOnce)) ? p.apOnce : null;
      if (ap && entry.source === 'arena' && this._achvFromMail) {
        try { this._achvFromMail(playerId, ps, 'gladiator'); } catch (e) { /* the gold stands */ }
      } else if (ap && once) {
        /* a character whose marks could not be read pays none and marks
           nothing (fail closed: the points are the cheaper loss) */
        if (!ps._apOnceFailed) {
          if (!ps.apOnce || typeof ps.apOnce !== 'object') ps.apOnce = {};
          if (!ps.apOnce[once]) {
            ps.apOnce[once] = 1;
            ps._apOnceDirty = true;   /* _saveRpg writes aponce:<pid> with the points */
            ps.achievementPoints = (ps.achievementPoints || 0) + ap;
          }
        }
      } else if (ap) ps.achievementPoints = (ps.achievementPoints || 0) + ap;
      return true;
    }
    /* ═══ v2.3.3527: AN ACHIEVEMENT BY THE MAIL (achievements.js) ═══
       The arena's crown (gladiator.js).  FALSE -- the entry STAYS QUEUED --
       while the player's achievements record is not loaded or is locked, the
       pet's rule below: whether the points are owed is that record's to say.
       The join loads it BEFORE it drains the mail (join.js). */
    if (entry.kind === 'achv') {
      return this._achvFromMail ? this._achvFromMail(playerId, ps, typeof p.id === 'string' ? p.id : '') : true;
    }
    if (entry.kind === 'item') {
      const k = typeof p.invKey === 'string' ? p.invKey : '';
      if (!k) return true;
      /* v2.3.1971: never credit onto an Object.prototype name.  Producers
         all pass server-chosen keys today, but this is the one funnel every
         payout in the game goes through -- if a future producer ever forwards
         a client key, the corruption lands in a stranger's saved blob, not in
         the caller.  `_invCount` also heals an already-junk count to 0 rather
         than concatenating onto it. */
      if (Object.prototype.hasOwnProperty.call(Object.prototype, k)) return true;
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[k] = this._invCount(ps, k) + Math.max(1, Math.floor(p.count || 1));
      return true;
    }
    if (entry.kind === 'weapon') {
      const w = this._sanitizeWeapon(p.weapon);
      if (!w) return true;
      /* v2.3.3895: a sword in the post (a market refund, an Auction House sale,
         a trade, No man's land's loot) arrives a greatsword: the post is drained
         AFTER the join's migration (migrations.js v19), so this is the boundary
         heal the migrations spec asks of a writer the migration never sees.  It
         rides this credit's own save -- no write of its own. */
      if (!(this._swordConvertOff && this._swordConvertOff())) swordToGreatsword(w);
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return false;
      ps.weaponStash.push(w);
      return true;
    }
    /* ═══ v2.3.2546: ONE GEAR APPLY, TWO JOBS ═══
       #643 landed its own gear credit (`_stGearApplyCredit`, storegear.js)
       while this lane was in review, and both branches wrote a
       `kind === 'gear'` arm here.  They are not rivals -- they do
       different halves, so this composes them rather than picking one:

         - #643's apply knows WHICH SANITIZER a piece needs, which depends
           on the list it belongs to (an amulet reaches the authoritative
           damage roll and goes through _sanitizeAmulet; a cosmetic is a
           {slot, gearId} pair).  It also does the cap check and the push.
           Keeping it means this funnel does not grow a second, thinner
           copy of that table.
         - This lane adds the mark, DERIVED from the provenance ledger
           rather than asserted: on a verified row the landed piece is
           rebuilt from the row's own stored copy (rule 16 -- the server's
           own copy by reference), so a producer cannot put inflated stats
           beside a genuine id.

       Rule 3's contract is #643's and is unchanged: a FULL stash returns
       false so the entry stays QUEUED, because _saveRpg caps these lists
       and pushing past the cap would silently destroy the piece.

       v2.3.2552: that note used to say `_sv` and `prov`/`gid` were TWO
       provenance marks on the same pieces, left side by side because
       retiring one was a design call. The owner made it: `_sv` is retired
       and the ledger is the only mark. #643's apply still does the
       sanitizer/cap/push half; it simply no longer stamps anything. */
    /* ═══ v2.3.3122: A PET (pet trading, docs/PET-TRAPPING-PLAN.md Phase 3) ═══
       Into the recipient's pets record (petbook.js _petbookGive).  FALSE --
       the entry STAYS QUEUED -- when the record is not loaded or the
       collection is full, exactly the weapon stash's rule 3: an unknown or
       refused kind used to be returned `true` and so silently destroyed
       (the plan's "Today an unknown kind is silently destroyed").  The join
       loads the record BEFORE it drains the mail (join.js), so a pet
       waiting there lands the moment there is room. */
    if (entry.kind === 'pet') {
      return this._petbookGive(playerId, p.pet, typeof p.from === 'string' ? p.from : '', Date.now()) !== false;
    }
    if (entry.kind === 'gear') {
      const gField = p && p.field;
      const beforeN = Array.isArray(ps[gField]) ? ps[gField].length : 0;
      if (!this._stGearApplyCredit(ps, p)) return false;   /* full stash: stay queued */
      const gList = ps[gField];
      const landed = (Array.isArray(gList) && gList.length > beforeN) ? gList[gList.length - 1] : null;
      if (landed) this._gearProvMarkDelivered(playerId, p, landed);
      return true;
    }
    return true;
  },

  // Append to the offline inbox.  At the soft cap, gold and item
  // entries merge losslessly into an existing same-kind entry (gold:
  // amounts sum; items: counts sum per invKey) so bulk payouts can't
  // grow the box unboundedly.  Weapons can't merge; they still append
  // (dropping value is worse than storage growth, and the producers --
  // market listings, trades -- are themselves capped per player).
  /* ═══ v2.3.3294: ONE MAILBOX WRITE AT A TIME, AND THE STAMP WITH IT ═══
     This read the box, added the entry and wrote it back.  Two credits to
     one player that were not awaited one after the other (No man's land's
     loot to a killer whose stash is full, nomansland.js) each read the box
     before either wrote it, and each wrote its own copy: all but the last
     entry lost, every one of them stamped paid.  Reproduced on the real
     _creditPlayer (the architecture review, 2026-10-17): five gold credits
     to an offline player left one.  Now every read-and-write of a player's
     box -- this, and the join's drain -- waits its turn (_inboxSerial), and
     `opId`, when given, is stamped in the SAME synchronous run as the box's
     write (_creditPlayer's header). */
  async _inboxAppend(playerId, entry, opId) {
    const key = 'inbox:' + playerId;
    return this._inboxSerial(key, async () => {
      const box = (await this.state.storage.get(key)) || [];
      let merged = false;
      if (box.length >= 200) {
        const p = entry.payload || {};
        if (entry.kind === 'gold') {
          const g = box.find((e) => e.kind === 'gold');
          if (g) {
            g.payload.amount = (g.payload.amount || 0) + Math.max(0, Math.floor(p.amount || 0));
            g.note = 'merged payouts';
            merged = true;
          }
        }
        if (!merged && entry.kind === 'item' && typeof p.invKey === 'string') {
          const it = box.find((e) => e.kind === 'item' && e.payload && e.payload.invKey === p.invKey);
          if (it) {
            it.payload.count = (it.payload.count || 1) + Math.max(1, Math.floor(p.count || 1));
            it.note = 'merged payouts';
            merged = true;
          }
        }
      }
      if (!merged) box.push({ opId: entry.opId, ts: Date.now(), source: entry.source || '', kind: entry.kind, payload: entry.payload, note: entry.note || '' });
      const writes = [this.state.storage.put(key, box)];
      if (opId) writes.push(this._opStamp(opId));
      await Promise.all(writes);
    });
  },

  /* v2.3.3294: run `fn` after every read-and-write of mailbox `key` started
     before it has finished, whatever became of them.  In memory only: a
     restart has nothing running.  The tail is dropped once it is the last. */
  _inboxSerial(key, fn) {
    if (!this._inboxChains) this._inboxChains = new Map();
    const prev = this._inboxChains.get(key) || Promise.resolve();
    const run = prev.then(() => fn(), () => fn());
    const tail = run.then(() => {}, () => {});
    this._inboxChains.set(key, tail);
    tail.then(() => { if (this._inboxChains.get(key) === tail) this._inboxChains.delete(key); });
    return run;
  },

  // Drain the offline inbox into a freshly joined player.  Called from
  // the join handler AFTER the rpg load/bootstrap and BEFORE state_sync,
  // so the first snapshot the client renders already includes the mail.
  // Weapons that don't fit the stash stay queued for a later join.
  async _drainInbox(playerId, ws) {
    try {
      /* v2.3.2438: the oplog prune is NOT here any more -- see
         _opPruneMaybe.  A join must never wait on housekeeping. */
      const key = 'inbox:' + playerId;
      /* v2.3.3294: in its turn with every other write of this box
         (_inboxSerial): a credit appended while the drain was granting a
         gear row was written over by the drain's remainder */
      await this._inboxSerial(key, () => this._drainInboxNow(playerId, ws, key));
    } catch (e) { /* mail must never block a join */ }
  },

  async _drainInboxNow(playerId, ws, key) {
    {
      const box = await this.state.storage.get(key);
      if (!box || !box.length) return;
      const ps = this.playerState[playerId];
      if (!ps) return;
      const delivered = [];
      const remainder = [];
      for (const entry of box) {
        /* v2.3.2539: a parked gear entry carries its row, and the row is
           granted HERE -- at the moment the piece is really applied -- not
           when the credit was first attempted.  Granting is idempotent, so
           a retry converges on one row. */
        const _fits = entry.kind !== 'gear' || this._gearCreditFits(ps, entry);
        if (_fits) await this._creditGearRow(playerId, entry);
        if (_fits && this._applyCreditToPs(ps, entry, playerId)) delivered.push(entry);
        else remainder.push(entry);
      }
      /* Rebuild the pending-mail set from what is STILL queued, so the sell
         gate's 'in_mail' answer is exact after every drain -- including the
         entries this drain has just handed over. */
      for (const e of delivered) this._gearCreditMail(playerId, e, false);
      for (const e of remainder) this._gearCreditMail(playerId, e, true);
      /* v2.3.3185: the player and the mailbox in ONE write.  The box was
         rewritten (or deleted) first, awaited, and the player saved after --
         two writes, so a restart between them took the mail away with its
         gold or goods never saved: the payout was lost.  Saving the player
         first in a write of its own would be no better -- the mail would come
         round again and pay twice.  Both now go out in one synchronous run,
         so they commit together (rule 8). */
      const writes = [];
      if (delivered.length) writes.push(this._saveRpg(playerId, ps));
      writes.push(remainder.length ? this.state.storage.put(key, remainder) : this.state.storage.delete(key));
      await Promise.all(writes);
      if (delivered.length) this._sendInboxDelivered(playerId, delivered, remainder.length, ws);
    }
  },

  /* v2.3.2536: put a credited piece's provenance row into the recipient's
     ledger.  A no-op for every other kind, and for a gear entry with no
     row -- such a piece arrives `legacy`, which is the honest answer for
     gear whose origin cannot be proved, rather than a refusal that would
     strand the delivery. */
  async _creditGearRow(playerId, entry) {
    if (!entry || entry.kind !== 'gear') return;
    const row = entry.payload && entry.payload.row;
    if (!row) return;
    try { await this._gearProvGrantRow(playerId, row); } catch (e) { /* the piece still arrives, legacy */ }
  },

  _sendInboxDelivered(playerId, entries, queued, wsOverride) {
    const ws = wsOverride || this._wsBySessionId(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({
        type: 'inbox_delivered',
        payload: {
          entries: entries.map((e) => ({ kind: e.kind, payload: e.payload, note: e.note || '', source: e.source || '' })),
          queued: queued || 0,
        },
      }));
    } catch (e) { /* dead socket: the credits are already persisted */ }
  },

  /* Escrow debits.  Validate-and-take in one gated event; online players
   * are debited on the LIVE playerState (storage lags it -- mutating the
   * blob for an online player would diverge memory and disk), offline
   * players on the stored blob directly.  A duplicate opId reports
   * { ok: true, dup: true } so settlement retries converge. */
  async _escrowDebitGold(playerId, amount, opId) {
    const amt = Math.floor(amount || 0);
    if (amt <= 0) return { ok: false, reason: 'bad_amount' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    /* ═══ v2.3.3165: THE STAMP AND THE DEBIT ARE ONE WRITE ═══
       The stamp went first, awaited, and the debit was saved after it -- two
       batches.  A worker restart between them (every server merge restarts
       the room) left "paid" in the oplog with the gold never taken, and the
       auction house's rebuild takes that stamp as proof of payment
       (store.js: a buy-now's `store:<id>:pay`, a bid's, an offer's).  Found
       by the overnight economy review with a simulated restart: a 900-gold
       buy settled while the buyer kept his 1,000; an outbid refund paid back
       500 never taken.  Now the debit's own save and the stamp are issued in
       ONE synchronous run (both puts before any await, rule 8's "single
       mutation"), so they commit together: both, or neither and the retry
       debits as if for the first time. */
    if (ps) {
      if ((ps.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
      ps.coins -= amt;
      this._saveRpg(playerId, ps);
      const stamped = this._opStamp(opId);
      this._queuePlayerStateFlush(playerId);
      await stamped;
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (!stored || (stored.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
    stored.coins -= amt;
    const saved = this.state.storage.put('rpg:' + playerId, stored);
    const stampedOff = this._opStamp(opId);
    await saved;
    await stampedOff;
    return { ok: true };
  },

  async _escrowTakeItem(playerId, invKey, count, opId) {
    const k = typeof invKey === 'string' ? invKey : '';
    const c = Math.floor(count || 0);
    if (!k || c <= 0) return { ok: false, reason: 'bad_item' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    // v2.3.1971: own-property counts on both branches (see _invCount) --
    // `(inv.constructor || 0) < c` was false, so this debited NaN.
    /* v2.3.3165: the take and its stamp in one write -- see _escrowDebitGold. */
    if (ps) {
      if (this._invCount(ps, k) < c) return { ok: false, reason: 'insufficient_items' };
      ps.inventory[k] = this._invCount(ps, k) - c;
      if (ps.inventory[k] <= 0) delete ps.inventory[k];
      this._saveRpg(playerId, ps);
      const stamped = this._opStamp(opId);
      this._queuePlayerStateFlush(playerId);
      await stamped;
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (this._invCount(stored, k) < c) return { ok: false, reason: 'insufficient_items' };
    stored.inventory[k] = this._invCount(stored, k) - c;
    if (stored.inventory[k] <= 0) delete stored.inventory[k];
    const saved = this.state.storage.put('rpg:' + playerId, stored);
    const stampedOff = this._opStamp(opId);
    await saved;
    await stampedOff;
    return { ok: true };
  },
};
