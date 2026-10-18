/* ═══ v2.3.1150: LIVE-OPS RAIL (spec: docs/specs/liveops.md; owner
 * guide: docs/OPERATIONS.md) ═══
 *
 * Config-over-deploy for a solo operator.  Until now every capability
 * was baked into the worker at deploy time and the owner had no voice
 * in-game.  This mixin adds three primitives on the admin rail
 * (auth/routing live in admin.js — these routes hook into _adminFetch):
 *
 *   FLAGS   `liveflags` storage map, set via /api/admin/flags.
 *           - `disable_<x>` kill switches checked server-side (jackpot,
 *             weapon drops, dungeons, threats) — turn a broken system
 *             OFF live, no deploy, no player disconnect.
 *           - value flags (`xp_mult` [1,4]) — the "2x weekend" primitive.
 *           - the whole map is ALSO spread over the state_sync caps
 *             literal (flags last, so `jackpot:false` overrides the
 *             baked `true`).  WARNING: overriding a cap to false means
 *             "server hasn't claimed the job" and can re-enable legacy
 *             client-side fallback paths for some systems — the
 *             `disable_*` server switches are the normal lever; cap
 *             overrides are the emergency lever (per-cap safety table
 *             in the spec).
 *   ANNOUNCE  POST /api/admin/announce → immediate `server_announce`
 *           broadcast (a PRIVILEGED type — riding the un-privileged
 *           'chat' relay would make official messages forgeable by any
 *           client).  `sticky:true` also stores `motd`, delivered on
 *           every join until deleted.  Use before worker deploys
 *           ("server restarting in 2 minutes").
 *   METRICS once-daily `metrics:<yyyymmdd>` economy snapshot (ring of
 *           30) written from the tick's housekeeping slot, a page at a
 *           time (v2.3.2438; every table paged since v2.3.3368);
 *           /api/admin/economy surfaces the last 7 with a day-over-day
 *           delta and an `alert` when |Δ totalGold| > 25% — the solo
 *           owner's dupe-exploit tripwire.
 *
 * Caching: `this._liveFlags` is a lazy read-through cache; admin writes
 * are write-through, so it never goes stale within a DO lifetime, and a
 * deploy (memory wipe) simply re-reads.  `_flagOn`/`_flagNum` are
 * SYNCHRONOUS — hot paths never touch storage; the join handler warms
 * the cache before any gated code can run.
 *
 * STORAGE KEYS (registered in ARCHITECTURE-HANDOFF rule 2):
 *   liveflags            {name: boolean|number}
 *   motd                 {text, ts}
 *   metrics:<yyyymmdd>   {totalGold, playerBlobs, escrowedGold,
 *                         pendingEntries, ts}                        */

/* v2.3.2438: the daily metric walks the player table one page per tick
   slot (see _metricsMaybe).  A throw waits RETRY_MS before trying again
   instead of every slot. */
export const METRICS = {
  PAGE: 200,
  /* v2.3.3368: the mailboxes are paged too, fewer to a page: a box is a list
     of up to ~200 entries (gold and items merge past that, weapons do not --
     inbox.js _inboxAppend), where a player record is one */
  BOX_PAGE: 50,
  SLOT_MS: 3000,
  RETRY_MS: 3600000,
};

/* ═══ v2.3.3368: THE GOLD A MARKET ORDER HOLDS ═══
   An order carries `type` ('buy' or 'sell'), `price` and `item` (market.js
   _mktPlaceOrder): a buy takes its price from the buyer when it is placed
   and holds it until it fills, is cancelled or expires; a sell holds a
   weapon, no gold.  The daily record and /economy read `o.side` and
   `o.qty`, which no order has, so their escrowedGold was 0 every day since
   it was written (found by the architecture review).  Gold held anywhere
   else (a duel's wager, an arena entry, an auction-house offer) is not
   counted here, as before. */
export function orderEscrowGold(o) {
  if (!o || o.type !== 'buy') return 0;
  const p = Number(o.price);
  return Number.isFinite(p) && p > 0 ? p : 0;
}

/* v2.3.3368: the entries waiting in one `inbox:` value */
function boxEntries(box) {
  return Array.isArray(box) ? box.length : 0;
}

export const LIVEOPS = {
  XP_MULT_MIN: 1,
  XP_MULT_MAX: 4,
  ANNOUNCE_MAX_LEN: 200,
  FLAG_NAME_RE: /^[a-z0-9_]{1,32}$/,
  /* ═══ v2.3.3295: FIVE KILL SWITCHES NOBODY COULD THROW ═══
     Each of these caps says in its own comment (join.js) that writing
     `<name>: false` into the live flags turns it off, and four of them are
     read by the worker too (storegear.js _stGearOff, dailychest.js _chestOff,
     depth.js _depthK, abilities.js _abilWindupOff; broCount only un-advertises
     itself to the phone).  But the one route to the flags, POST /flags below,
     refused every name outside FLAG_NAME_RE -- lower case only -- so in an
     emergency all five answered 400 (TRAPS §117 found it in v2.3.2848 and
     fixed the rule for NEW names; these were already shipped, or came after).
     Renaming a cap is not the way out: the phone reads it by this name, and a
     worker that stopped saying `storeGear` would read to every phone in the
     world as one without the auction house's gear.  Widening FLAG_NAME_RE is
     not either: every camelCase cap would become settable, `weaponDrops`
     among them, whose `false` brings back weapons the phone mints itself
     (docs/specs/liveops.md "Caps override").  So these five, by name, and no
     other: a new kill switch still takes a lower-case name, and
     liveops.test §8 fails for one that does not. */
  CAMEL_SWITCHES: Object.freeze(['storeGear', 'dailyChest', 'zoneDepth', 'whirlWindup', 'broCount']),
  FLAGS_MAX: 64,
  METRICS_KEEP: 30,
  ALERT_PCT: 25,
};

/* v2.3.3295: a name POST /flags will store -- FLAG_NAME_RE's, or one of the
   five camelCase switches above. */
export function flagNameOk(name) {
  return typeof name === 'string' && (LIVEOPS.FLAG_NAME_RE.test(name) || LIVEOPS.CAMEL_SWITCHES.includes(name));
}

export const liveopsMethods = {
  async _liveFlagsEnsure() {
    if (this._liveFlags) return this._liveFlags;
    this._liveFlags = (await this.state.storage.get('liveflags')) || {};
    return this._liveFlags;
  },

  // Synchronous by design (hot paths).  Fail-open before the first
  // cache load is acceptable: every gated path requires a joined
  // player, and the join handler awaits _liveFlagsEnsure first.
  _flagOn(name) {
    return !!(this._liveFlags && this._liveFlags[name]);
  },

  // Clamped at READ time as the wall (storage could be hand-edited);
  // the admin write path clamps too, belt-and-braces.
  _flagNum(name, dflt, lo, hi) {
    const v = this._liveFlags && this._liveFlags[name];
    if (typeof v !== 'number' || !Number.isFinite(v)) return dflt;
    return Math.max(lo, Math.min(hi, v));
  },

  /* ═══ v2.3.2438: THE SNAPSHOT THAT FROZE THE ROOM EVERY MINUTE ═══
   *
   * _economySnapshot listed EVERY `rpg:` blob -- values included, one per
   * id that ever joined, guests and throwaways too, never pruned -- in one
   * storage.list().  _metricsMaybe ran it once a day... and on every join,
   * and every 60s from the tick, and again every 60s after a throw, because
   * _lastMetricsDay was only set on success.  A room whose player table
   * had grown past what one list() returns comfortably therefore held its
   * input gate for the length of that list, every minute, forever, and
   * every join paid it too.  See inbox.js _opPruneMaybe for the day that
   * found this; this was the second gate-holder on the same join.
   *
   * The daily metric is now an incremental JOB driven from the tick slot:
   * one bounded page of `rpg:` per slot, totals carried in memory, the
   * record written when the last page comes back short.  No event holds
   * the gate for more than one small list().  The join path no longer
   * touches it (join.js) -- a join starts the tick, and the slot follows
   * within a minute, which is all the "lazy on join" clause of rule 12
   * ever needed here.
   *
   * _economySnapshot itself is kept for the owner's /economy endpoint,
   * paged the same way so its memory is bounded; it is an explicit
   * operator request and may take as long as the table is large. */
  async _economyPage(after) {
    const opts = { prefix: 'rpg:', limit: METRICS.PAGE };
    if (after) opts.startAfter = after;
    const blobs = await this.state.storage.list(opts);
    let gold = 0, last = null;
    const players = [];
    for (const [k, b] of blobs) {
      last = k;
      const coins = (b && b.coins) || 0;
      gold += coins;
      players.push({ id: k.slice(4), coins, level: (b && b.level) || 1 });
    }
    return { gold, players, count: blobs.size, last, done: blobs.size < METRICS.PAGE || !last };
  },

  /* ═══ v2.3.3368: EVERY TABLE ONE PAGE AT A TIME ═══
     v2.3.2438 paged the player records, and left the two tails -- the
     mailboxes (`inbox:`) and the market's resting orders (`mkt_order:`) --
     as one list each, every value in memory at once.  A box is drained only
     when its player joins, so the mail of a player who never comes back (a
     market or auction-house sale, a refund after a deploy) stays for ever,
     and that list grew with every one of them: one more input-gate hold a
     day that only got longer, and every box in memory with it (the
     architecture review's rule-9 finding).  One bounded page of any prefix,
     values included, resumed after `after`. */
  async _metricsList(prefix, limit, after) {
    const opts = { prefix, limit };
    if (after) opts.startAfter = after;
    const page = await this.state.storage.list(opts);
    let last = null;
    for (const k of page.keys()) last = k;
    return { page, last, done: page.size < limit || !last };
  },

  async _economySnapshot() {
    let totalGold = 0, playerBlobs = 0, after = null;
    let top = [];
    for (;;) {
      const pg = await this._economyPage(after);
      totalGold += pg.gold; playerBlobs += pg.count;
      top = top.concat(pg.players).sort((a, b) => b.coins - a.coins).slice(0, 10);
      if (pg.done) break;
      after = pg.last;
    }
    let openOrders = 0, escrowedGold = 0;
    for (after = null; ;) {
      const pg = await this._metricsList('mkt_order:', METRICS.PAGE, after);
      openOrders += pg.page.size;
      for (const o of pg.page.values()) escrowedGold += orderEscrowGold(o);
      if (pg.done) break;
      after = pg.last;
    }
    let inboxes = 0, pendingEntries = 0;
    for (after = null; ;) {
      const pg = await this._metricsList('inbox:', METRICS.BOX_PAGE, after);
      inboxes += pg.page.size;
      for (const box of pg.page.values()) pendingEntries += boxEntries(box);
      if (pg.done) break;
      after = pg.last;
    }
    const h5log = (await this.state.storage.get('harden_h5_log')) || [];
    const jackpot = (await this.state.storage.get('jackpot:draw')) || null;
    return {
      playerBlobs,
      totalGold,
      top10: top,
      market: { openOrders, escrowedGold },
      inbox: { inboxes, pendingEntries },
      hardenH5Mints: h5log.length,
      jackpot: jackpot ? { period: jackpot.period, pool: jackpot.pool, entrants: Object.keys(jackpot.entries || {}).length } : null,
      ts: Date.now(),
    };
  },

  /* Once-daily economy snapshot, a page at a time.  Key-existence
     idempotent (the cheap wall); this._lastMetricsDay is the fast path.
     Never throws out of a tick.  Returns true while there is more to do.

     v2.3.3368: three tables, one after the other -- the player records (the
     gold), the mailboxes (the mail waiting), the market's orders (the gold
     its buy orders hold) -- and a call reads AT MOST ONE PAGE OF EACH: it
     stops at the first page that comes back full (more of that table next
     slot) and writes the record on the call whose pages all came back short.
     So a call never reads more than one full page, as v2.3.2438 meant, and a
     quiet room with few of each still writes its record in one call. */
  async _metricsMaybe(now) {
    try {
      now = now || Date.now();
      const ymd = this._cadencePeriodDaily(now);
      if (this._lastMetricsDay === ymd) return false;
      let job = this._metricsJob;
      if (!job || job.ymd !== ymd) {
        // A throw backs off for a while rather than retrying every slot.
        if (this._metricsRetryAt && now < this._metricsRetryAt) return false;
        const key = 'metrics:' + ymd;
        if (await this.state.storage.get(key)) { this._lastMetricsDay = ymd; this._metricsJob = null; return false; }
        job = this._metricsJob = { ymd, table: 'rpg', after: null, totalGold: 0, playerBlobs: 0,
          pendingEntries: 0, escrowedGold: 0, pages: 0 };
      }
      if (job.table === 'rpg') {
        const pg = await this._economyPage(job.after);
        job.totalGold += pg.gold; job.playerBlobs += pg.count; job.pages++;
        if (!pg.done) { job.after = pg.last; return true; }
        job.table = 'inbox'; job.after = null;
      }
      if (job.table === 'inbox') {
        const pg = await this._metricsList('inbox:', METRICS.BOX_PAGE, job.after);
        for (const box of pg.page.values()) job.pendingEntries += boxEntries(box);
        job.pages++;
        if (!pg.done) { job.after = pg.last; return true; }
        job.table = 'orders'; job.after = null;
      }
      {
        const pg = await this._metricsList('mkt_order:', METRICS.PAGE, job.after);
        for (const o of pg.page.values()) job.escrowedGold += orderEscrowGold(o);
        job.pages++;
        if (!pg.done) { job.after = pg.last; return true; }
      }
      await this.state.storage.put('metrics:' + ymd, {
        totalGold: job.totalGold,
        playerBlobs: job.playerBlobs,
        escrowedGold: job.escrowedGold,
        pendingEntries: job.pendingEntries,
        ts: now,
      });
      this._lastMetricsDay = ymd;
      this._metricsJob = null;
      // Prune the ring.  yyyymmdd keys sort lexicographically =
      // chronologically, so dropping the smallest keys is dropping the
      // oldest days.
      const all = await this.state.storage.list({ prefix: 'metrics:' });
      if (all.size > LIVEOPS.METRICS_KEEP) {
        const keys = [...all.keys()].sort();
        await this.state.storage.delete(keys.slice(0, all.size - LIVEOPS.METRICS_KEEP));
      }
      return false;
    } catch (e) {
      /* metrics must never block a tick -- and must not spin one either. */
      this._metricsJob = null;
      this._metricsRetryAt = (now || Date.now()) + METRICS.RETRY_MS;
      return false;
    }
  },

  async _announce(text, sticky) {
    const t = String(text || '').trim().slice(0, LIVEOPS.ANNOUNCE_MAX_LEN);
    if (!t) return false;
    // Direct broadcast, NOT eventBuffer -- the buffer only drains while
    // the tick loop runs, and an announcement must reach a quiet room.
    this.broadcastAll({ type: 'server_announce', payload: { text: t, ts: Date.now() } });
    if (sticky) await this.state.storage.put('motd', { text: t, ts: Date.now() });
    return true;
  },

  // Admin sub-routes.  Called by _adminFetch AFTER auth, just before
  // its final 404; returns a Response or null (not ours).
  async _liveopsRoutes(request, url, path, json) {
    if (request.method === 'GET' && path === '/flags') {
      return json({ ok: true, flags: await this._liveFlagsEnsure() });
    }
    if (request.method === 'POST' && path === '/flags') {
      const body = await request.json();
      const { name } = body || {};
      let { value } = body || {};
      if (!flagNameOk(name)) {
        return json({ ok: false, error: 'flag name must match ' + LIVEOPS.FLAG_NAME_RE + ' or be one of ' + LIVEOPS.CAMEL_SWITCHES.join(', ') }, 400);
      }
      if (typeof value !== 'boolean' && !(typeof value === 'number' && Number.isFinite(value))) {
        return json({ ok: false, error: 'value must be a boolean or finite number' }, 400);
      }
      if (name === 'xp_mult' && typeof value === 'number') {
        value = Math.max(LIVEOPS.XP_MULT_MIN, Math.min(LIVEOPS.XP_MULT_MAX, value));
      }
      const flags = await this._liveFlagsEnsure();
      if (!(name in flags) && Object.keys(flags).length >= LIVEOPS.FLAGS_MAX) {
        return json({ ok: false, error: 'flag budget exhausted (' + LIVEOPS.FLAGS_MAX + ')' }, 400);
      }
      flags[name] = value; // write-through: cache IS the stored object
      await this.state.storage.put('liveflags', flags);
      await this._adminLog({ op: 'flag_set', name, value });
      /* v2.3.3260: the one formula's switch re-sizes every bar and every live
         monster's hit at once (oneformula.js _oneFormulaFlagChanged) */
      if (name === 'oneformula' && typeof this._oneFormulaFlagChanged === 'function') this._oneFormulaFlagChanged();
      return json({ ok: true, flags });
    }
    if (request.method === 'DELETE' && path === '/flags') {
      const name = url.searchParams.get('name');
      const flags = await this._liveFlagsEnsure();
      if (name && name in flags) {
        delete flags[name];
        await this.state.storage.put('liveflags', flags);
        await this._adminLog({ op: 'flag_clear', name });
        if (name === 'oneformula' && typeof this._oneFormulaFlagChanged === 'function') this._oneFormulaFlagChanged();   /* v2.3.3260 */
      }
      return json({ ok: true, flags });
    }
    if (request.method === 'POST' && path === '/announce') {
      const body = await request.json();
      const ok = await this._announce(body && body.text, body && body.sticky);
      if (!ok) return json({ ok: false, error: 'text required' }, 400);
      await this._adminLog({ op: 'announce', text: String(body.text).slice(0, 80), sticky: !!(body && body.sticky) });
      return json({ ok: true, sticky: !!(body && body.sticky) });
    }
    if (request.method === 'DELETE' && path === '/announce') {
      await this.state.storage.delete('motd');
      await this._adminLog({ op: 'motd_clear' });
      return json({ ok: true });
    }
    return null;
  },
};
