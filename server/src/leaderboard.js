/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  LEADERBOARD — Global persistent rankings
// ═══════════════════════════════════════

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
    await this.state.storage.put('player:' + playerId, JSON.stringify({
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

  /* v2.3.1671: categories that read from `series` are SERVER-AUTHORITATIVE.
     Everything in the legacy row below `kills` is still a client-reported
     claim carried in the rpgData blob, and is kept only so the old desktop
     panel keeps working. */
  static SERIES_CATEGORIES = {
    combat: null,           // null = sum of the three combat skills
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
         the three it is made of. */
      return (s.melee || 0) + (s.bow || 0) + (s.magic || 0);
    }
    return s[Leaderboard.SERIES_CATEGORIES[category]] || 0;
  }

  async getTop(category, limit) {
    const entries = await this.state.storage.list({ prefix: 'player:' });
    const players = []; const now = Date.now(); const STALE = 7 * 86400000;
    for (const [, raw] of entries) { try { const p = JSON.parse(raw); if (now - (p.lastSeen || 0) < STALE) players.push(p); } catch {} }

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
