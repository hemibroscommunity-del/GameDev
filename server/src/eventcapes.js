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

/* ═══ v2.3.2029: THE SWITCH IS THIS LINE ═══
 *
 * false = no ticket can drop.  true = the contest is running.
 *
 * Owner's call, and it is the right one for how they actually work: they do
 * not want to run a curl command against the production worker to start their
 * own event, so the start button is a one-line code change that goes live by
 * merging a PR.  Flip this to true, merge, done.
 *
 * THE COST, so nobody is surprised by it on the day: merging deploys the
 * worker, which briefly disconnects everyone online and cold-starts the room
 * (CLAUDE.md, Deployment).  Merge the enable BEFORE players gather, not while
 * they are standing around waiting for it.
 *
 * Everything else about the contest is unchanged and needs no switch: the cap
 * of three ends it on its own, tickets already won never expire, and
 * disable_event_capes remains as a no-deploy emergency stop for an operator
 * who has the admin key. */
/* v2.3.2096: ON. Owner, mid-demo-testing: "Time to switch on the cape drop
   odds." The odds themselves needed no change at the time -- `event_cape_rate`
   below is a live-ops number, tunable without a deploy (v2.3.2097 then raised
   its default to 1/5 on the owner's call).
   This flag is the thing that was off, and it is what the note above says to
   flip. The cap of three and the one-per-account rule are untouched, so the
   contest still ends on its own. */
export const EVENT_LIVE = true;

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

  /** Is the event open?  EVENT_LIVE (above) AND not emergency-stopped.
   *
   *  Three versions, and the shape of the argument is worth keeping because
   *  the obvious answer was wrong twice:
   *
   *  v2.3.2026 shipped it as an opt-in live-ops flag.  Wrong, because
   *  flipping that flag needs the ADMIN_KEY secret and a curl command against
   *  the production worker -- a real barrier for an owner who does not work
   *  in a terminal, to buy an ability (start to the minute, from a phone, no
   *  deploy) that a five-person demo does not need.
   *
   *  v2.3.2028 made it live-by-default with a `disable_*` kill switch,
   *  matching disable_jackpot (cadence.js), disable_dungeons (dungeon.js),
   *  disable_threats (threat.js), disable_weapon_drops (index.js).  Also
   *  wrong, but only in timing: it meant the contest started the moment it
   *  merged, and the owner wants to choose the moment.
   *
   *  v2.3.2029 splits the two things that were being conflated.  WHETHER the
   *  contest runs is EVENT_LIVE, a source constant the owner starts by
   *  merging a PR -- no key, no terminal.  Stopping it EARLY once running is
   *  still disable_event_capes, which needs the key but needs no deploy.  The
   *  convention above governs the emergency stop, which is what it was always
   *  for; it was never meant to be the start button.
   *
   *  _flagOn (liveops.js), not a hand-rolled read: the cache is `_liveFlags`
   *  and `this.liveflags` is nothing at all, so a hand-rolled version was
   *  permanently false and the drop would never have fired at all. */
  _capeEventOpen() {
    /* `this._eventLive` overrides the shipped constant.  It exists so the
       suite can drive BOTH branches -- a module constant cannot be stubbed,
       and a test that can only ever see the shipped value would assert
       nothing about the other one, which is the branch that matters on the
       day.  It is a room-instance field: no wire payload assigns onto the
       room (no Object.assign(this, ...) anywhere in server/src), so a client
       cannot reach it. */
    const live = (typeof this._eventLive === 'boolean') ? this._eventLive : EVENT_LIVE;
    if (!live) return false;
    if (typeof this._flagOn !== 'function') return true;   /* no live-ops: the constant decides */
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
    /* v2.3.2097: 1/100 -> 1/5. Owner, with the demo starting: "Just update it
       to a 1 in 5 chance. First 3 get it."

       The cap is what ends the contest, not the rate -- three tickets exist,
       one per account, and `led.issued.length >= def.cap` above is checked
       before the roll. So a generous rate does not mean more capes; it means
       the three that exist are found in a demo session instead of over a
       week of play. That is the trade the owner is making deliberately.

       Still read through the live-ops flag first, so it can be tuned again
       mid-event without a deploy -- this only moves the DEFAULT the flag
       falls back to. */
    const rate = (typeof this._flagNum === 'function')
      ? this._flagNum('event_cape_rate', 1 / 5, 0, 1)
      : 1 / 5;
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

  /** ═══ v2.3.2034: THE LEDGER, VISIBLE AND RESETTABLE ═══
   *
   *  The owner asked whether QA testing had eaten any of the three tickets.
   *  It had not -- the suites use an in-memory Map and a throwaway
   *  --persist-to dir -- but answering it exposed something worse: THE OWNER
   *  HAD NO WAY TO CHECK. The ledger is the one record that decides who won,
   *  and nothing could read it. That is the write-only-field problem the
   *  operator toolkit exists to fix (admin.js), applied to the contest.
   *
   *  It also has a live use beyond reassurance: v2.3.2028 ran the contest in
   *  production for about ten minutes before v2.3.2029 turned it off, so a
   *  real ticket could have been issued to a real player in that window. With
   *  no reader, "did that happen?" was unanswerable.
   *
   *  GET    /api/admin/capes  -> the ledger for every cape
   *  DELETE /api/admin/capes?cape=crimson&confirm=yes -> wipe that ledger
   *
   *  The delete is deliberately awkward. It hands back tickets that were
   *  legitimately won, so it is for one situation only -- clearing an
   *  accidental issuance BEFORE the contest starts -- and requires naming the
   *  cape and passing confirm=yes so it cannot be a typo away from voiding a
   *  live contest. It is written to admin_log like every other operator act. */
  async _capeAdminRoute(request, url, path, json) {
    if (path !== '/capes') return null;

    if (request.method === 'GET') {
      await this._capeLedgersLoad();
      /* Plain {} is safe here and the reason is the SOURCE of the keys: they
         come from Object.keys(EVENT_CAPES), our own constants, never from the
         request.  Contrast the DELETE below, where the cape name IS supplied
         by the caller and needs the hasOwnProperty guard. */
      const out = {};
      for (const id of Object.keys(EVENT_CAPES)) {
        const def = EVENT_CAPES[id];
        const led = (this._capeLedgers && this._capeLedgers[id]) || { issued: [], redeemed: [] };
        out[id] = {
          cap: def.cap,
          ticket: def.ticket,
          issued: led.issued.slice(),
          redeemed: led.redeemed.slice(),
          remaining: Math.max(0, def.cap - led.issued.length),
        };
      }
      /* `live` answers the question the owner actually asks -- "is it running
         right now?" -- without making them read a constant in a source file. */
      return json({ ok: true, live: this._capeEventOpen(), capes: out });
    }

    if (request.method === 'DELETE') {
      const capeId = url.searchParams.get('cape');
      /* hasOwnProperty, NOT `!EVENT_CAPES[capeId]`.  EVENT_CAPES is a plain
         object literal, so `EVENT_CAPES['__proto__']` is Object.prototype --
         TRUTHY -- and the obvious guard waves `?cape=__proto__` straight
         through to a reset of a cape that does not exist.  precheck's
         proto-safety heuristic flagged this block and it was right: the
         recurring incident (duel.away v2.3.1175, party meta v2.3.1185, amulet
         tiers v2.3.1192) is this exact shape. */
      if (!capeId || !Object.prototype.hasOwnProperty.call(EVENT_CAPES, capeId)) {
        return json({ ok: false, error: 'name a real cape: ?cape=' + Object.keys(EVENT_CAPES).join('|') }, 400);
      }
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, error: 'this voids tickets people may have won — add &confirm=yes' }, 400);
      }
      const before = (this._capeLedgers && this._capeLedgers[capeId]) || { issued: [], redeemed: [] };
      const cleared = { issued: before.issued.slice(), redeemed: before.redeemed.slice() };
      const fresh = { issued: [], redeemed: [] };
      if (!this._capeLedgers) this._capeLedgers = Object.create(null);
      this._capeLedgers[capeId] = fresh;
      await this.state.storage.put(CAPE_LEDGER_KEY(capeId), fresh);
      await this._adminLog({ op: 'cape_ledger_reset', cape: capeId, cleared });
      return json({ ok: true, cape: capeId, cleared });
    }

    return null;
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
