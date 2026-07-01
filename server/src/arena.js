/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  ARENA — Cross-room gladiator tournament
//  10 rounds, single elimination, blind matchup
// ═══════════════════════════════════════

export class Arena {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/arena', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    try {
      // POST /join — enter the queue (costs gold, validated client-side)
      if (request.method === 'POST' && path.startsWith('/join')) {
        const body = await request.json();
        return new Response(JSON.stringify(await this.joinQueue(body)), { headers: H });
      }

      // POST /leave — leave the queue
      if (request.method === 'POST' && path.startsWith('/leave')) {
        const body = await request.json();
        return new Response(JSON.stringify(await this.leaveQueue(body.playerId)), { headers: H });
      }

      // GET /status?playerId=X — check queue/match status
      if (request.method === 'GET' && path.startsWith('/status')) {
        const pid = url.searchParams.get('playerId');
        return new Response(JSON.stringify(await this.getStatus(pid)), { headers: H });
      }

      // POST /result — report a match result (winner reports)
      if (request.method === 'POST' && path.startsWith('/result')) {
        const body = await request.json();
        return new Response(JSON.stringify(await this.reportResult(body)), { headers: H });
      }

      // GET /tournament — get current tournament state (for spectators)
      if (request.method === 'GET' && path.startsWith('/tournament')) {
        return new Response(JSON.stringify(await this.getTournament()), { headers: H });
      }

      // GET /history — past gladiator winners
      if (request.method === 'GET' && path.startsWith('/history')) {
        return new Response(JSON.stringify(await this.getHistory()), { headers: H });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  }

  async joinQueue(data) {
    const { playerId, name, level, color } = data;
    if (!playerId || !name) return { ok: false, error: 'Missing fields' };

    // Check if already in queue or active tournament
    const queue = await this.getQueue();
    if (queue.find(p => p.id === playerId)) return { ok: false, error: 'Already in queue' };

    const tournament = await this.getActiveTournament();
    if (tournament) {
      const inTournament = tournament.players.find(p => p.id === playerId);
      if (inTournament && !inTournament.eliminated) return { ok: false, error: 'Already in tournament' };
    }

    const entry = { id: playerId, name, level: level || 1, color: color || '#5b52ff', joinedAt: Date.now() };
    queue.push(entry);
    await this.state.storage.put('queue', JSON.stringify(queue));

    // Check if we have enough players to start (minimum 8, max 16, or start after 2min with 4+)
    const TOURNAMENT_MIN = 4;
    const TOURNAMENT_IDEAL = 16;
    const QUEUE_TIMEOUT = 120000; // 2 min

    const oldestEntry = queue.reduce((min, p) => Math.min(min, p.joinedAt), Infinity);
    const queueAge = Date.now() - oldestEntry;

    if (queue.length >= TOURNAMENT_IDEAL || (queue.length >= TOURNAMENT_MIN && queueAge >= QUEUE_TIMEOUT)) {
      // Start tournament!
      const players = queue.splice(0, TOURNAMENT_IDEAL).map(p => ({ ...p, eliminated: false, wins: 0, round: 0 }));
      await this.state.storage.put('queue', JSON.stringify(queue));

      const tournament = {
        id: 'arena-' + Date.now(),
        players,
        round: 1,
        maxRounds: 10,
        matches: [],       // {round, p1id, p2id, winnerId, ts}
        currentMatches: [], // active matches this round
        startTime: Date.now(),
        status: 'active',   // 'active' | 'complete'
        champion: null,
        spectators: [],
      };

      // Generate round 1 matchups
      tournament.currentMatches = this.generateMatchups(tournament);
      await this.state.storage.put('tournament', JSON.stringify(tournament));

      return { ok: true, started: true, tournament: this.sanitizeTournament(tournament), position: null };
    }

    return { ok: true, started: false, queuePosition: queue.length, queueSize: queue.length };
  }

  async leaveQueue(playerId) {
    if (!playerId) return { ok: false, error: 'Missing playerId' };
    let queue = await this.getQueue();
    const before = queue.length;
    queue = queue.filter(p => p.id !== playerId);
    await this.state.storage.put('queue', JSON.stringify(queue));
    return { ok: true, removed: queue.length < before };
  }

  async getStatus(playerId) {
    if (!playerId) return { ok: false, error: 'Missing playerId' };

    // Check queue
    const queue = await this.getQueue();
    const inQueue = queue.findIndex(p => p.id === playerId);
    if (inQueue >= 0) {
      return { ok: true, status: 'queued', position: inQueue + 1, queueSize: queue.length };
    }

    // Check active tournament
    const tournament = await this.getActiveTournament();
    if (tournament) {
      const player = tournament.players.find(p => p.id === playerId);
      if (player) {
        const myMatch = tournament.currentMatches.find(m => m.p1 === playerId || m.p2 === playerId);
        return {
          ok: true,
          status: player.eliminated ? 'eliminated' : (myMatch ? 'fighting' : 'waiting'),
          tournament: this.sanitizeTournament(tournament),
          currentMatch: myMatch || null,
          round: tournament.round,
          wins: player.wins,
          eliminated: player.eliminated,
        };
      }
    }

    return { ok: true, status: 'none' };
  }

  async reportResult(data) {
    const { tournamentId, matchId, winnerId, loserId } = data;
    if (!tournamentId || !matchId || !winnerId || !loserId) return { ok: false, error: 'Missing fields' };

    const tournament = await this.getActiveTournament();
    if (!tournament || tournament.id !== tournamentId) return { ok: false, error: 'Tournament not found' };

    // Find and resolve the match
    const matchIdx = tournament.currentMatches.findIndex(m => m.id === matchId);
    if (matchIdx < 0) return { ok: false, error: 'Match not found' };

    const match = tournament.currentMatches[matchIdx];
    if (match.resolved) return { ok: false, error: 'Already resolved' };

    match.resolved = true;
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.resolvedAt = Date.now();

    // Update player states
    const winner = tournament.players.find(p => p.id === winnerId);
    const loser = tournament.players.find(p => p.id === loserId);
    if (winner) winner.wins++;
    if (loser) loser.eliminated = true;

    // Record in match history
    tournament.matches.push({ round: tournament.round, p1: match.p1, p2: match.p2, winnerId, loserId, ts: Date.now() });

    // Check if all matches this round are resolved
    const allResolved = tournament.currentMatches.every(m => m.resolved);
    if (allResolved) {
      const remaining = tournament.players.filter(p => !p.eliminated);

      if (remaining.length <= 1 || tournament.round >= tournament.maxRounds) {
        // Tournament complete!
        tournament.status = 'complete';
        tournament.champion = remaining[0] || null;
        tournament.endTime = Date.now();

        // Record in hall of fame
        if (tournament.champion) {
          const history = await this.getHistoryData();
          history.push({
            championId: tournament.champion.id,
            championName: tournament.champion.name,
            championLevel: tournament.champion.level,
            wins: tournament.champion.wins,
            totalPlayers: tournament.players.length,
            rounds: tournament.round,
            ts: Date.now(),
          });
          // Keep last 50 champions
          if (history.length > 50) history.splice(0, history.length - 50);
          await this.state.storage.put('history', JSON.stringify(history));
        }
      } else {
        // Advance to next round
        tournament.round++;
        tournament.currentMatches = this.generateMatchups(tournament);
      }
    }

    await this.state.storage.put('tournament', JSON.stringify(tournament));

    return {
      ok: true,
      tournament: this.sanitizeTournament(tournament),
      roundComplete: allResolved,
      tournamentComplete: tournament.status === 'complete',
      champion: tournament.champion,
    };
  }

  async getTournament() {
    const tournament = await this.getActiveTournament();
    const queue = await this.getQueue();
    return { ok: true, tournament: tournament ? this.sanitizeTournament(tournament) : null, queueSize: queue.length };
  }

  async getHistory() {
    const history = await this.getHistoryData();
    return { ok: true, champions: history.slice(-20).reverse() };
  }

  // ── Helpers ──

  generateMatchups(tournament) {
    const active = tournament.players.filter(p => !p.eliminated);
    // Shuffle for blind matchup
    for (let i = active.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [active[i], active[j]] = [active[j], active[i]];
    }
    const matches = [];
    for (let i = 0; i < active.length - 1; i += 2) {
      matches.push({
        id: 'match-' + tournament.round + '-' + (i / 2) + '-' + Date.now(),
        round: tournament.round,
        p1: active[i].id,
        p1Name: active[i].name,
        p1Level: active[i].level,
        p1Color: active[i].color,
        p2: active[i + 1].id,
        p2Name: active[i + 1].name,
        p2Level: active[i + 1].level,
        p2Color: active[i + 1].color,
        resolved: false,
        winnerId: null,
        loserId: null,
      });
    }
    // If odd player count, last player gets a bye (auto-win)
    if (active.length % 2 === 1) {
      const bye = active[active.length - 1];
      bye.wins++;
      tournament.matches.push({ round: tournament.round, p1: bye.id, p2: 'BYE', winnerId: bye.id, loserId: null, ts: Date.now() });
    }
    return matches;
  }

  sanitizeTournament(t) {
    return {
      id: t.id,
      round: t.round,
      maxRounds: t.maxRounds,
      status: t.status,
      champion: t.champion,
      startTime: t.startTime,
      endTime: t.endTime,
      playerCount: t.players.length,
      remaining: t.players.filter(p => !p.eliminated).length,
      players: t.players.map(p => ({ id: p.id, name: p.name, level: p.level, color: p.color, eliminated: p.eliminated, wins: p.wins })),
      currentMatches: t.currentMatches,
      recentMatches: t.matches.slice(-10),
    };
  }

  async getQueue() {
    try { return JSON.parse(await this.state.storage.get('queue') || '[]'); } catch { return []; }
  }

  async getActiveTournament() {
    try {
      const raw = await this.state.storage.get('tournament');
      if (!raw) return null;
      const t = JSON.parse(raw);
      // Auto-expire stale tournaments (older than 1 hour)
      if (Date.now() - t.startTime > 3600000) {
        await this.state.storage.delete('tournament');
        return null;
      }
      return t;
    } catch { return null; }
  }

  async getHistoryData() {
    try { return JSON.parse(await this.state.storage.get('history') || '[]'); } catch { return []; }
  }
}
