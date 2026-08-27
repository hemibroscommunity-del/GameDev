/* ═══ v2.3.1148: OPERATOR TOOLKIT (spec: docs/specs/admin.md; owner
 * guide: docs/OPERATIONS.md) ═══
 *
 * The solo owner previously had NO in-band way to operate the game:
 * no visibility (the harden_h5_log / swipe-fp "monitoring" fields were
 * write-only), no backup of rpg blobs (a corrupting bug or drain
 * exploit was unrecoverable -- Cloudflare deploy rollback does NOT
 * touch DO storage), and no intervention lever beyond hand-editing
 * storage.  This mixin adds an owner-keyed HTTP surface + a lazy daily
 * snapshot ring.
 *
 * AUTH: `Authorization: Bearer <key>` compared against the ADMIN_KEY
 * secret (set via the Cloudflare dashboard -- see OPERATIONS.md).
 * Fail-closed: when no secret is configured the whole surface 404s,
 * indistinguishable from the route not existing.  Both strings are
 * SHA-256 hashed before the === compare (the _phraseHash posture:
 * digest comparison leaks nothing about the preimage, which makes
 * plain === timing-safe without timingSafeEqual ceremony).
 *
 * STORAGE KEYS (registered in ARCHITECTURE-HANDOFF rule 2):
 *   frozen:<pid>              {ts, note} -- join gate rejects while set
 *   rpgsnap:<pid>:<yyyymmdd>  daily snapshot of the stored rpg blob
 *   rpgsnap:<pid>:prerestore-<ts>  safety copy taken BEFORE a restore
 *   rpgsnap_at:<pid>          last-snapshot timestamp (20h throttle)
 *   admin_log                 capped ring (100) of mutating admin ops
 *
 * INVARIANTS HONORED: grants go through _creditPlayer (rule 4) with a
 * deterministic-on-retry opId (rule 5); nothing is added to the rpg
 * blob (rule 1); every await in here is a storage await, so the DO
 * input gate stays closed between validation and commit (rule 9). */

/* v2.3.1617: every non-dated `rpgsnap:<pid>:` suffix in the repo.  These are
   "parachute" snapshots -- taken immediately before something destructive --
   and they prune as their OWN ring, separately from the dated dailies, for
   the sort-order reason documented at the prune site.  A writer that is not
   listed here silently lands in the daily class and evicts real snapshots,
   which is exactly what `prereset-` did between v2.3.1347 and v2.3.1617.
     :prerestore-  admin.js, before an operator restore
     :prereset-    persistence.js, before a self-service character restart */
export const PARACHUTE_TAGS = [':prerestore-', ':prereset-'];

export const SNAPSHOT = {
  INTERVAL_MS: 20 * 3600 * 1000, // one snapshot per ~day (20h so a
                                 // daily-ish login cadence never skips)
  KEEP: 7,                       // ring size per player, PER KEY CLASS
                                 // (v2.3.1179: daily + prerestore rings
                                 // prune separately -- one shared cap
                                 // let prerestore keys, which sort
                                 // after the yyyymmdd keys, evict the
                                 // real daily snapshots first)
};

export const adminMethods = {
  async _adminAuth(request) {
    const key = this.env && this.env.ADMIN_KEY;
    if (!key) return 'unconfigured';
    const auth = request.headers.get('Authorization') || '';
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!supplied) return 'denied';
    const [a, b] = await Promise.all([this._phraseHash(supplied), this._phraseHash(key)]);
    return a === b ? 'ok' : 'denied';
  },

  async _adminLog(entry) {
    try {
      const log = (await this.state.storage.get('admin_log')) || [];
      log.push({ ts: Date.now(), ...entry });
      await this.state.storage.put('admin_log', log.slice(-100));
    } catch (e) { /* log is best-effort */ }
  },

  // Lazy daily snapshot -- called from the join handler right after a
  // successful _loadRpg, with the PRE-join-mutation blob (so the
  // snapshot is the state the player last logged OUT with).  One get +
  // two puts + one small list per player per day.
  async _rpgSnapshotMaybe(playerId, storedBlob) {
    try {
      const now = Date.now();
      const last = await this.state.storage.get('rpgsnap_at:' + playerId);
      if (typeof last === 'number' && now - last < SNAPSHOT.INTERVAL_MS) return;
      const d = new Date(now);
      const ymd = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
      await this.state.storage.put('rpgsnap:' + playerId + ':' + ymd, storedBlob);
      await this.state.storage.put('rpgsnap_at:' + playerId, now);
      // Prune the ring.  v2.3.1179: the two key classes prune
      // SEPARATELY.  The old single sorted list was wrong: 'prerestore-'
      // sorts lexically AFTER every yyyymmdd digit key ('p' > '9'), so
      // once any prerestore snapshot existed the excess-slice evicted
      // the OLDEST REAL DAILY SNAPSHOTS first and the prerestore keys
      // lived forever -- exactly inverted from the rollback-parachute
      // intent.  Within each class, lexical sort IS age order (fixed-
      // width yyyymmdd; fixed-width ms timestamps until year 2286).
      /* v2.3.1617: the v2.3.1179 fix above covered ONE parachute prefix and
         the class test was written as a literal.  v2.3.1347 then added a
         SECOND parachute writer -- persistence.js `_handleCharacterReset`
         puts `rpgsnap:<pid>:prereset-<ts>` before wiping a character -- and
         nothing here was updated, so `:prereset-` failed the `:prerestore-`
         test and fell into the DAILY class.  That reproduces the exact
         inversion this block exists to prevent: 'p' > '9', so every
         prereset key sorts after every yyyymmdd key, and slicing the
         excess off the FRONT deleted real daily snapshots while the
         prereset keys lived forever.  A player who restarts their
         character and keeps playing loses their rollback history to the
         very key that was supposed to be the parachute.
         Matched by PREFIX SET now rather than one literal, so a third
         writer is a one-line registration instead of a silent repeat.  Any
         future `rpgsnap:<pid>:<something-non-numeric>` MUST be added here. */
      const snaps = await this.state.storage.list({ prefix: 'rpgsnap:' + playerId + ':' });
      const _isPre = (k) => PARACHUTE_TAGS.some((t) => k.includes(t));
      for (const cls of [
        [...snaps.keys()].filter((k) => !_isPre(k)).sort(),
        [...snaps.keys()].filter(_isPre).sort(),
      ]) {
        const excess = cls.length > SNAPSHOT.KEEP ? cls.slice(0, cls.length - SNAPSHOT.KEEP) : [];
        for (const k of excess) await this.state.storage.delete(k);
      }
    } catch (e) { /* snapshots must never block a join */ }
  },

  async _adminFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: H });
    try {
      const auth = await this._adminAuth(request);
      // Unconfigured key -> the surface doesn't exist.  Wrong/missing
      // key -> 401 so the owner can tell a typo from a bad URL.
      if (auth === 'unconfigured') return json({ ok: false, error: 'Not found' }, 404);
      if (auth !== 'ok') return json({ ok: false, error: 'Unauthorized' }, 401);

      if (request.method === 'GET' && path === '/overview') {
        const v = { v1: 0, v2: 0 };
        for (const [, s] of this.sessions) (s.protocolVersion === 2 ? v.v2++ : v.v1++);
        return json({
          ok: true,
          sessions: this.sessions.size,
          players: this.getPlayerCount(),
          playerStateCount: Object.keys(this.playerState).length,
          zones: [...this._activeZones()],
          tickRunning: !!this.tickInterval,
          eventBufferLen: this.eventBuffer.length,
          protocolVersions: v,
          ts: Date.now(),
        });
      }

      if (request.method === 'GET' && path === '/economy') {
        // v2.3.1150: aggregation factored into _economySnapshot
        // (liveops.js) so the daily metrics tripwire shares it.  Scale
        // note unchanged: full-prefix lists are fine at room scale;
        // revisit with maintained aggregates beyond ~thousands of blobs.
        const s = await this._economySnapshot();
        // Tripwire surface: last 7 daily snapshots + day-over-day
        // delta; alert when |Δ totalGold| exceeds ALERT_PCT (a sudden
        // supply jump is the dupe-exploit signature).
        const all = await this.state.storage.list({ prefix: 'metrics:' });
        const days = [...all.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-7)
          .map(([k, v]) => ({ day: k.slice(8), ...v }));
        let delta = null;
        let alert = false;
        if (days.length >= 2) {
          const prev = days[days.length - 2].totalGold;
          const latest = days[days.length - 1].totalGold;
          const pct = prev > 0 ? ((latest - prev) / prev) * 100 : (latest > 0 ? 100 : 0);
          delta = { totalGoldPct: Math.round(pct * 10) / 10 };
          alert = Math.abs(pct) > 25;
        }
        return json({ ok: true, ...s, history: days, delta, alert });
      }

      if (request.method === 'GET' && path === '/player') {
        const id = url.searchParams.get('id');
        if (!id) return json({ ok: false, error: 'id required' }, 400);
        const rpg = await this.state.storage.get('rpg:' + id);
        const auth2 = await this.state.storage.get('auth:' + id);
        const frozen = await this.state.storage.get('frozen:' + id);
        const inbox = await this.state.storage.get('inbox:' + id);
        const snaps = await this.state.storage.list({ prefix: 'rpgsnap:' + id + ':' });
        const ps = this.playerState[id];
        return json({
          ok: true,
          rpg: rpg || null,
          /* v2.3.1704: `ex` / `extracting` / `harvestShield` are the operator
             view of the harvest shield.  Read-only, and they exist because the
             bug this shield had (extraction_start never reaching the worker —
             TRAPS #18) is invisible from the client: the browser's own state
             says "I am extracting" whether or not the worker ever heard about
             it.  A headless check that asks HERE disagrees with the client
             immediately, which is exactly the tell TRAPS #18 describes.
               ex             — the harvest activity code the client is
                                broadcasting on `move` (mine|chop|fish|cook|fire)
               extracting     — the worker holds a validated extraction record
               harvestShield  — the record is currently granting immunity
                                (all of _extractionShielded's clauses hold) */
          live: ps ? { coins: ps.coins, level: ps.level, hp: ps.hp, zone: ps.z, x: ps.x, y: ps.y, dead: !!ps.dead, disconnected: !!ps.disconnected,
            ex: ps.ex || null, extracting: !!this.extractions[id], harvestShield: !!this._extractionShielded(id),
            /* v2.3.1765: where the worker believed this player stood when it
               last processed an `ability` cast (abilities.js).  Shield Bash
               reaches 70px from that point with no slack for lag, so "it
               missed" and "it was measured from 40px behind me" are the same
               report — and only this field can tell them apart. */
            abilFrom: ps._abilFrom || null,
            /* v2.3.1705: the directional block is decided from these two and
               nothing else, so an operator (and a headless check) has to be
               able to see them.  `ba` null means "this client never told us
               which way it is facing", which _blockArcCovers reads as the
               old omnidirectional block — a real state, not a missing value. */
            blocking: !!ps.blocking, ba: (typeof ps.ba === 'number' ? ps.ba : null),
            /* v2.3.1733: the STAMINA pool, for the same reason blocking/ba are
               here.  Stamina is now spent by blocking (v2.3.1731) and by the
               two abilities, and the client's copy is a prediction the worker
               overwrites — so "did that cast actually cost anything" can only
               be answered here.  A headless check that reads the browser
               instead would pass on a message the worker never received, which
               is exactly the TRAPS #18 blind spot.
               v2.3.1734: the MANA pair joins it, verbatim the same argument —
               the special's cost moved to a flat number that the WORKER
               charges while the client predicts it, so a drift between the two
               is invisible on screen (the next echo silently corrects the bar)
               and readable only from here.  Both read-only. */
            stamina: ps.stamina, maxStamina: ps.maxStamina,
            mana: ps.mana, maxMana: ps.maxMana } : null,
          online: !!this._wsBySessionId(id),
          auth: auth2 ? { createdAt: auth2.createdAt } : null,
          frozen: frozen || null,
          inboxCount: Array.isArray(inbox) ? inbox.length : 0,
          snapshots: [...snaps.keys()],
        });
      }

      if (request.method === 'POST' && path === '/grant') {
        const body = await request.json();
        const { playerId, kind, payload, note } = body || {};
        if (!playerId || (kind !== 'gold' && kind !== 'item')) {
          return json({ ok: false, error: 'playerId + kind gold|item required (weapons unsupported v1 -- stash-cap partial-drain complexity)' }, 400);
        }
        // Deterministic on RETRY: the response echoes the opId; a
        // re-run curl that passes it back converges as dup (rule 5).
        const opId = (typeof body.opId === 'string' && body.opId) || ('admin:' + crypto.randomUUID());
        const result = await this._creditPlayer(playerId, { opId, source: 'admin', kind, payload: payload || {}, note: note || 'Grant from the operator' });
        await this._adminLog({ op: 'grant', playerId, kind, payload, note, opId, result });
        return json({ ok: true, result, opId });
      }

      if (request.method === 'POST' && path === '/kick') {
        const body = await request.json();
        const { playerId, reason } = body || {};
        if (!playerId) return json({ ok: false, error: 'playerId required' }, 400);
        const target = this._wsBySessionId(playerId);
        if (target) {
          this.sessions.delete(target);
          try { target.close(4008, 'admin_kick'); } catch (e) {}
        }
        await this._adminLog({ op: 'kick', playerId, reason: reason || '' });
        return json({ ok: true, wasOnline: !!target });
      }

      if (request.method === 'POST' && path === '/freeze') {
        const body = await request.json();
        const { playerId, note } = body || {};
        if (!playerId) return json({ ok: false, error: 'playerId required' }, 400);
        await this.state.storage.put('frozen:' + playerId, { ts: Date.now(), note: note || '' });
        const target = this._wsBySessionId(playerId);
        if (target) {
          this.sessions.delete(target);
          try { target.close(4004, 'frozen'); } catch (e) {}
        }
        await this._adminLog({ op: 'freeze', playerId, note: note || '' });
        return json({ ok: true, wasOnline: !!target });
      }

      if (request.method === 'DELETE' && path === '/freeze') {
        const id = url.searchParams.get('id');
        if (!id) return json({ ok: false, error: 'id required' }, 400);
        await this.state.storage.delete('frozen:' + id);
        await this._adminLog({ op: 'unfreeze', playerId: id });
        return json({ ok: true });
      }

      if (request.method === 'POST' && path === '/restore') {
        const body = await request.json();
        const { playerId, snapKey } = body || {};
        if (!playerId || !snapKey || !snapKey.startsWith('rpgsnap:' + playerId + ':')) {
          return json({ ok: false, error: 'playerId + a matching snapKey required' }, 400);
        }
        // A live session's next _saveRpg would clobber the restore --
        // kick first, deliberately manual (the operator should know
        // the player is being reverted).
        if (this._wsBySessionId(playerId)) return json({ ok: false, error: 'player online -- kick first' }, 409);
        const snap = await this.state.storage.get(snapKey);
        if (!snap) return json({ ok: false, error: 'snapshot not found' }, 404);
        // NEVER destroy data during recovery: current blob is saved as
        // a prerestore snapshot before being overwritten.
        const current = await this.state.storage.get('rpg:' + playerId);
        if (current) await this.state.storage.put('rpgsnap:' + playerId + ':prerestore-' + Date.now(), current);
        await this.state.storage.put('rpg:' + playerId, snap);
        await this._adminLog({ op: 'restore', playerId, snapKey });
        return json({ ok: true, restoredFrom: snapKey });
      }

      if (request.method === 'GET' && path === '/log') {
        const log = (await this.state.storage.get('admin_log')) || [];
        return json({ ok: true, log });
      }

      // v2.3.1150: live-ops sub-routes (flags/announce) -- auth already
      // passed above; liveops.js returns null for paths it doesn't own.
      const lo = await this._liveopsRoutes(request, url, path, json);
      if (lo) return lo;

      /* v2.3.2034: the cape-contest ledger (eventcapes.js) -- same contract.
         Read-only by default; the reset needs the cape named AND confirm=yes,
         because it voids tickets real people may hold. */
      const cp = await this._capeAdminRoute(request, url, path, json);
      if (cp) return cp;

      // v2.3.1682: on-chain relayer health (chainscore.js) -- same contract:
      // null for paths it doesn't own.
      const cs = await this._chainScoreAdminRoute(request, url, path, json);
      if (cs) return cs;

      /* v2.3.1981: player abuse reports (chatmod.js) -- same contract.
         Reports need somewhere to BE READ or they are a write-only field
         like the harden_h5_log this toolkit was built to fix; the auth,
         the fail-closed 404 and the admin_log all come from here for
         free, which is why it mounts under this surface rather than
         growing a route (and a second secret) of its own. */
      const cm = await this._chatModAdminRoute(request, url, path, json);
      if (cm) return cm;

      return json({ ok: false, error: 'Not found' }, 404);
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  },
};
