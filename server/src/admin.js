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

import { rewindPlan, rewindDo } from './restore.js';   /* v2.3.5288: the room's way back (card R PR 9) */
import { playerRestore, snapshotCopy } from './playerrestore.js';   /* v2.3.5285: a player's restore from the registry (card R PR 6) */
import * as FLOOD_NS from './flood.js';   /* v2.3.5583: the address (requestIp), and its /64 (ipKey) once the /64 change (PR #1875) is in */

/* ═══ v2.3.5583: THE ADMIN KEY'S TIME-OUT (red team RT-1, finding N7) ═══
 * The red team's local run: 5,000 wrong keys in half a second, every one a
 * plain 401, no lockout, no log -- then the right key.  A key of 30 random
 * characters (OPERATIONS.md) is not guessed that way; a word or a short
 * password is, and one key does everything (gold, any character's login,
 * every switch, the room's rewind).  So an address that sends MISSES wrong
 * keys within WINDOW_MS is TIMED OUT for HOLD_MS: its asks are answered 429
 * with the minutes left, the key not even checked (a held address learns
 * nothing).  A TIME-OUT, NEVER A BAN: it lifts by itself after HOLD_MS, a
 * deploy or a restart clears it (memory only, nothing stored), another
 * address -- the owner's phone on its own line -- is never held by this one's
 * misses, and the right key clears its address's count.  The compare stays
 * by digest (_phraseHash).  An IPv6 address counts by its /64 once
 * the /64 change's ipKey (PR #1875) is on this worker.  An ask with no address (a local
 * test) is never held.  Kill switch `adminlock: false`. */
export const ADMIN_LOCK = Object.freeze({
  MISSES: 10,
  WINDOW_MS: 10 * 60000,
  HOLD_MS: 15 * 60000,
  /* addresses kept at once; past it the quietest goes first */
  MAP_CAP: 1024,
});

/** The address an admin ask came from, as the time-out counts it, or null. */
export function adminAddress(request, by64) {
  const ip = FLOOD_NS.requestIp(request);
  if (!ip) return null;
  return by64 && typeof FLOOD_NS.ipKey === 'function' ? FLOOD_NS.ipKey(ip) : ip;
}

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
  LIST: 64,                      // v2.3.5960: the copies one prune reads (card V5; KEEP a class: 14 at most)
};

/* ═══ v2.3.5286: THE PAGED EXPORT (card R PR 7; grand plan step 4.7) ═══
 * The owner's copy of the room's records, a page at a time, behind the admin
 * key: GET /api/admin/export?prefix=<a registry prefix>, or ?player=<an id>
 * for one character's own records, with `cursor` (the last key of the page
 * before: its answer's `next`) and `limit` (EXPORT.LIMIT, at most
 * EXPORT.MAX).  Read only: it writes nothing, not even its own log line.
 *
 *   - AN ALLOW LIST (the gatekeeper's medium, sitting 16: a list of what it
 *     never gives, written by hand, would give a new secret record by
 *     default, and gave the device ids in `device:`, `lspin:` and
 *     `botstat:`).  It gives only the registry's prefixes in EXPORT.ALLOW,
 *     chosen one by one: a character's own records a copy of them needs, and
 *     every record that holds the world's value.  Anything else -- a prefix
 *     marked since, a record no mark owns, the logins (`auth:`, `keyidx:`),
 *     the device ids and anti-bot evidence (`device:`, `lspin:`,
 *     `botstat:`), the words players send each other, a wallet's address,
 *     the hidden settings, the live flags, the owner's log -- is refused
 *     when asked for by name (a 400), and left out of a page that meets it
 *     (counted in `skipped`).  EXPORT.KEPT_OUT says why for each of a
 *     character's records left out.
 *   - A VALUE IT MUST NOT GIVE inside a record it gives is masked on the
 *     page's copy (EXPORT_MASKS: a login-wheel pot's opId in the mail holds
 *     a device id), never in storage.
 *   - A READ THE OWNER PAYS FOR each time it runs: a page reads up to its
 *     `limit` rows (`read` in the answer), and the whole room once over is
 *     every row it holds.  It costs only when the owner runs it, behind the
 *     admin key, so it is ON (the owner, 2026-11-14, on the planning
 *     session's recommendation: "Just go recommended"); `roomexport: false`
 *     in the live flags turns it off (liveops.js _roomExportOff).
 *
 * Held by server/test/room-export.test.mjs.  The restore that would read
 * such a copy back is not built (a page is the owner's to keep). */
import { STORAGE_MARKS, marksOf } from './storagemarks.js';

export const EXPORT = Object.freeze({
  LIMIT: 50,
  MAX: 200,
  /* WHAT IT GIVES, one by one (a registry prefix, as STORAGE_MARKS spells it).
     A new mark is not given until it is added here. */
  ALLOW: Object.freeze([
    /* a character's own: what a copy of them needs */
    'rpg:', 'bank:', 'inbox:', 'pets:', 'gear_prov:', 'char:', 'rpgsnap:', 'rpgsnap_at:',
    'codex:', 'fishlog:', 'achv:', 'life:', 'aponce:', 'guild_claims:', 'gearlock:', 'nml_state:',
    'farm:', 'farmorders:', 'harden_ledger:', 'frozen:', 'testmode:', 'cadence:', 'daily_rewards:',
    'acc:', 'friends:', 'chat_mute:', 'chain_score:', 'clan_by_player:', 'party_by_player:',
    /* v2.3.5621: the owner's silence (silence.js), a character's own beside
       its freeze: the until, the owner's note and when */
    'silenced:',
    /* the world's value held between players, or by the room */
    'mkt_order:', 'store_listing:', 'duelEscrow:', 'arena_entry:', 'arena_stake:', 'bounty:',
    'jackpot:draw', 'trade2wpn:', 'death_pile:', 'shop_stock',
  ]),
  /* a character's records it keeps out, and why (the suite holds that every
     character's record is in one list or the other) */
  KEPT_OUT: Object.freeze({
    'auth:': 'the login: the phrase\'s fingerprint, the keys\' and the devices\'',
    'keyidx:': 'a login key\'s fingerprint, to its character',
    'botstat:': 'anti-bot evidence: device fingerprints and the signals\' numbers',
    'lspin:': 'keyed by a device\'s id',
    'friend_msg:': 'the words one player sent another',
    'bro_link:': 'a wallet\'s address',
    'play_trace:': 'a recording of the owner\'s play (v2.3.6482, playtrace.js): what a phone sent, not the character',
  }),
  ID_RE: /^[A-Za-z0-9_.-]{1,120}$/,
  CURSOR_MAX: 400,
});

/* v2.3.5286 (the gatekeeper's second medium, sitting 17, verified by a node
   probe): a record the list gives may still hold a value it must not give.
   One today: a mail entry's opId from the login wheel's pot is
   'loginspin:d:<device id>:<day>' (loginspin.js _loginSpinAcct: the wheel
   counts a DEVICE as one account), so a device id rode out in `inbox:`.  The
   export masks it on its copy; the stored opId is never changed (a pot
   retried after a deploy finds its stamp by that exact id: changed, it
   would pay twice).  Each mask: the prefix of the records it reads, and a
   function from a record to its copy for the page. */
const DEVICE_OPID = /^(loginspin:d:)[^:]*(:.*)?$/;
export const EXPORT_MASKS = Object.freeze({
  'inbox:': (v) => (Array.isArray(v) ? v.map((e) => (e && typeof e === 'object' && typeof e.opId === 'string' && DEVICE_OPID.test(e.opId)
    ? { ...e, opId: e.opId.replace(DEVICE_OPID, (m, a, b) => a + 'masked' + (b || '')) } : e)) : v),
});

/** A record as a page gives it: masked by EXPORT_MASKS where its prefix has one. */
export function exportMasked(key, v) {
  for (const p of Object.keys(EXPORT_MASKS)) if (typeof key === 'string' && key.startsWith(p)) return EXPORT_MASKS[p](v);
  return v;
}

/* the marks the list allows: a key is given only when the mark that owns it
   (the longest marked prefix it starts with, storagemarks.js marksOf) is one */
const ALLOWED_MARKS = new Set(EXPORT.ALLOW.map((p) => STORAGE_MARKS[p]).filter(Boolean));

/* a character's records keyed other than `<prefix><id>`: the snapshots'
   ring (`rpgsnap:<id>:<day>`) and the login streak (`cadence:login:<id>`,
   the one scope today) */
const PLAYER_KEY_WAYS = Object.freeze({
  'rpgsnap:': (id) => ({ list: 'rpgsnap:' + id + ':' }),
  'cadence:': (id) => ({ key: 'cadence:login:' + id }),
});

/** True only for a key the allow list gives (EXPORT.ALLOW, by the mark that
 *  owns it): an unmarked key, or one a mark off the list owns, is false. */
export function exportAllowed(key) {
  return typeof key === 'string' && ALLOWED_MARKS.has(marksOf(key));
}

/** What a page reads: `{sources: [{key} | {list}], prefix?, player?}`, in key
 *  order, or `{error, words}`. */
export function exportSources(q) {
  const prefix = q && typeof q.prefix === 'string' && q.prefix !== '' ? q.prefix : null;
  const player = q && typeof q.player === 'string' && q.player !== '' ? q.player : null;
  if (!prefix === !player) return { error: 'ask', words: 'Say one of prefix (a registry prefix, as `rpg:`) or player (a character\'s id).' };
  if (prefix) {
    if (!Object.prototype.hasOwnProperty.call(STORAGE_MARKS, prefix)) return { error: 'prefix', words: 'Not a prefix the registry marks (storagemarks.js STORAGE_MARKS).' };
    if (!EXPORT.ALLOW.includes(prefix)) return { error: 'never', words: 'The export gives only the records on its list (admin.js EXPORT.ALLOW): never the logins, device ids, anti-bot evidence, players\' words, the hidden settings or the room\'s own books.' };
    return { prefix, sources: [prefix.endsWith(':') ? { list: prefix } : { key: prefix }] };
  }
  if (!EXPORT.ID_RE.test(player)) return { error: 'player', words: 'A character\'s id: letters, digits, `_`, `.` or `-`.' };
  const sources = [];
  for (const p of EXPORT.ALLOW) {
    if (!STORAGE_MARKS[p] || STORAGE_MARKS[p].whose !== 'player') continue;
    sources.push(PLAYER_KEY_WAYS[p] ? PLAYER_KEY_WAYS[p](player) : { key: p + player });
  }
  const at = (s) => s.key || s.list;
  sources.sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : 0));
  return { player, sources };
}

/** One page: `{ok, rows: [{k, v}], read, skipped, next}`.  `next` is the
 *  last key read when the page is full (ask again with it as `cursor`; the
 *  last page may come back empty), null when nothing is left. */
export async function exportPage(storage, q) {
  const s = exportSources(q);
  if (s.error) return { ok: false, error: s.error, words: s.words };
  let limit = q.limit === undefined || q.limit === null || q.limit === '' ? EXPORT.LIMIT : Math.floor(Number(q.limit));
  if (!Number.isFinite(limit)) return { ok: false, error: 'limit', words: 'limit: a number.' };
  limit = Math.max(1, Math.min(EXPORT.MAX, limit));
  const cursor = q.cursor === undefined || q.cursor === null || q.cursor === '' ? null : q.cursor;
  if (cursor !== null && (typeof cursor !== 'string' || cursor.length > EXPORT.CURSOR_MAX
    || !s.sources.some((x) => (x.key ? x.key === cursor : cursor.startsWith(x.list))))) {
    return { ok: false, error: 'cursor', words: 'cursor: the `next` an earlier page of this same ask gave.' };
  }
  const got = [];
  let i = 0;
  while (i < s.sources.length && got.length < limit) {
    const x = s.sources[i];
    if (x.list) {
      i++;
      /* a cursor inside this range starts after it; one past the range skips it */
      if (cursor !== null && !cursor.startsWith(x.list) && cursor > x.list) continue;
      const opt = { prefix: x.list, limit: limit - got.length };
      if (cursor !== null && cursor.startsWith(x.list)) opt.startAfter = cursor;
      for (const [k, v] of await storage.list(opt)) got.push([k, v]);
    } else {
      /* a run of single keys, one read for the run */
      const run = [];
      while (i < s.sources.length && s.sources[i].key && run.length < limit - got.length) {
        const k = s.sources[i++].key;
        if (cursor === null || k > cursor) run.push(k);
      }
      if (run.length) {
        const m = await storage.get(run);
        for (const k of run) if (m && m.has(k)) got.push([k, m.get(k)]);
      }
    }
  }
  const own = s.prefix ? STORAGE_MARKS[s.prefix] : null;
  const rows = [];
  let skipped = 0;
  for (const [k, v] of got) {
    if (!exportAllowed(k) || (own && marksOf(k) !== own)) { skipped++; continue; }
    rows.push({ k, v: exportMasked(k, v) });
  }
  return {
    ok: true, ...(s.prefix ? { prefix: s.prefix, marks: { value: own.value, whose: own.whose } } : { player: s.player }),
    rows, read: got.length, skipped, limit, next: got.length >= limit ? got[got.length - 1][0] : null,
  };
}

export const adminMethods = {
  /* 'ok', 'denied', 'unconfigured', or (v2.3.5583) 'held': this address is
     in its time-out (ADMIN_LOCK above).  `xKey`: botfp.js's surface also
     takes the key in `x-admin-key` (v2.3.3323), through this same door. */
  async _adminAuth(request, xKey) {
    const key = this.env && this.env.ADMIN_KEY;
    if (!key) return 'unconfigured';
    const auth = request.headers.get('Authorization') || '';
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : (xKey ? (request.headers.get('x-admin-key') || '') : '');
    if (!supplied) return 'denied';
    const now = Date.now();
    const at = this._adminLockOn() ? adminAddress(request, typeof this._ip64On !== 'function' || this._ip64On()) : null;
    if (at && this._adminHeldFor(at, now) > 0) { this._adminLockTally('refused'); return 'held'; }
    const [a, b] = await Promise.all([this._phraseHash(supplied), this._phraseHash(key)]);
    if (a === b) { if (at && this._adminMisses) this._adminMisses.delete(at); return 'ok'; }
    this._adminLockTally('wrong');
    if (at) this._adminMiss(at, now);
    return 'denied';
  },

  /* v2.3.5583: the kill switch, read the lower-case way (TRAPS §117) */
  _adminLockOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'adminlock') && !f.adminlock);
  },

  /* ms left of this address's time-out (0: not held).  A time-out past is
     forgotten here. */
  _adminHeldFor(at, now) {
    const m = this._adminMisses;
    const e = m && m.get(at);
    if (!e || !e.until) return 0;
    if (e.until > now) return e.until - now;
    m.delete(at);
    return 0;
  },

  /* one wrong key from `at`: counted in its window; the MISSES-th within
     WINDOW_MS starts its time-out */
  _adminMiss(at, now) {
    if (!this._adminMisses) this._adminMisses = new Map();
    const m = this._adminMisses;
    let e = m.get(at);
    if (!e || now - e.first > ADMIN_LOCK.WINDOW_MS) {
      if (!e && m.size >= ADMIN_LOCK.MAP_CAP) {
        /* the quietest goes: one not held and longest since its first miss */
        let quiet = null, qAt = Infinity;
        for (const [k, v] of m) if (!(v.until > now) && v.first < qAt) { quiet = k; qAt = v.first; }
        m.delete(quiet !== null ? quiet : m.keys().next().value);
      }
      e = { n: 0, first: now, until: 0 };
    }
    e.n += 1;
    if (e.n >= ADMIN_LOCK.MISSES) {
      e.until = now + ADMIN_LOCK.HOLD_MS;
      e.n = 0; e.first = now;
      this._adminLockTally('held');
      try { console.warn('[admin] an address sent ' + ADMIN_LOCK.MISSES + ' wrong keys: timed out for ' + (ADMIN_LOCK.HOLD_MS / 60000) + ' min'); } catch (er) { /* no console */ }
    }
    m.set(at, e);
  },

  /* ═══ v2.3.5711 (card SEC PR 12): THE OWNER CAN SEE A FLOOD ═══
     A flood was counted on each session only (its dropped messages, its
     relay bytes refused) and reached no owner page.  One tally on the room,
     in MEMORY only (a deploy starts it again; nothing is written), read by
     /api/admin/overview as `floodTally`:
       - `closed`: sockets closed for sending too many messages (leave.js,
         the `flood` way, and only a session past the room's message budget:
         more than FLOOD.MSG_CLOSE_AFTER dropped, flood.js _floodDropped).
         The same door's other two closes -- no join in time (tick.js, a
         slow phone among them) and a second join -- are not counted
         (sitting 39's review);
       - `relayBytesDropped` and `relayDropsBy`: relay frames refused for their
         bytes, and why (relay.js's own room count, read as it is);
       - `ip`: refusals by address -- null until card K2's PR 10 counts them
         where they are decided (flood.js _floodIpOk, K2's file) with
         `_floodTallyAdd('ip')`;
       - `since`: when the first of these counts landed (null before one);
         the relay's counts are relay.js's, since the room woke.
     KILL SWITCH `floodtally: false`: nothing counted here, and the field is
     null.  An older Test panel reads the overview as before (one new field). */
  _floodTallyOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'floodtally') && !f.floodtally);
  },
  /* leave.js, at the `flood` way: a close for too many messages only */
  _floodTallyLeave(ws) {
    const s = this.sessions && this.sessions.get(ws);
    if (s && Number(s.msgDropped) > FLOOD_NS.FLOOD.MSG_CLOSE_AFTER) this._floodTallyAdd('closed');
  },
  _floodTallyAdd(k) {
    if (!this._floodTallyOn()) return;
    const t = this._floodTally || (this._floodTally = { since: Date.now(), closed: 0 });
    t[k] = (t[k] || 0) + 1;
  },
  _floodTallyInfo() {
    if (!this._floodTallyOn()) return null;
    const t = this._floodTally || { since: null, closed: 0 };
    return {
      since: t.since, closed: t.closed || 0,
      relayBytesDropped: this._relayByteDropped || 0,
      relayDropsBy: this._relayByteDrops ? { ...this._relayByteDrops } : {},
      ip: typeof t.ip === 'number' ? t.ip : null,   /* K2's PR 10: _floodTallyAdd('ip') */
    };
  },

  _adminLockTally(k) {
    const c = this._adminLockCount || (this._adminLockCount = { wrong: 0, held: 0, refused: 0 });
    c[k] = (c[k] || 0) + 1;
  },

  /* the overview's line: wrong keys, time-outs started and asks refused
     since this worker started, and the addresses in a time-out now */
  _adminLockInfo() {
    const c = this._adminLockCount || { wrong: 0, held: 0, refused: 0 };
    const now = Date.now();
    let heldNow = 0;
    if (this._adminMisses) for (const [, e] of this._adminMisses) if (e.until > now) heldNow++;
    return { on: this._adminLockOn(), wrong: c.wrong, held: c.held, refused: c.refused, heldNow, misses: ADMIN_LOCK.MISSES, windowMin: ADMIN_LOCK.WINDOW_MS / 60000, holdMin: ADMIN_LOCK.HOLD_MS / 60000 };
  },

  /* ═══ v2.3.3356: PUT OUT, AND OUT OF THE WORLD ═══
     Kick and Freeze deleted the session and then closed the socket, so the
     runtime's own close found no session and the leaving never ran: no save,
     no player_leave, no party or duel grace -- and every other player kept
     seeing the body, standing where it was, until the room restarted.  Now
     the AFK sweep's three steps (tick.js, flood.js _floodClose; the owner's
     Forget, devicelock.js): the close, the leaving run now, the session gone.
     A body in a fight with a player lingers as any leaver's does (linger.js). */
  async _adminPutOut(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) { /* closed */ }
    await this._playerLeaves(ws, 'kick');   /* v2.3.4830: the session door (leave.js) */
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
      /* v2.3.5285: with `fullsnap: true` the copy carries the player's other
         restored records too (playerrestore.js snapshotCopy: the vault and
         the pets under `_with`; two rows more read; v2.3.6000: ON by default, `fullsnap: false` off) */
      await this.state.storage.put('rpgsnap:' + playerId + ':' + ymd, await snapshotCopy(this, playerId, storedBlob));
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
      /* v2.3.5960 (card V5; TRAPS §76): one page, SNAPSHOT.LIST keys, on the
         join's path.  A ring kept to KEEP a class never reaches it; a ring
         that has (older data) loses its oldest dailies first, a page a day,
         as the slice below would. */
      const snaps = await this._listPage('rpgsnap:' + playerId + ':', null, SNAPSHOT.LIST);
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
      /* v2.3.5583: an address in its time-out is told how long, and nothing
         else (the key was not checked) */
      if (auth === 'held') {
        const mins = Math.max(1, Math.ceil(this._adminHeldFor(adminAddress(request, typeof this._ip64On !== 'function' || this._ip64On()), Date.now()) / 60000));
        return new Response(JSON.stringify({ ok: false, error: 'held', words: 'Too many wrong keys from this address: try again in ' + mins + ' minute(s), or from another connection.' }),
          { status: 429, headers: { ...H, 'Retry-After': String(mins * 60) } });
      }
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
          /* v2.3.3202: the tick's pacer -- the interval it uses now, and how
             far apart the ticks really start (tickpace.js) */
          tickPace: this._tickPaceInfo(),
          /* v2.3.3203: how often a walker's update waited (steadymovers.js) */
          steadyMovers: this._steadyInfo(),
          /* v2.3.3325: the move budget -- moves judged, followed past it, back
             into the Wheel from where they left, followed now (movement.js) */
          moveBudget: this._moveBudgetInfo(),
          movePath: this._movePathInfo(),   /* v2.3.3732: the message diet (movepath.js) */
          /* v2.3.3327: the last places -- kept at a leave, joins judged from
             one, followed past it, joins with none (lastplace.js) */
          lastPlace: this._lastPlaceInfo(),
          /* v2.3.4640: changes of place refused, by road ('wheel>farm_home': n):
             an honest phone never meets one, so a number here is a modified
             phone or a road the inventory missed (zonejudge.js) */
          zoneJudge: this._zoneJudgeInfo(),
          /* v2.3.3334: monster hits refused for want of the weapon, from too
             far, specials rolled ordinary for want of a paid swipe (hitproof.js) */
          hitProof: this._hitProofInfo(),
          /* v2.3.3430: test mode -- allowed (the kill switch), and how many
             characters here have it on (testmode.js) */
          testMode: this._testModeInfo(),
          /* v2.3.3344: logins checked against their character's devices
             (devicelock.js): let in on a known device, a first device
             recorded, a pass used, refused, login checks, and the one-time
             fill */
          deviceLock: this._deviceLockInfo(),
          /* v2.3.3355: new Login Keys (loginkeys.js) */
          loginKeys: this._keysInfo ? this._keysInfo() : null,
          /* v2.3.5583: the admin key's time-out -- wrong keys, time-outs
             started, asks refused, addresses held now (ADMIN_LOCK above) */
          adminLock: this._adminLockInfo(),
          /* v2.3.5711: a flood, seen (the tally above; memory only) */
          floodTally: this._floodTallyInfo(),
          /* v2.3.6443 (card DG PR 4): the wire door's refusals by row and why,
             and the fields out of their form by type and field, with the
             forms' mode (wire/door.js _wireDoorInfo; memory only) */
          wireDoor: this._wireDoorInfo ? this._wireDoorInfo() : null,
          /* v2.3.3240: the 2 s look relay -- tracks in, and how many went out
             whole, as only what changed, or not at all (lookrelay.js) */
          lookRelay: this._lookInfo(),
          /* v2.3.3243: how often the far players go out on their own, ms;
             0 is with the roster only (tick.js FAR_PLAYERS, `far_ms`) */
          farEveryMs: this._farEveryMs ? this._farEveryMs() : null,
          eventBufferLen: this.eventBuffer.length,
          protocolVersions: v,
          ts: Date.now(),
        });
      }

      if (request.method === 'GET' && path === '/economy') {
        // v2.3.1150: aggregation factored into liveops.js so the daily
        // metrics tripwire shares it.  v2.3.5607: ONE PAGE A REQUEST
        // (_economyPart; card OPS PR 8, red team RT-2 F9): `?after=` the
        // `next` the page before gave; each answer counts its page.
        const s = await this._economyPart(url.searchParams.get('after'));
        if (!s.ok) return json(s, 400);
        // Tripwire surface: last 7 daily snapshots + day-over-day
        // delta; alert when |Δ totalGold| exceeds ALERT_PCT (a sudden
        // supply jump is the dupe-exploit signature).  The daily
        // records are a ring of METRICS_KEEP (30): bounded all the same.
        const all = await this.state.storage.list({ prefix: 'metrics:', limit: 60 });
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

      /* v2.3.2613: THE PILE, AS THE WORKER HAS IT.
         Read-only operator view of this.loot, added for the "loot magnetises
         but will not pick up" hunt.  The bug is a DISAGREEMENT between what
         the client draws and what the worker holds, and until now only one
         side of it could be read: /player gives ps.x/ps.y, nothing gave the
         pile.  Every refusal reason in _handleLootPickup is decided from the
         fields below, so a failure capture can now name the gate instead of
         guessing at it.  Admin-gated like every other route here and it
         MUTATES NOTHING. */
      if (request.method === 'GET' && path === '/loot') {
        const wantZone = url.searchParams.get('zone');
        const now = Date.now();
        const out = [];
        for (const zoneId of Object.keys(this.loot)) {
          if (wantZone && zoneId !== wantZone) continue;
          for (const p of (this.loot[zoneId] || [])) {
            out.push({
              zone: zoneId,
              lootId: p.lootId,
              x: p.x, y: p.y,
              ts: p.ts,
              ageMs: now - (p.ts || 0),
              expiry: p.expiry || null,
              expired: p.expiry ? now > p.expiry : (now - p.ts > this.LOOT_EXPIRY_MS),
              coins: p.coins || 0,
              recipients: p.recipients || null,
              shares: p.shares || null,
              claimedBy: Object.keys(p.claimedBy || {}),
              inventoryClaimed: !!p.inventoryClaimed,
              weaponClaimed: !!p.weaponClaimed,
              armorClaimed: !!p.armorClaimed,
              isDeathDrop: !!p.isDeathDrop,
              ownerOnlyUntil: p.ownerOnlyUntil || null,
            });
          }
        }
        return json({ ok: true, piles: out, pickupRange: this.LOOT_PICKUP_RANGE, ts: now });
      }

      if (request.method === 'GET' && path === '/player') {
        const id = url.searchParams.get('id');
        if (!id) return json({ ok: false, error: 'id required' }, 400);
        const rpg = await this.state.storage.get('rpg:' + id);
        const auth2 = await this.state.storage.get('auth:' + id);
        const frozen = await this.state.storage.get('frozen:' + id);
        const inbox = await this.state.storage.get('inbox:' + id);
        const snaps = await this._listPage('rpgsnap:' + id + ':', null, SNAPSHOT.LIST);   /* v2.3.5961: one page (card V5; the ring is 14 at most) */
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
            lingering: !!ps.lingering, bodyWait: ps._bodyWait || 0,   /* v2.3.4455: a body left in a fight (linger.js) or taken over and waiting for its phone (bodytake.js) */
            /* v2.3.3016: stamina, maxStamina and sprint were here AND below (the
               v2.3.3006 sprint's, twice -- esbuild warned on every worker start);
               the copy below, with the stamina pool's own reasoning, is the one */
            ex: ps.ex || null, extracting: !!this.extractions[id], harvestShield: !!this._extractionShielded(id),
            /* v2.3.3392: the pose the worker keeps (poses.js), for mp-emotemoves */
            po: ps.po || null,
            /* v2.3.2273: WHAT HAPPENED TO THE LAST node_strike.
               `{ why, at, ... }` -- 'paid' when the bag was credited, otherwise
               the name of the gate that refused it (node-already-dead,
               out-of-range, no-tool, too-early, antibot-cap, ...).  Every one
               of those gates was a bare `return`, which is why "chopped logs
               are not going into my inventory" has now been reported three
               times and diagnosed from scratch three times: the client shows
               the tree falling either way, because it predicts the deplete
               locally and grants nothing (lifeSkillRewards, `if
               (!S._serverGatherNodes)`).  See gathering.js _strikeRefused. */
            lastStrike: this._lastStrikeFor(id),
            /* v2.3.2956: the hits the worker rolled for the extraction in
               flight ({nodeId, skill, level, hp, hits, windowMs}), or null on
               the old timer.  What the client PLAYED is only worth anything
               held against this. */
            hitPlan: this._gatherHitPlanFor(id),
            /* ...and how many node_strike messages the switch has seen at all,
               room-wide.  0 with a client that swears it sent one is the
               allowlist shape; >0 with lastStrike null means the handler ran
               and returned before its first stamp. */
            strikesSeen: this._strikeSeen || 0,
            /* v2.3.2279: why a bow-special blast was refused, if it was.  Same
               reasoning as lastStrike above: every gate in _handleArrowBlast is
               a silent return (a message would only tell a modified client
               which bound it hit), and a silent refusal is indistinguishable
               from a feature that never fired. */
            arrowBlast: this._arrowBlastRejectsFor(id),
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
            sprint: ps._sprintTally || null,   /* v2.3.3006: moves seen, marked, sprint steps, paid, still, ms billed */
            mana: ps.mana, maxMana: ps.maxMana } : null,
          online: !!this._wsBySessionId(id),
          auth: auth2 ? { createdAt: auth2.createdAt } : null,
          frozen: frozen || null,
          inboxCount: Array.isArray(inbox) ? inbox.length : 0,
          snapshots: [...snaps.keys()],
        });
      }

      /* v2.3.5286: THE PAGED EXPORT (exportPage above; card R PR 7): a page
         of records by a registry prefix or by one character, never a login
         key or the hidden settings.  On; `roomexport: false` turns it off
         (a read the owner pays for each time it runs). */
      if (request.method === 'GET' && path === '/export') {
        if (this._roomExportOff()) return json({ ok: false, error: 'off', words: 'The export is off: `roomexport: false` is in the live flags (clear it to use the export).' }, 409);
        const q = {};
        for (const n of ['prefix', 'player', 'cursor', 'limit']) { const v = url.searchParams.get(n); if (v !== null) q[n] = v; }
        const r = await exportPage(this.state.storage, q);
        return json(r, r.ok ? 200 : 400);
      }

      /* v2.3.2240: the owner's test kit.  Routed FIRST so it inherits the
         auth and fail-closed 404 above; returns null when the path is not
         its own, and falls through to the routes below. */
      const _dev = await this._devFetch(request, path, json);
      if (_dev) return _dev;

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
        if (target) await this._adminPutOut(target, 4008, 'admin_kick');   /* v2.3.3356 */
        await this._adminLog({ op: 'kick', playerId, reason: reason || '' });
        return json({ ok: true, wasOnline: !!target });
      }

      if (request.method === 'POST' && path === '/freeze') {
        const body = await request.json();
        const { playerId, note } = body || {};
        if (!playerId) return json({ ok: false, error: 'playerId required' }, 400);
        await this.state.storage.put('frozen:' + playerId, { ts: Date.now(), note: note || '' });
        const target = this._wsBySessionId(playerId);
        if (target) await this._adminPutOut(target, 4004, 'frozen');   /* v2.3.3356 */
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

      /* v2.3.5285 (card R PR 6): THE PLAYER'S RESTORE, MADE FROM THE REGISTRY
         (playerrestore.js): every record of theirs the copy holds, through
         the doors (the difference booked: the world's sum stays balanced),
         the `prerestore-` copy of all it overwrites in the same run of
         writes, a newer worker's record refused, and what of theirs is held
         between players named in the answer.  `dry: true` writes nothing.
         The refusals are the same words as before (player online, still in
         the world, no snapshot). */
      if (request.method === 'POST' && path === '/restore') {
        let body = null;
        try { body = await request.json(); } catch (e) { body = null; }
        const r = await playerRestore(this, body);
        const { status, ...out } = r;
        if (r.ok && !r.dry) await this._adminLog({ op: 'restore', playerId: body.playerId, snapKey: body.snapKey, restored: r.restored, copy: r.copy });
        return json(out, status || 200);
      }

      /* v2.3.5288: THE ROOM'S WAY BACK (restore.js; card R PR 9): the whole
         room put back to an earlier time, in two steps -- {step: 'plan',
         minutesAgo | at | bookmark}, the dry run and the default for any ask
         that is not a do, answers what it would restore and lose, the
         bookmark of now and the words to type back; {step: 'do', token,
         confirm} does it (every socket closed, the restore at the next start,
         the restart).  Behind this key only, by hand, never a page's word;
         OFF until `roomrewind: true` is in the live flags. */
      if (request.method === 'POST' && path === '/rewind') {
        let body = null;
        try { body = await request.json(); } catch (e) { body = null; }
        const step = body && body.step === 'do' ? 'do' : 'plan';
        const r = step === 'plan' ? await rewindPlan(this, body) : await rewindDo(this, body);
        if (r.ok && step === 'plan') await this._adminLog({ op: 'rewind-plan', at: r.at, target: r.target, now: r.now });
        return json(r, r.ok ? 200 : (r.error === 'off' || r.error === 'no-pitr' ? 409 : 400));
      }

      if (request.method === 'GET' && path === '/log') {
        const log = (await this.state.storage.get('admin_log')) || [];
        return json({ ok: true, log });
      }

      // v2.3.1150: live-ops sub-routes (flags/announce) -- auth already
      // passed above; liveops.js returns null for paths it doesn't own.
      /* v2.3.3344: the owner's tool for a character's devices (devicelock.js):
         let one new device in, or forget them all -- same contract, null for
         paths it doesn't own */
      const dl = await this._deviceLockAdminRoute(request, url, path, json);
      if (dl) return dl;
      /* v2.3.5621: the owner's silence (silence.js, card MOD) -- same contract */
      const sl = await this._silenceAdminRoute(request, url, path, json);
      if (sl) return sl;
      /* v2.3.5622: the owner's rename (charname.js, card MOD) -- same contract */
      const rn = await this._charNameAdminRoute(request, url, path, json);
      if (rn) return rn;

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
