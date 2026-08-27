/* ═══ v2.3.2026: THE GOLDEN TICKET AND THE CAPE IT BUYS ═══
 *
 * Owner's live event: a ticket drops from a monster at a low rate, and the
 * player OPENS it in the bag to redeem a cape.  Three tickets exist per event,
 * one per account.  Spec: docs/specs/cape-and-contest.md, and the parallel
 * session's brief (event capes + merch draw).
 *
 * THE TWO-STEP IS THE POINT.  The drop is the moment; the open is the reward.
 * It is deliberately not a direct cape drop.
 *
 * ── WHY THE CLAIM IS SYNCHRONOUS, AND WHY THAT IS THE WHOLE DESIGN ──
 * "First three" is the part that goes publicly, embarrassingly wrong if it is
 * written the obvious way:
 *
 *     const led = await storage.get(KEY);      // two kills both read 2
 *     if (led.issued.length < 3) { ... }       // both pass
 *     await storage.put(KEY, led);             // four winners, one argument
 *
 * `await storage.get` can yield, so two kills landing in the same turn can
 * interleave across it.  The DO is single-threaded but it is not
 * single-*task*, and that distinction is exactly what this bug lives in.
 * There is no blockConcurrencyWhile anywhere in this server, so the fix is to
 * make the decision itself synchronous: the ledger is loaded ONCE, cached on
 * the room, and every claim is a plain check-and-mutate on that object with no
 * await inside it.  JavaScript cannot interleave a synchronous block, so the
 * count cannot be read stale.  The storage write happens after the decision
 * and does not gate it.
 *
 * If the DO restarts, the cache reloads from storage and the ledger is the
 * durable record, so a restart mid-event cannot re-issue a ticket.
 *
 * ── AND WHY THE CLIENT CANNOT OPEN A TICKET BY ITSELF ──
 * cooking.js:71 records the firemaking incident (v2.3.1702): the client
 * deleted a log locally, sent nothing, and the worker's next player_state echo
 * handed it back -- one log lit unlimited campfires.  A ticket "opened"
 * client-side is the same bug wearing a hat: the player keeps the ticket and
 * redeems it again, and three tickets become five capes, live, during the
 * event.  So the client sends `cape_redeem` and waits; the consume, the grant
 * and the echo are all here.
 */

/* One record per cape: the cap, who holds a ticket, and who has redeemed.
   Count and winners in one place, so they cannot disagree. */
export const CAPE_LEDGER_KEY = (capeId) => `capegrant:${capeId}`;

/* The inventory key a ticket occupies.  Prefixed so the redeem handler can
   validate it by prefix before touching ps.inventory -- the same proto-safety
   guard _handleEatRequest uses (a plain {} no-ops on '__proto__'). */
export const TICKET_PREFIX = 'goldticket_';

export const EVENT_CAPES = {
  /* id -> the cape granted, its ticket, and how many exist. */
  crimson: { cape: 'crimson', ticket: `${TICKET_PREFIX}crimson`, cap: 3 },
};

export const eventCapeMethods = {
  /* The ledger, loaded once and then held.  Every read after the first is
     synchronous, which is what makes the claim below safe. */
  async _capeLedger(capeId) {
    if (!this._capeLedgers) this._capeLedgers = Object.create(null); /* proto-ok: keys are our own ids */
    if (this._capeLedgers[capeId]) return this._capeLedgers[capeId];
    const stored = await this.state.storage.get(CAPE_LEDGER_KEY(capeId));
    const led = (stored && typeof stored === 'object')
      ? { issued: Array.isArray(stored.issued) ? stored.issued : [],
          redeemed: Array.isArray(stored.redeemed) ? stored.redeemed : [] }
      : { issued: [], redeemed: [] };
    this._capeLedgers[capeId] = led;
    return led;
  },

  _capeLedgerSave(capeId) {
    const led = this._capeLedgers && this._capeLedgers[capeId];
    if (!led) return;
    /* Unawaited on purpose: the DECISION was already made synchronously above,
       so this write is a record of it rather than a gate on it.  Matching the
       unawaited-with-catch shape tick.js uses for the same reason. */
    try {
      const p = this.state.storage.put(CAPE_LEDGER_KEY(capeId), led);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* storage unavailable: the in-memory ledger still holds the cap */ }
  },

  /** Is the event open?  ON BY DEFAULT since v2.3.2028, with a kill switch.
   *
   *  It shipped the other way round -- off until an `event_capes` flag was
   *  set -- and that was wrong for this game.  Flipping that flag needs the
   *  ADMIN_KEY secret and a curl command against the live worker, which is a
   *  real barrier for an owner who does not work in a terminal, to buy an
   *  ability (start the event to the minute, from a phone, without a deploy)
   *  that a five-person demo does not need.  The owner said so plainly: the
   *  drop should be live from the build.  A prize nobody can switch on is
   *  not scarce, it is absent.
   *
   *  So it now matches how every other switchable system here already works:
   *  on by default, off via `disable_*` (disable_jackpot cadence.js:123,
   *  disable_dungeons dungeon.js:226, disable_threats threat.js:80,
   *  disable_weapon_drops index.js:3263).  The kill switch still needs the
   *  admin key -- but needing the key to STOP something is the safe
   *  direction, and the cap of three ends the event on its own anyway.
   *
   *  _flagOn (liveops.js), not a hand-rolled read: the cache is `_liveFlags`
   *  and `this.liveflags` is nothing at all, so a hand-rolled version was
   *  permanently false and the drop would never have fired at all. */
  _capeEventOpen() {
    if (typeof this._flagOn !== 'function') return true;   /* no live-ops: still live */
    return !this._flagOn('disable_event_capes');
  },

  /** Roll for a ticket on a monster kill.  Returns the ticket key if one was
   *  awarded, else null.  MUST be called with the ledger already loaded. */
  _claimCapeTicket(capeId, playerId, ps, rollFn) {
    const def = EVENT_CAPES[capeId];
    if (!def || !playerId || !ps) return null;
    const led = this._capeLedgers && this._capeLedgers[capeId];
    if (!led) return null;                       /* not loaded: never guess */
    /* ── the synchronous claim ── nothing below may await. */
    if (led.issued.length >= def.cap) return null;
    if (led.issued.indexOf(playerId) >= 0) return null;      /* one per account */
    if (led.redeemed.indexOf(playerId) >= 0) return null;
    const roll = (typeof rollFn === 'function') ? rollFn() : Math.random();
    /* v2.3.2027: the rate is a live-ops NUMBER, clamped at read.  The brief
       asks for it to be tuned against the event WINDOW rather than against
       forever -- scarcity is already guaranteed by the cap of three, and a
       rate so low nobody finds one during the session means the announced
       hook never lands.  A flag means that tuning does not need a deploy,
       which is the difference between adjusting mid-event and not adjusting.
       It is also what lets the scenario drive the real drop end to end
       instead of a test-only back door. */
    const rate = (typeof this._flagNum === 'function')
      ? this._flagNum('event_cape_rate', 1 / 200, 0, 1)
      : 1 / 200;
    if (roll >= rate) return null;
    led.issued.push(playerId);
    if (!ps.inventory) ps.inventory = {};
    ps.inventory[def.ticket] = (ps.inventory[def.ticket] || 0) + 1;
    /* ── end of the synchronous claim ── */
    this._capeLedgerSave(capeId);
    return def.ticket;
  },

  /** Which cape a ticket key buys, or null.  Prefix-validated before it is
   *  ever used as an object key. */
  _capeForTicket(invKey) {
    if (typeof invKey !== 'string' || !invKey.startsWith(TICKET_PREFIX)) return null;
    for (const id of Object.keys(EVENT_CAPES)) {
      if (EVENT_CAPES[id].ticket === invKey) return id;
    }
    return null;
  },

  /** Which cape this player owns, or null.  THE LEDGER IS THE OWNERSHIP
   *  RECORD, and that is a storage rule rather than a preference: rule 1 of
   *  ARCHITECTURE-HANDOFF says never add a field to the rpg blob, because
   *  _saveRpg rewrites `rpg:<playerId>` from a fixed field list and silently
   *  drops anything foreign.  A `ps._capes` array would have looked like it
   *  worked for exactly one session and vanished on the next save.  The
   *  ledger already had to record who redeemed, so ownership reads from the
   *  one record instead of a second copy that could disagree with it. */
  _capeOwnedBy(playerId) {
    if (!playerId || !this._capeLedgers) return null;
    for (const id of Object.keys(EVENT_CAPES)) {
      const led = this._capeLedgers[id];
      if (led && led.redeemed.indexOf(playerId) >= 0) return EVENT_CAPES[id].cape;
    }
    return null;
  },

  /** Warm every ledger.  Called once on room start so _capeOwnedBy and the
   *  synchronous claim both have something to read. */
  async _capeLedgersLoad() {
    for (const id of Object.keys(EVENT_CAPES)) await this._capeLedger(id);
  },

  /** Overwrite whatever the client claimed about its cape with what the
   *  ledger says.  Same shape and same reason as _clanStampTag (clans.js):
   *  the relay used to blind-merge client-supplied cosmetics, and that was
   *  the tag-FORGERY hole.  A cape is a contest prize, so a client that can
   *  assert one can award itself the prize -- and the old wire made this
   *  worse than usual by sending a BOOLEAN, so every cape looked identical
   *  and there was nothing to forge carefully.
   *
   *  Deploy-order safe in both directions (rule 19): an old client sends
   *  `cape: true` and has it replaced by an id or dropped; an old client
   *  RECEIVING an id still sees a truthy value where it expected `true`, and
   *  a new client receiving `true` from an old worker finds no texture for it
   *  and simply draws nothing. */
  _capeStamp(playerId, data) {
    if (!data) return;
    const owned = this._capeOwnedBy(playerId);
    if (owned) data.cape = owned;
    else if (data.cape) delete data.cape;      /* claimed one, owns none */
  },

  /** cape_redeem: consume one ticket, grant the cape.  Shaped after
   *  _handleEatRequest (cooking.js) -- validate ownership, consume one,
   *  persist, echo -- because it is the same kind of operation. */
  async _handleCapeRedeem(session, payload) {
    if (!session || !session.id) return;
    const { invKey, opId } = payload || {};
    const capeId = this._capeForTicket(invKey);
    if (!capeId) return;                                  /* not a ticket key */
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    /* Idempotency: a retried redeem on a flaky phone must not grant twice. */
    if (opId && typeof opId === 'string' && await this._opSeen('capered:' + opId)) return;
    /* precheck's proto-safety heuristic flags this plain {} -- it is safe here
       and the reason is the LINE ORDER above, not the object: _capeForTicket
       has already rejected invKey unless it exactly equals a ticket string in
       EVENT_CAPES, so '__proto__' returns null and we are gone before this
       point.  Keep the validation first if this is ever reordered. */
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[invKey] || 0) <= 0) return;         /* ownership */
    const led = await this._capeLedger(capeId);
    if (led.redeemed.indexOf(session.id) >= 0) return;     /* already owns it */
    /* ── synchronous again: consume and grant together, or not at all ── */
    if ((ps.inventory[invKey] || 0) <= 0) return;          /* re-check after the await */
    ps.inventory[invKey] -= 1;
    if (ps.inventory[invKey] <= 0) delete ps.inventory[invKey];
    led.redeemed.push(session.id);
    /* ── end ── */
    this._capeLedgerSave(capeId);
    if (opId && typeof opId === 'string') await this._opStamp('capered:' + opId);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },
};
