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
      const snaps = await this.state.storage.list({ prefix: 'rpgsnap:' + playerId + ':' });
      const _isPre = (k) => k.includes(':prerestore-');
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
          live: ps ? { coins: ps.coins, level: ps.level, hp: ps.hp, zone: ps.z, x: ps.x, y: ps.y, dead: !!ps.dead, disconnected: !!ps.disconnected } : null,
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

      return json({ ok: false, error: 'Not found' }, 404);
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  },
};
