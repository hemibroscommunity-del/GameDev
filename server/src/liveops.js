/* ═══ v2.3.1146: LIVE-OPS RAIL (spec: docs/specs/liveops.md; owner
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

  // The /economy aggregation, factored out of admin.js so the daily
  // metrics writer and the endpoint share one implementation.  All
  // awaits are storage awaits (input gate stays closed, rule 9).
  async _economySnapshot() {
    const blobs = await this.state.storage.list({ prefix: 'rpg:' });
    let totalGold = 0;
    const players = [];
    for (const [k, b] of blobs) {
      const coins = (b && b.coins) || 0;
      totalGold += coins;
      players.push({ id: k.slice(4), coins, level: (b && b.level) || 1 });
    }
    players.sort((a, b) => b.coins - a.coins);
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
      playerBlobs: blobs.size,
      totalGold,
      top10: players.slice(0, 10),
      market: { openOrders: orders.size, escrowedGold },
      inbox: { inboxes: inboxes.size, pendingEntries },
      hardenH5Mints: h5log.length,
      jackpot: jackpot ? { period: jackpot.period, pool: jackpot.pool, entrants: Object.keys(jackpot.entries || {}).length } : null,
      ts: Date.now(),
    };
  },

  // Once-daily economy snapshot.  Key-existence idempotent (the cheap
  // wall); this._lastMetricsDay is just the fast path.  Never throws
  // out of a join or tick.
  async _metricsMaybe(now) {
    try {
      const ymd = this._cadencePeriodDaily(now);
      if (this._lastMetricsDay === ymd) return;
      const key = 'metrics:' + ymd;
      if (await this.state.storage.get(key)) { this._lastMetricsDay = ymd; return; }
      const s = await this._economySnapshot();
      await this.state.storage.put(key, {
        totalGold: s.totalGold,
        playerBlobs: s.playerBlobs,
        escrowedGold: s.market.escrowedGold,
        pendingEntries: s.inbox.pendingEntries,
        ts: now || Date.now(),
      });
      this._lastMetricsDay = ymd;
      // Prune the ring.  yyyymmdd keys sort lexicographically =
      // chronologically, so dropping the smallest keys is dropping the
      // oldest days.
      const all = await this.state.storage.list({ prefix: 'metrics:' });
      if (all.size > LIVEOPS.METRICS_KEEP) {
        const keys = [...all.keys()].sort();
        for (const k of keys.slice(0, all.size - LIVEOPS.METRICS_KEEP)) {
          await this.state.storage.delete(k);
        }
      }
    } catch (e) { /* metrics must never block a join/tick */ }
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
