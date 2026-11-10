/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  LEADERBOARD — Global persistent rankings
// ═══════════════════════════════════════
import { boardFace, goneId } from './boards.js';   /* v2.3.4393: a face on each row, and the deleted stand-ins */

/* a player not seen for this long is off the boards (and a deleted
   character's stand-in, counted from the day it was deleted) */
const STALE_MS = 7 * 86400000;

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

      if (request.method === 'GET' && path.startsWith('/top')) {
        const category = url.searchParams.get('category') || 'level';
        const limit = Math.min(100, parseInt(url.searchParams.get('limit')) || 50);
        const results = await this.getTop(category, limit);
        return new Response(JSON.stringify({ ok: true, category, results }), { headers: H });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  }

  async updatePlayer(data) {
    const { playerId, name, color, level, rpgData, ts, series } = data;
    if (!playerId) return;
    /* v2.3.4393: the face, as a look (boards.js FACE_KEYS: short ids, never
       an image) -- left off a row whose report carried none */
    const look = boardFace(data.look);
    await this.state.storage.put('player:' + playerId, JSON.stringify({
      ...(look ? { look } : {}),
      id: playerId, name: name || 'Anon', color: color || '#5b52ff', level: level || 1,
      lifeTotal: rpgData?.lifeTotal || 0, ap: rpgData?.ap || 0, kills: rpgData?.kills || 0,
      dungeons: rpgData?.dungeons || 0, goldEarned: rpgData?.goldEarned || 0, playtime: rpgData?.playtime || 0,
      clanTag: rpgData?.clanTag || null, lastSeen: ts || Date.now(),
      /* v2.3.1671: the per-skill board.  `series` is the SERVER's view —
         combat levels from ps.prog3, life-skill levels from ps.lifeSkills,
         kills from svKills — the same object the on-chain attestation
         signs, so the in-game board and the public ledger can never tell
         different stories.  Stored as a nested object rather than flattened
         columns so a new skill needs no schema change here either. */
      series: (series && typeof series === 'object') ? series : {},
    }));
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

  async getTop(category, limit) {
    const entries = await this.state.storage.list({ prefix: 'player:' });
    const players = []; const now = Date.now(); const STALE = STALE_MS;
    /* v2.3.4393: `lv`, the level on the name plate -- the highest of the
       three combat levels (seriesValue's 'combat'), the stored level for a
       row from before the series -- so every board can print it beside the
       face, whatever it ranks */
    const withLv = (p) => { p.lv = Leaderboard.seriesValue(p, 'combat') || Math.max(1, Math.floor(Number(p.level) || 1)); return p; };
    for (const [, raw] of entries) { try { const p = JSON.parse(raw); if (now - (p.lastSeen || 0) < STALE) players.push(withLv(p)); } catch {} }
    /* v2.3.4393: and the deleted characters' stand-ins (markGone) -- on the
       boards the Leaderboards page shows (the series and AP) only.  The
       legacy columns keep to live characters: `level` is what the contest
       draw reads its entrants from (public/tools/draw.html), and a deleted
       character must never be drawn. */
    const standIns = category === 'ap' || Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, category);
    if (standIns) try {
      const gone = await this.state.storage.list({ prefix: 'gone:' });
      for (const [, raw] of gone) { try { const p = JSON.parse(raw); if (p && p.gone && now - (p.lastSeen || 0) < STALE) players.push(withLv(p)); } catch {} }
    } catch { /* a board without its stand-ins is still a board */ }

    if (Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, category)) {
      const val = (p) => Leaderboard.seriesValue(p, category);
      /* Drop players with nothing in this column: a hiscores page listing
         fifty people at 0 fishing is worse than a short honest one. */
      return players.filter((p) => val(p) > 0)
        .sort((a, b) => val(b) - val(a))
        .slice(0, limit)
        .map((p) => ({ ...p, value: val(p) }));
    }

    const key = { level:'level', lifeskills:'lifeTotal', ap:'ap', kills:'kills', dungeons:'dungeons', gold:'goldEarned', playtime:'playtime' }[category] || 'level';
    players.sort((a, b) => (b[key] || 0) - (a[key] || 0));
    return players.slice(0, limit);
  }
}
