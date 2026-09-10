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
 *           30) written lazily from join + the rate-limited tick slot;
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
  SLOT_MS: 3000,
  RETRY_MS: 3600000,
};

export const LIVEOPS = {
  XP_MULT_MIN: 1,
  XP_MULT_MAX: 4,
  ANNOUNCE_MAX_LEN: 200,
  FLAG_NAME_RE: /^[a-z0-9_]{1,32}$/,
  FLAGS_MAX: 64,
  METRICS_KEEP: 30,
  ALERT_PCT: 25,
};

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
    const orders = await this.state.storage.list({ prefix: 'mkt_order:' });
    let escrowedGold = 0;
    for (const [, o] of orders) {
      if (o && o.side === 'buy') escrowedGold += (o.price || 0) * (o.qty || 1);
    }
    const inboxes = await this.state.storage.list({ prefix: 'inbox:' });
    let pendingEntries = 0;
    for (const [, box] of inboxes) pendingEntries += Array.isArray(box) ? box.length : 0;
    const h5log = (await this.state.storage.get('harden_h5_log')) || [];
    const jackpot = (await this.state.storage.get('jackpot:draw')) || null;
    return {
      playerBlobs,
      totalGold,
      top10: top,
      market: { openOrders: orders.size, escrowedGold },
      inbox: { inboxes: inboxes.size, pendingEntries },
      hardenH5Mints: h5log.length,
      jackpot: jackpot ? { period: jackpot.period, pool: jackpot.pool, entrants: Object.keys(jackpot.entries || {}).length } : null,
      ts: Date.now(),
    };
  },

  /* Once-daily economy snapshot, one page per call.  Key-existence
     idempotent (the cheap wall); this._lastMetricsDay is the fast path.
     Never throws out of a tick.  Returns true while there is more to do. */
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
        job = this._metricsJob = { ymd, after: null, totalGold: 0, playerBlobs: 0, pages: 0 };
      }
      const pg = await this._economyPage(job.after);
      job.totalGold += pg.gold; job.playerBlobs += pg.count; job.pages++;
      if (!pg.done) { job.after = pg.last; return true; }
      // Last page: the cheap tails, then the record.
      const orders = await this.state.storage.list({ prefix: 'mkt_order:' });
      let escrowedGold = 0;
      for (const [, o] of orders) if (o && o.side === 'buy') escrowedGold += (o.price || 0) * (o.qty || 1);
      const inboxes = await this.state.storage.list({ prefix: 'inbox:' });
      let pendingEntries = 0;
      for (const [, box] of inboxes) pendingEntries += Array.isArray(box) ? box.length : 0;
      await this.state.storage.put('metrics:' + ymd, {
        totalGold: job.totalGold,
        playerBlobs: job.playerBlobs,
        escrowedGold,
        pendingEntries,
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
      if (typeof name !== 'string' || !LIVEOPS.FLAG_NAME_RE.test(name)) {
        return json({ ok: false, error: 'flag name must match ' + LIVEOPS.FLAG_NAME_RE }, 400);
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
      return json({ ok: true, flags });
    }
    if (request.method === 'DELETE' && path === '/flags') {
      const name = url.searchParams.get('name');
      const flags = await this._liveFlagsEnsure();
      if (name && name in flags) {
        delete flags[name];
        await this.state.storage.put('liveflags', flags);
        await this._adminLog({ op: 'flag_clear', name });
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
