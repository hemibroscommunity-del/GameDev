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
  KEEP: 7,                       // ring size per player (prerestore
                                 // copies count toward the cap so a
                                 // restore loop can't grow unbounded)
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
      // Prune the ring.  Keys sort lexicographically; timestamps in the
      // entries decide age (prerestore keys carry Date.now() suffixes
      // that don't sort against yyyymmdd, so sort by write order via
      // the listed map -- DO list() returns key order, which is fine:
      // we only need "delete some when over cap", not perfect LRU).
      const snaps = await this.state.storage.list({ prefix: 'rpgsnap:' + playerId + ':' });
      if (snaps.size > SNAPSHOT.KEEP) {
        const keys = [...snaps.keys()].sort();
        const excess = keys.slice(0, snaps.size - SNAPSHOT.KEEP);
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
        // Full-prefix lists.  Fine at room scale (tens-hundreds of
        // blobs, SQLite-backed DO = one query each, input gate holds);
        // revisit with maintained aggregates if blobs exceed ~thousands.
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
        return json({
          ok: true,
          playerBlobs: blobs.size,
          totalGold,
          top10: players.slice(0, 10),
          market: { openOrders: orders.size, escrowedGold },
          inbox: { inboxes: inboxes.size, pendingEntries },
          hardenH5Mints: h5log.length,
          jackpot: jackpot ? { period: jackpot.period, pool: jackpot.pool, entrants: Object.keys(jackpot.entries || {}).length } : null,
          ts: Date.now(),
        });
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

      return json({ ok: false, error: 'Not found' }, 404);
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  },
};
