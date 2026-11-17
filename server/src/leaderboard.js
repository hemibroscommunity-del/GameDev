/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  LEADERBOARD — Global persistent rankings
// ═══════════════════════════════════════
import { boardFace, goneId } from './boards.js';   /* v2.3.4393: a face on each row, and the deleted stand-ins */
import { POWER, cleanPowerIndex } from './power.js';   /* v2.3.5481: the power index on a row, and its board (card PW) */
import { cleanStatPoints, statOfBoard } from './statboards.js';   /* v2.3.5484: the stat boards (card PW) */

/* a player not seen for this long is off the boards (and a deleted
   character's stand-in, counted from the day it was deleted) */
const STALE_MS = 7 * 86400000;
/* ═══ v2.3.5608: THE BOARDS, KEPT A MINUTE AND SWEPT (card OPS PR 9; red team RT-2 F8, RT-3 P1) ═══
   getTop listed EVERY `player:` row for EVERY request: a row is written for
   every player who ever joined and was never deleted (the 7 days only
   filtered it out as it was read), and the route is public.  Measured in
   process (docs/security/rt2-probes/boardtop.mjs, the real class): 20,000
   rows ~55 ms and ~10 MB a request, 50,000 ~115 ms and ~25 MB, against the
   object's 128 MB.  Now:
     - each board's answer (a category and a limit) is kept TOP_TTL_MS and
       served again; a new row shows within that minute;
     - the read that makes it deletes the `player:` rows past STALE_MS it met,
       at most SWEEP_MAX a pass (the storage's own limit on one delete): they
       were on no board, and a player who comes back writes theirs again at
       their next join;
     - a row says `playtime` only on the playtime board, where it is the
       number ranked (RT-3 P1: what anyone could read of everyone);
     - a row's `lastSeen` is said to the HOUR, and the answer says so
       (`seen: 'hour'`): a time refreshed every ten minutes, for every
       player, on a public route, was a live "who plays, and when" (RT-3
       P1).  Its one reader that needs it, the prize draw page
       (public/tools/draw.html), reads the contest's window by the hour,
       rounded outward, when the board says `seen: 'hour'`;
   Kill switch `boardcache: false` (the room's live flags, said on the room's
   own posts as `bc: 0`: this object keeps no flags and asks the room
   nothing): read every time, as before; the sweep and the fields stay.
   Kill switch `boardsweep: false` (said as `bs: 0`; sitting 19b's
   gatekeeper: a delete is not undone, so it stops in one tap): no row is
   deleted; the stale rows stay off every board as before.  (The rows are a
   derived cache: rebuilt whole at the player's next report.)
   Lever `exactseen: true` (said as `xs: 1`): the exact `lastSeen` back, and
   no `seen` word, so the draw page reads to the millisecond, as every draw
   before this did: to run an old draw again exactly. */
const TOP_TTL_MS = 60000;
const SWEEP_MAX = 128;
const HOUR_MS = 3600000;

/* ═══ v2.3.5705: THE BOARD HOLDS WHAT IT KEEPS AND WHAT IT READS (card SEC PR 6) ═══
   The second red team: a negative `limit` returned nearly every row
   (`slice(0, -n)`); the kept board's key was the category AS SENT, so every
   made-up category was the level board under a new key and a full read each
   time; `updatePlayer` kept `clanTag` and five other fields of the report's
   client-reported rpgData as sent, of any size; the read listed every
   `player:` row in one list, and the sweep of stale rows ran after the sort.
   Now:
     - `limit` is held to 1 to 100 (BOARD_HOLD.LIMIT_MAX), at the route and in
       getTop;
     - the board's real name is worked out before the key (boardName): a
       category no board reads is the level board's own key;
     - each kept field is held to its type and a short length (keepRow),
       well past any honest value, and a row over ROW_MAX bytes is not kept;
     - the read lists `player:` a page of PAGE rows at a time, and the
       stale rows it met are swept before the sort.
   No kill switch: this object keeps no flags and learns the room's only by
   a field on the room's own report (`bc`, `bs`, `xs`: index.js
   reportToLeaderboard), and that file is another card's (K2's). */
/* the legacy boards and the row field each ranks (v2.3.5705: one table, read by boardName too) */
const LEGACY_KEYS = Object.freeze({ level: 'level', lifeskills: 'lifeTotal', ap: 'ap', kills: 'kills', dungeons: 'dungeons', gold: 'goldEarned', playtime: 'playtime' });
export const BOARD_HOLD = Object.freeze({ LIMIT_MAX: 100, PAGE: 1000, ROW_MAX: 4096, NAME: 64, COLOR: 32, TAG: 16, SERIES_KEYS: 64, KEY: 32 });
const wholeN = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n)) : 0; };
const shortStr = (v, max) => (typeof v === 'string' && v.length <= max ? v : null);
/** `limit` as a board reads it: a whole number from 1 to 100 (50 when none). */
export function boardLimit(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(BOARD_HOLD.LIMIT_MAX, n) : (Number.isFinite(n) ? 1 : 50);
}
/** A report's series as kept: numbers only, a bounded number of short keys. */
function keepSeries(series) {
  const out = {};
  if (!series || typeof series !== 'object' || Array.isArray(series)) return out;
  let n = 0;
  for (const k of Object.keys(series)) {
    if (n >= BOARD_HOLD.SERIES_KEYS) break;
    if (k.length > BOARD_HOLD.KEY || k === '__proto__') continue;
    const v = Number(series[k]);
    if (!Number.isFinite(v)) continue;
    out[k] = v; n++;
  }
  return out;
}

/* v2.3.5483: a row's achievement points -- the room's own count when the
   report carries it (a whole number, never below 0), else the blob's */
const apOf = (data, rpgData) => {
  const n = Number(data && data.ap);
  if (Number.isFinite(n)) return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n)));
  return rpgData?.ap || 0;
};

export class Leaderboard {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/leaderboard', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    try {
      if (request.method === 'POST' && path.startsWith('/update')) {
        const body = await request.json();
        await this.updatePlayer(body);
        return new Response(JSON.stringify({ ok: true }), { headers: H });
      }

      /* v2.3.4393: a character deleted for good (boards.js _boardsGone, over
         the object binding only: the public route is read-only, index.js) */
      if (request.method === 'POST' && path.startsWith('/gone')) {
        const body = await request.json();
        const gone = await this.markGone(body);
        return new Response(JSON.stringify({ ok: true, gone }), { headers: H });
      }

      /* v2.3.4545: THE FACES OF ROWS FROM BEFORE A ROW CARRIED ONE (boards.js _boardsFaceFill, over the object
         binding only: the public route is read-only).  `/faceless`: the live rows with no look; `/faces`
         {faces: {pid: look}}: each such row given its look -- never one that has a look already, and nothing
         else about the row (its lastSeen least of all: a filled row is not a player who played). */
      if (request.method === 'POST' && path.startsWith('/faceless')) {
        return new Response(JSON.stringify({ ok: true, ids: await this.faceless() }), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/faces')) {
        const body = await request.json();
        return new Response(JSON.stringify({ ok: true, filled: await this.fillFaces(body && body.faces) }), { headers: H });
      }

      if (request.method === 'GET' && path.startsWith('/top')) {
        const category = url.searchParams.get('category') || 'level';
        const limit = boardLimit(url.searchParams.get('limit'));   /* v2.3.5705: 1 to 100 (a negative one listed nearly every row) */
        const results = await this.getTop(category, limit);
        /* v2.3.5608: `seen: 'hour'`: each row's lastSeen is its hour (getTop) */
        return new Response(JSON.stringify({ ok: true, category, ...(this._exactSeen ? {} : { seen: 'hour' }), results }), { headers: H });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  }

  /* v2.3.4545: the live rows that have no face (set before v2.3.4393, by a player who has not been back) */
  async faceless(limit = 200) {
    const entries = await this.state.storage.list({ prefix: 'player:' });
    const now = Date.now();
    const ids = [];
    for (const [k, raw] of entries) {
      if (ids.length >= limit) break;
      try { const p = JSON.parse(raw); if (p && !p.look && now - (p.lastSeen || 0) < STALE_MS) ids.push(k.slice('player:'.length)); } catch { /* not a row */ }
    }
    return ids;
  }
  async fillFaces(faces) {
    this._top = null;   /* v2.3.5608: the faces filled show at once (once a worker's life) */
    if (!faces || typeof faces !== 'object') return 0;
    let n = 0;
    for (const pid of Object.keys(faces).slice(0, 200)) {
      const look = boardFace(faces[pid]);
      if (!look) continue;
      const raw = await this.state.storage.get('player:' + pid);
      if (!raw) continue;
      let p = null;
      try { p = JSON.parse(raw); } catch { p = null; }
      if (!p || p.look) continue;
      p.look = look;
      await this.state.storage.put('player:' + pid, JSON.stringify(p));
      n++;
    }
    return n;
  }

  async updatePlayer(data) {
    const { playerId, name, color, level, rpgData, ts, series } = data;
    /* v2.3.5608: the room's word on the boards' keeping (`boardcache`) */
    if (data && Object.prototype.hasOwnProperty.call(data, 'bc')) this._cacheOff = data.bc === 0;
    else if (data && data.playerId) this._cacheOff = false;
    /* v2.3.5608: the sweep of week-old rows (`boardsweep`), the same way */
    if (data && Object.prototype.hasOwnProperty.call(data, 'bs')) this._sweepOff = data.bs === 0;
    else if (data && data.playerId) this._sweepOff = false;
    /* v2.3.5608: and on the exact last-seen (`exactseen`), the same way */
    if (data && Object.prototype.hasOwnProperty.call(data, 'xs')) this._exactSeen = data.xs === 1;
    else if (data && data.playerId) this._exactSeen = false;
    if (!playerId) return;
    /* v2.3.4393: the face, as a look (boards.js FACE_KEYS: short ids, never
       an image) -- left off a row whose report carried none */
    const look = boardFace(data.look);
    /* v2.3.5481: the power index, as the room worked it out (power.js) --
       left off a row whose report carried none (the switch thrown), which
       is then not yet ranked on the Power board */
    const powerIndex = cleanPowerIndex(data.powerIndex);
    /* v2.3.5484: the points allocated, as the room read its own record
       (statboards.js) -- left off a row whose report carried none */
    const statPoints = cleanStatPoints(data.statPoints);
    /* v2.3.5705: an id of the id's form; every kept field held (BOARD_HOLD) */
    if (typeof playerId !== 'string' || playerId.length > 64) return;
    const rd = rpgData && typeof rpgData === 'object' ? rpgData : {};
    const row = JSON.stringify({
      ...(look ? { look } : {}),
      ...(powerIndex ? { powerIndex } : {}),
      ...(statPoints ? { statPoints } : {}),
      id: playerId, name: shortStr(name, BOARD_HOLD.NAME) || 'Anon', color: shortStr(color, BOARD_HOLD.COLOR) || '#5b52ff', level: wholeN(level) || 1,
      /* v2.3.5483: `ap` is the room's own count (index.js reportToLeaderboard,
         from ps.achievementPoints) -- the blob's only from a report that
         carries none */
      lifeTotal: wholeN(rd.lifeTotal), ap: apOf(data, rd), kills: wholeN(rd.kills),
      dungeons: wholeN(rd.dungeons), goldEarned: wholeN(rd.goldEarned), playtime: wholeN(rd.playtime),
      clanTag: shortStr(rd.clanTag, BOARD_HOLD.TAG) || null, lastSeen: wholeN(ts) || Date.now(),
      /* v2.3.1671: the per-skill board.  `series` is the SERVER's view —
         combat levels from ps.prog3, life-skill levels from ps.lifeSkills,
         kills from svKills — the same object the on-chain attestation
         signs, so the in-game board and the public ledger can never tell
         different stories.  Stored as a nested object rather than flattened
         columns so a new skill needs no schema change here either. */
      series: keepSeries(series),
    });
    /* v2.3.5705: a row past its ceiling is not kept (the last one stands) */
    if (row.length > BOARD_HOLD.ROW_MAX) return;
    await this.state.storage.put('player:' + playerId, row);
  }

  /* ═══ v2.3.4393: A DELETED CHARACTER'S STAND-IN ═══
     The owner: "is it possible to have stand-in (deleted character) rows if
     the record was made by a deleted character?  Maybe still include their
     profile pic and level but just grayed out with the deleted label over
     it."  A restart keeps the player id (the Login Key IS the character), so
     the old life's row would simply be overwritten by the new one's first
     report.  Instead it MOVES: `player:<pid>` becomes `gone:<pid>:<when>`
     with `gone` set and an id nothing else has, the new life writes a fresh
     `player:<pid>`, and getTop lists both.  A stand-in ages off the boards
     STALE_MS after the delete, as a player who stopped playing does, and is
     pruned from storage then (the sweep below: the stand-ins are the one set
     of rows here that can never be written again).  Put before delete: a
     crash between leaves both, and the old row ages out as it always did. */
  async markGone(data) {
    this._top = null;   /* v2.3.5608: a character gone is never served from a kept board (rare: a delete) */
    const playerId = data && data.playerId;
    if (!playerId || typeof playerId !== 'string') return false;
    const at = Math.floor(Number(data.ts) || Date.now());
    let moved = false;
    const raw = await this.state.storage.get('player:' + playerId);
    if (raw) {
      let p = null;
      try { p = JSON.parse(raw); } catch { p = null; }
      if (p && typeof p === 'object') {
        p.id = goneId(playerId, at);
        p.gone = at;
        p.lastSeen = at;
        await this.state.storage.put('gone:' + playerId + ':' + at, JSON.stringify(p));
        moved = true;
      }
      await this.state.storage.delete('player:' + playerId);
    }
    try {
      const old = await this.state.storage.list({ prefix: 'gone:' });
      for (const [k, v] of old) {
        let g = 0;
        try { g = JSON.parse(v).gone || 0; } catch { g = 0; }
        if (at - g >= STALE_MS) await this.state.storage.delete(k);
      }
    } catch { /* the sweep is hygiene: the next delete tries again */ }
    return moved;
  }

  /* v2.3.1671: categories that read from `series` are SERVER-AUTHORITATIVE.
     Everything in the legacy row below `kills` is still a client-reported
     claim carried in the rpgData blob, and is kept only so the old desktop
     panel keeps working. */
  static SERIES_CATEGORIES = {
    combat: null,           // null = the character level, worked out below (v2.3.3538: the highest of the three)
    melee: 'melee', bow: 'bow', magic: 'magic',
    kills: 'kills',
    woodcutting: 'woodcutting', fishing: 'fishing', mining: 'mining',
    farming: 'farming', cooking: 'cooking', blacksmithing: 'blacksmithing',
    woodworking: 'woodworking', gemCutting: 'gemCutting',
    enchanting: 'enchanting', trapping: 'trapping',
  };

  static seriesValue(p, category) {
    const s = (p && p.series) || {};
    if (category === 'combat') {
      /* Character level IS the sum of the trained skills (prog3), so it is
         derived rather than stored — one number that cannot disagree with
         the three it is made of.
         v2.3.3538: ONE LEVEL -- the character level is the HIGHEST of the
         three (prog3.js _prog3CharLevel), so the board that prints "Lv N"
         prints the level every name plate shows. */
      return Math.max(s.melee || 0, s.bow || 0, s.magic || 0);
    }
    return s[Leaderboard.SERIES_CATEGORIES[category]] || 0;
  }

  /* v2.3.5608: the board as served: kept TOP_TTL_MS (unless `boardcache`
     is off), the stale rows the read met swept, `playtime` only where it is
     ranked, `lastSeen` to the hour (unless `exactseen`).  _topRead is the
     board as it always was. */
  async getTop(category, limit) {
    /* v2.3.5705: the board's real name and a held limit, before the key */
    category = Leaderboard.boardName(category);
    limit = boardLimit(limit);
    const exact = !!this._exactSeen;
    const k = String(category) + ':' + String(limit) + (exact ? ':x' : '');
    const now = Date.now();
    if (!this._top) this._top = new Map();
    const kept = this._top.get(k);
    if (!this._cacheOff && kept && now - kept.at < TOP_TTL_MS) return kept.rows;
    const stale = [];
    const rows = (await this._topRead(category, limit, stale)).map((r) => {
      const o = { ...r };
      if (category !== 'playtime') delete o.playtime;
      if (!exact && typeof o.lastSeen === 'number') o.lastSeen = Math.floor(o.lastSeen / HOUR_MS) * HOUR_MS;
      return o;
    });
    /* `boardsweep: false`: nothing deleted (the rows stay off the boards) */
    if (stale.length && !this._sweepOff) { try { await this.state.storage.delete(stale.slice(0, SWEEP_MAX)); } catch { /* swept next time */ } }
    if (!this._cacheOff) {
      this._top.set(k, { at: now, rows });
      if (this._top.size > 256) this._top.delete(this._top.keys().next().value);   /* a cap: categories x limits */
    }
    return rows;
  }

  /* v2.3.5705: a category's board, by its real name: one a board reads, or
     the level board (the board every other category always fell back to) */
  static boardName(category) {
    const c = typeof category === 'string' ? category : '';
    if (c === 'power' || statOfBoard(c) || Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, c)
      || Object.prototype.hasOwnProperty.call(LEGACY_KEYS, c)) return c;
    return 'level';
  }

  /* v2.3.5705: every `player:` row, a page at a time (BOARD_HOLD.PAGE) */
  async _playerPages(each) {
    let after = null;
    for (let guard = 0; guard < 10000; guard++) {
      const page = await this.state.storage.list({ prefix: 'player:', limit: BOARD_HOLD.PAGE, ...(after !== null ? { startAfter: after } : {}) });
      let n = 0, last = null;
      for (const [key, raw] of page) {
        if (after !== null && key <= after) continue;   /* a storage that ignores startAfter (a test's) */
        n++; last = key;
        each(key, raw);
      }
      if (n < BOARD_HOLD.PAGE || last === null) return;
      after = last;
    }
  }

  async _topRead(category, limit, stale) {
    const players = []; const now = Date.now(); const STALE = STALE_MS;
    /* v2.3.4393: `lv`, the level on the name plate -- the highest of the
       three combat levels (seriesValue's 'combat'), the stored level for a
       row from before the series -- so every board can print it beside the
       face, whatever it ranks */
    const withLv = (p) => { p.lv = Leaderboard.seriesValue(p, 'combat') || Math.max(1, Math.floor(Number(p.level) || 1)); return p; };
    await this._playerPages((key, raw) => {
      try {
        const p = JSON.parse(raw);
        if (now - (p.lastSeen || 0) < STALE) players.push(withLv(p));
        else if (stale && stale.length < SWEEP_MAX) stale.push(key);   /* v2.3.5608: on no board: swept */
      } catch {}
    });
    /* v2.3.5705: the sweep before the sort (it was after it, in getTop):
       `boardsweep: false` deletes nothing */
    if (stale && stale.length && !this._sweepOff) {
      try { await this.state.storage.delete(stale.slice(0, SWEEP_MAX)); } catch { /* swept next time */ }
      stale.length = 0;
    }
    /* v2.3.4393: and the deleted characters' stand-ins (markGone) -- on the
       boards the Leaderboards page shows (the series and AP) only.  The
       legacy columns keep to live characters: `level` is what the contest
       draw reads its entrants from (public/tools/draw.html), and a deleted
       character must never be drawn. */
    const standIns = category === 'ap' || category === 'power' || !!statOfBoard(category) || Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, category);
    if (standIns) try {
      const gone = await this.state.storage.list({ prefix: 'gone:' });
      for (const [, raw] of gone) { try { const p = JSON.parse(raw); if (p && p.gone && now - (p.lastSeen || 0) < STALE) players.push(withLv(p)); } catch {} }
    } catch { /* a board without its stand-ins is still a board */ }

    /* ═══ v2.3.5481: THE POWER BOARD (power.js, card PW) ═══
       Sorted by the power index's `power`; each row's `value` is it, and
       its `powerIndex` the three styles beside it.  A row with no index, or
       another version's (POWER.V), is NOT YET RANKED: left off, never a 0
       on top of anything.  A deleted character's stand-in keeps the index
       it was retired with, as its skill rows keep theirs. */
    if (category === 'power') {
      const val = (p) => {
        const ix = cleanPowerIndex(p && p.powerIndex);
        return ix && ix.v === POWER.V ? ix.power : 0;
      };
      return players.filter((p) => val(p) > 0)
        .sort((a, b) => val(b) - val(a))
        .slice(0, limit)
        .map((p) => ({ ...p, value: val(p) }));
    }

    /* ═══ v2.3.5484: THE STAT BOARDS (statboards.js, card PW) ═══
       `pts_<stat>`: by the points the row's player allocated to that stat
       (`pts_dmg`: the three weapons' damage points summed); a row without
       them, or with none in it, is off the board, as on the skill boards. */
    const stat = statOfBoard(category);
    if (stat) {
      const val = (p) => { const sp = cleanStatPoints(p && p.statPoints); return sp ? sp[stat] : 0; };
      return players.filter((p) => val(p) > 0)
        .sort((a, b) => val(b) - val(a))
        .slice(0, limit)
        .map((p) => ({ ...p, value: val(p) }));
    }

    if (Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, category)) {
      const val = (p) => Leaderboard.seriesValue(p, category);
      /* Drop players with nothing in this column: a hiscores page listing
         fifty people at 0 fishing is worse than a short honest one. */
      return players.filter((p) => val(p) > 0)
        .sort((a, b) => val(b) - val(a))
        .slice(0, limit)
        .map((p) => ({ ...p, value: val(p) }));
    }

    const key = LEGACY_KEYS[category] || 'level';
    players.sort((a, b) => (b[key] || 0) - (a[key] || 0));
    return players.slice(0, limit);
  }
}
