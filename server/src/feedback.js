/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  FEEDBACK — In-game community feedback board
//  Categories: BUG, BALANCE, REMOVE, ADD, QOL, PRAISE
//  Topics: arena, guild, combat, pets, crafting, marketplace, etc.
// ═══════════════════════════════════════

import { cleanChatText } from './chatguard.js';   /* v2.3.5593: the chat lanes' own cleaning, for a name */
import { requestIp, ROOMS } from './flood.js';    /* v2.3.5593: the caller's address (Cloudflare's edge), and the room the flags live in */

/* v2.3.2820: the longest report the board keeps (see submit). */
const FEEDBACK_TEXT_MAX = 500;

/* ═══ v2.3.5593: THE BOARD'S WORDS ARE WORDS, AND ITS OWNER CAN TAKE ONE DOWN ═══
 * The red team (2026-11-14, RT-3 S3 and P1, docs/security/rt3-findings.md):
 * /api/feedback reaches this object straight from the worker's router --
 * before the origin lock, outside the room's wire door -- and every field was
 * kept as it came.  Proven on the node room: a name of 5,000 characters, and
 * a name that was an OBJECT, were kept and served back by /list; the panel
 * prints the name as React text, React THROWS on an object, and the page had
 * no error boundary, so one post blanked the game for whoever opened
 * Feedback, and nobody could take it down.  And /crashes handed every crash
 * report (a browser's User-Agent, log lines naming a character) to anyone.
 * Now:
 *   - a name and a topic are strings, cleaned as a chat line is
 *     (chatguard.js cleanChatText: no hidden or direction characters, spaces
 *     collapsed) and cut to FEEDBACK_NAME_MAX / FEEDBACK_TOPIC_MAX; anything
 *     else, or nothing left, is refused;
 *   - what the board SERVES is cleaned the same way (sanitize), so a ticket
 *     kept before this version reads as words too;
 *   - DELETE /ticket?id= removes one, and GET /crashes reads the crash feed,
 *     both behind the owner's key (ADMIN_KEY, `Authorization: Bearer`, as
 *     admin.js), a plain 404 without it (fail closed, as every admin route).
 * And the red team's RT-1 (N2, N3), folded in: every write here was paced
 * only by an id the caller makes up (`rate:<playerId>`, `crashrate:<sid>`),
 * each pace a ROW never deleted -- 200 of 200 submits with fresh ids taken in
 * one second, 3 rows each, so one laptop could spend the account's day of
 * writes (100,000 on the free plan, then every save in the game fails until
 * midnight) in under 3 minutes; and a name of 1.9 MB was a row (50 of them
 * black-screen a phone opening the board), and `_stats`, one key a topic ever
 * posted, reached SQLite's 2 MB.  Now:
 *   - the paces are in MEMORY (FEEDBACK_PACE), by the caller's ADDRESS
 *     (flood.js requestIp: Cloudflare's edge sets it; none locally, which is
 *     not counted; an IPv6 line by its /64, feedbackAddr) and the id it
 *     claims, under a ceiling for the whole game an hour, and a budget of
 *     ROWS_HOUR rows an hour for the whole object; a refusal writes nothing;
 *     a deploy resets them, which is right for a flood's limit
 *     (ARCHITECTURE-HANDOFF rule 11); no `rate:` row is written again; one
 *     claimed id an address a ticket for a vote;
 *   - `_stats` keeps at most FEEDBACK_PACE.STATS_KEYS topics;
 *   - DELETE /sweep (the owner's key) takes away every ticket row over
 *     FEEDBACK_PACE.BIG_ROW characters, the old pace rows, and rebuilds
 *     `_stats` from the tickets left;
 *   - KILL SWITCH `feedback: false` in the live flags closes the board to
 *     writes (posts, votes, crash reports); reading stays.  This object has
 *     no flags of its own: it reads the room's (liveops.js GET
 *     /api/admin/flags, with the owner's key, over the binding) at most once a
 *     FLAG_TTL_MS, and only for a write the paces took: a refused write never
 *     asks the room, and a burst shares one read (`_flagAt` is set before the
 *     request goes).  No key or no answer: open, as before.
 * The page's half: FeedbackPanel prints String(), and lazyPanel.js's guard
 * catches a window that throws. */
export const FEEDBACK_NAME_MAX = 24;
export const FEEDBACK_PACE = Object.freeze({
  /* an address (an IPv6 line by its /64), an hour: the old per-id limits (5
     posts, 12 crash reports), and votes */
  POSTS_ADDR: 5, CRASH_ADDR: 12, VOTES_ADDR: 60,
  /* the same per claimed id (a phone behind a shared address keeps its own five) */
  POSTS_ID: 5, CRASH_ID: 12, VOTES_ID: 60,
  /* the whole game, an hour, each kind: the board holds a few hundred posts
     in all its life, so a real crowd never meets these */
  POSTS_ALL: 60, CRASH_ALL: 120, VOTES_ALL: 150,
  /* ...and the WHOLE OBJECT's rows an hour (a post 2: its ticket and
     `_stats`; a crash report 1; a vote 1), past which every write is refused
     and the refusal writes nothing: at most 7,200 rows a day, 7% of the free
     plan's 100,000 (the game's busiest day so far wrote 747 in all) */
  ROWS_HOUR: 300,
  HOUR_MS: 3600000,
  /* the memory a pace may hold: past it the expired go, then the oldest */
  KEYS_MAX: 5000,
  STATS_KEYS: 100,
  BIG_ROW: 4096,
  FLAG_TTL_MS: 60000,
});
export const FEEDBACK_TOPIC_MAX = 32;
/* v2.3.5593: what a refused post says (the panel prints the error as it comes) */
const FEEDBACK_WORDS = Object.freeze({
  paced: 'Too many reports from here for now. Try again in a while.',
  closed: 'The feedback board is closed for now.',
  oneVote: 'One vote from here for this report.',
});
/* the line's control characters, which the lanes strip before
   cleanChatText; a name keeps none, a line break least of all */
const CONTROL = /[\x00-\x1f\x7f]/g;
/** A name or a topic as the board keeps it: a string, cleaned and cut to
 *  `max` characters (whole ones), or '' when nothing is left. */
export function feedbackWords(v, max) {
  if (typeof v !== 'string') return '';
  const s = cleanChatText(v.replace(CONTROL, ' '));
  return Array.from(s).slice(0, max).join('').trim();
}
/* v2.3.5593: the address a pace counts.  An IPv6 line is given a whole /64,
   and a script takes a new address of it for every request (the red team,
   RT-1 N4), so an IPv6 address counts as its /64; IPv4, and IPv4 written as
   IPv6, as itself.  The same rule as RT-1's flood.js ipKey (v2.3.5581, not
   yet on main as this is written): this local copy goes once that lands. */
const HEX4 = /^[0-9a-f]{1,4}$/;
export function feedbackAddr(ip) {
  if (typeof ip !== 'string' || ip.indexOf(':') < 0) return ip || null;
  let s = ip.trim().toLowerCase();
  const pct = s.indexOf('%');
  if (pct >= 0) s = s.slice(0, pct);
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (mapped) return mapped[1];
  const halves = s.split('::');
  if (halves.length > 2) return ip;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  let groups;
  if (halves.length === 1) groups = head;
  else {
    const fill = 8 - head.length - tail.length;
    if (fill < 1) return ip;
    groups = head.concat(new Array(fill).fill('0'), tail);
  }
  if (groups.length !== 8 || !groups.every((g) => HEX4.test(g))) return ip;
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/* SHA-256 of a key, hex: the owner's key compared by its hash, as admin.js's
   _adminAuth compares it */
async function keyHash(k) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btv1|' + k));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class Feedback {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/feedback', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    try {
      // POST /submit — create a new feedback ticket
      if (request.method === 'POST' && path.startsWith('/submit')) {
        const body = await request.json();
        /* v2.3.5593: paced by address (RT-1 N2), then the owner's switch (submit) */
        return new Response(JSON.stringify(await this.submit(body, feedbackAddr(requestIp(request)))), { headers: H });
      }

      // GET /list?sort=top|trending|new&topic=&category=&limit=&offset=
      if (request.method === 'GET' && path.startsWith('/list')) {
        const sort = url.searchParams.get('sort') || 'top';
        const topic = url.searchParams.get('topic') || null;
        const category = url.searchParams.get('category') || null;
        const limit = Math.min(50, parseInt(url.searchParams.get('limit')) || 20);
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        return new Response(JSON.stringify(await this.list(sort, topic, category, limit, offset)), { headers: H });
      }

      // POST /vote — thumbs up or down
      if (request.method === 'POST' && path.startsWith('/vote')) {
        const body = await request.json();
        return new Response(JSON.stringify(await this.vote(body, feedbackAddr(requestIp(request)))), { headers: H });
      }

      // GET /stats — aggregate counts per topic/category
      if (request.method === 'GET' && path.startsWith('/stats')) {
        return new Response(JSON.stringify(await this.getStats()), { headers: H });
      }

      // POST /crash — crash-telemetry upload from crashTrap.js (v2.3.782).
      // Body may arrive as text/plain (sendBeacon can't send JSON without
      // a CORS preflight), so parse the text ourselves.
      if (request.method === 'POST' && path.startsWith('/crash')) {
        let body = null;
        try { body = JSON.parse(await request.text()); } catch (e) { /* fall through */ }
        return new Response(JSON.stringify(await this.crashReport(body, feedbackAddr(requestIp(request)))), { headers: H });
      }

      // GET /crashes?limit=50 — recent crash reports, newest first
      // v2.3.5593: the owner's (and the QA tools') only: a plain 404 without the key
      if (request.method === 'GET' && path.startsWith('/crashes')) {
        if (!(await this._ownerKey(request))) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
        const limit = Math.min(200, parseInt(url.searchParams.get('limit')) || 50);
        const all = JSON.parse(await this.state.storage.get('_crashlog') || '[]');
        return new Response(JSON.stringify({ ok: true, count: all.length, reports: all.slice(-limit).reverse() }), { headers: H });
      }

      // DELETE /ticket?id= — v2.3.5593: the owner takes a ticket down (a plain 404 without the key)
      if (request.method === 'DELETE' && path.startsWith('/ticket')) {
        if (!(await this._ownerKey(request))) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
        return new Response(JSON.stringify(await this.removeTicket(url.searchParams.get('id'))), { headers: H });
      }

      // DELETE /sweep — v2.3.5593: the owner takes away every oversized ticket and the old pace rows (RT-1 N3)
      if (request.method === 'DELETE' && path.startsWith('/sweep')) {
        if (!(await this._ownerKey(request))) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
        return new Response(JSON.stringify(await this.sweep()), { headers: H });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  }

  /* v2.3.782: crash telemetry.  crashTrap.js uploads its ring buffer so
     iPhone field failures stop depending on the owner screenshotting the
     ?dev=1 banner before iOS evicts the page.  Prototype-grade by design:
     one storage key, 200-report ring, soft per-session rate limit.  Every
     field is length-clamped -- the endpoint is public. */
  async crashReport(data, addr) {
    const { sid, v, ua, zone, log } = data || {};
    if (!sid || !Array.isArray(log) || !log.length) return { ok: false, error: 'Missing fields' };
    /* v2.3.5593: paced in memory by address, id and the whole game; no `crashrate:` row (RT-1 N2) */
    if (!this._paced('crash', addr, String(sid).slice(0, 32))) return { ok: false, error: 'Rate limited' };
    if (!(await this._boardOpen())) return { ok: false, error: FEEDBACK_WORDS.closed };
    const report = {
      ts: Date.now(),
      sid: String(sid).slice(0, 32),
      v: String(v || '?').slice(0, 16),
      ua: String(ua || '').slice(0, 160),
      zone: String(zone || '').slice(0, 24),
      log: log.slice(-16).map((e) => ({
        t: String((e && e.t) || '').slice(0, 24),
        kind: String((e && e.kind) || '?').slice(0, 24),
        msg: String((e && e.msg) || '').slice(0, 300),
      })),
    };
    const all = JSON.parse(await this.state.storage.get('_crashlog') || '[]');
    all.push(report);
    while (all.length > 200) all.shift();
    await this.state.storage.put('_crashlog', JSON.stringify(all));
    return { ok: true };
  }

  async submit(data, addr) {
    const { playerId, category, text } = data || {};
    /* v2.3.5593: the name and the topic are words, cleaned and cut; an object,
       a number or a name of nothing but hidden characters is refused */
    const playerName = feedbackWords(data && data.playerName, FEEDBACK_NAME_MAX);
    const topic = feedbackWords(data && data.topic, FEEDBACK_TOPIC_MAX);
    if (typeof playerId !== 'string' || !playerId || !playerName || !category || !topic || !text) return { ok: false, error: 'Missing fields' };
    /* v2.3.2820: 100 -> 500.  The mobile panel -- the only one a player can
       reach -- has offered a 500-character box since v2.3.1232, and a real
       bug report ("I was in the dunes, tapped X, and Y happened") does not
       fit in 100.  The legacy panel's own 100 cap is a client limit and
       stays; this is the ceiling, not a target. */
    if (typeof text !== 'string' || text.length > FEEDBACK_TEXT_MAX) return { ok: false, error: 'Max ' + FEEDBACK_TEXT_MAX + ' characters' };

    const VALID_CATEGORIES = ['bug', 'balance', 'remove', 'add', 'qol', 'praise'];
    if (!VALID_CATEGORIES.includes(category)) return { ok: false, error: 'Invalid category' };

    // Rate limit: max 5 submissions per player per hour
    /* v2.3.5593: ...and per address, under a ceiling for the whole game, in
       memory: the `rate:` row it wrote each time was the flood (RT-1 N2) */
    if (!this._paced('posts', addr, playerId.slice(0, 64))) return { ok: false, error: FEEDBACK_WORDS.paced };
    /* the owner's switch, asked only for a write the paces took (a refused one never asks the room) */
    if (!(await this._boardOpen())) return { ok: false, error: FEEDBACK_WORDS.closed };

    const ticket = {
      id: crypto.randomUUID(),
      playerId, playerName, category, topic,
      text: text.slice(0, FEEDBACK_TEXT_MAX),
      up: 0, down: 0,
      voters: {}, // { playerId: 'up'|'down' }
      ts: Date.now(),
    };

    await this.state.storage.put('ticket:' + ticket.id, JSON.stringify(ticket));

    // Update topic count index
    const stats = JSON.parse(await this.state.storage.get('_stats') || '{}');
    const topicKey = topic + ':' + category;
    /* v2.3.5593: at most STATS_KEYS topics kept (a new topic each post grew this
       one row to SQLite's 2 MB, and then every new topic's post failed: RT-1 N3) */
    if (Object.prototype.hasOwnProperty.call(stats, topicKey) || Object.keys(stats).length < FEEDBACK_PACE.STATS_KEYS) stats[topicKey] = (stats[topicKey] || 0) + 1;
    stats._total = (stats._total || 0) + 1;
    await this.state.storage.put('_stats', JSON.stringify(stats));

    return { ok: true, ticket: this.sanitize(ticket) };
  }

  async vote(data, addr) {
    const { ticketId, playerId, vote } = data || {};
    if (!ticketId || !playerId || !['up', 'down'].includes(vote)) return { ok: false, error: 'Invalid vote' };
    /* v2.3.5593: a vote is a row too: paced as a post is (RT-1 N2); and one
       claimed id an address a ticket, so made-up ids buy no votes (the same id
       may still take its vote back) */
    if (addr) {
      if (!this._votesBy) this._votesBy = new Map();
      const k = String(ticketId).slice(0, 64) + '|' + addr;
      const was = this._votesBy.get(k);
      if (was && was.id !== String(playerId) && was.until > Date.now()) return { ok: false, error: FEEDBACK_WORDS.oneVote };
    }
    if (!this._paced('votes', addr, String(playerId).slice(0, 64))) return { ok: false, error: FEEDBACK_WORDS.paced };
    if (!(await this._boardOpen())) return { ok: false, error: FEEDBACK_WORDS.closed };
    if (addr) {
      this._votesBy.set(String(ticketId).slice(0, 64) + '|' + addr, { id: String(playerId), until: Date.now() + FEEDBACK_PACE.HOUR_MS });
      if (this._votesBy.size > FEEDBACK_PACE.KEYS_MAX) { const now = Date.now(); for (const [k2, b] of this._votesBy) if (b.until <= now || this._votesBy.size > FEEDBACK_PACE.KEYS_MAX) this._votesBy.delete(k2); }
    }

    const raw = await this.state.storage.get('ticket:' + ticketId);
    if (!raw) return { ok: false, error: 'Ticket not found' };

    const ticket = JSON.parse(raw);
    const prev = ticket.voters[playerId];

    // Remove previous vote
    if (prev === 'up') ticket.up--;
    if (prev === 'down') ticket.down--;

    // Toggle: if same vote, remove it; otherwise set new vote
    if (prev === vote) {
      delete ticket.voters[playerId];
    } else {
      ticket.voters[playerId] = vote;
      if (vote === 'up') ticket.up++;
      if (vote === 'down') ticket.down++;
    }

    await this.state.storage.put('ticket:' + ticketId, JSON.stringify(ticket));
    return { ok: true, up: ticket.up, down: ticket.down, myVote: ticket.voters[playerId] || null };
  }

  async list(sort, topic, category, limit, offset) {
    const entries = await this.state.storage.list({ prefix: 'ticket:' });
    let tickets = [];
    for (const [, raw] of entries) {
      try { tickets.push(JSON.parse(raw)); } catch {}
    }

    // Filter
    if (topic) tickets = tickets.filter(t => t.topic === topic);
    if (category) tickets = tickets.filter(t => t.category === category);

    // Sort
    if (sort === 'top') {
      // Ratio: up/(up+down), with minimum threshold. Wilson score lower bound simplified.
      tickets.sort((a, b) => {
        const scoreA = a.up + a.down > 0 ? (a.up - a.down) / (a.up + a.down + 1) + a.up * 0.01 : 0;
        const scoreB = b.up + b.down > 0 ? (b.up - b.down) / (b.up + b.down + 1) + b.up * 0.01 : 0;
        return scoreB - scoreA;
      });
    } else if (sort === 'trending') {
      // Recent votes weighted higher — score × recency
      const now = Date.now();
      tickets.sort((a, b) => {
        const ageA = Math.max(1, (now - a.ts) / 3600000); // hours
        const ageB = Math.max(1, (now - b.ts) / 3600000);
        const scoreA = (a.up - a.down * 0.5) / Math.pow(ageA, 0.5);
        const scoreB = (b.up - b.down * 0.5) / Math.pow(ageB, 0.5);
        return scoreB - scoreA;
      });
    } else {
      // New — most recent first
      tickets.sort((a, b) => b.ts - a.ts);
    }

    const total = tickets.length;
    tickets = tickets.slice(offset, offset + limit);

    return { ok: true, tickets: tickets.map(t => this.sanitize(t)), total, sort, offset, limit };
  }

  async getStats() {
    const stats = JSON.parse(await this.state.storage.get('_stats') || '{}');
    return { ok: true, stats };
  }

  /* v2.3.5593: what the board serves is words, whatever was kept: a ticket
     from before this version may hold an object for a name (a page prints
     it as React text, and React throws on one) */
  sanitize(t) {
    return { id: t.id, playerName: feedbackWords(t.playerName, FEEDBACK_NAME_MAX) || 'Bro',
      category: typeof t.category === 'string' ? t.category : 'bug', topic: feedbackWords(t.topic, FEEDBACK_TOPIC_MAX),
      text: typeof t.text === 'string' ? t.text.slice(0, FEEDBACK_TEXT_MAX) : '',
      up: Number(t.up) || 0, down: Number(t.down) || 0, ts: Number(t.ts) || 0 };
  }

  /* v2.3.5593: the owner's key, as admin.js _adminAuth reads it: no secret
     set, no key, or the wrong one is false (the route answers a plain 404) */
  async _ownerKey(request) {
    const key = this.env && this.env.ADMIN_KEY;
    if (!key || typeof key !== 'string') return false;
    const auth = request.headers.get('Authorization') || '';
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!supplied) return false;
    const [a, b] = await Promise.all([keyHash(supplied), keyHash(key)]);
    return a === b;
  }

  /* v2.3.5593: one ticket taken down by the owner, and its topic's count with it */
  async removeTicket(id) {
    if (typeof id !== 'string' || !id || id.length > 64) return { ok: false, error: 'No such ticket' };
    const raw = await this.state.storage.get('ticket:' + id);
    if (!raw) return { ok: false, error: 'No such ticket' };
    let t = null;
    try { t = JSON.parse(raw); } catch { t = null; }
    await this.state.storage.delete('ticket:' + id);
    if (t) {
      const stats = JSON.parse(await this.state.storage.get('_stats') || '{}');
      const topicKey = t.topic + ':' + t.category;
      if (Object.prototype.hasOwnProperty.call(stats, topicKey)) stats[topicKey] = Math.max(0, (stats[topicKey] || 0) - 1);
      stats._total = Math.max(0, (stats._total || 0) - 1);
      await this.state.storage.put('_stats', JSON.stringify(stats));
    }
    return { ok: true, removed: id };
  }

  /* v2.3.5593: the paces, in memory (RT-1 N2).  `kind` posts, crash or votes;
     an hour's window each for the address, the claimed id and the whole game.
     No address (a local worker, a test) is not counted by address, as
     flood.js does.  True: taken, and counted. */
  _paced(kind, addr, id) {
    const now = Date.now();
    if (!this._paces) this._paces = new Map();
    const M = this._paces;
    const lim = kind === 'posts' ? [FEEDBACK_PACE.POSTS_ADDR, FEEDBACK_PACE.POSTS_ID, FEEDBACK_PACE.POSTS_ALL]
      : kind === 'crash' ? [FEEDBACK_PACE.CRASH_ADDR, FEEDBACK_PACE.CRASH_ID, FEEDBACK_PACE.CRASH_ALL]
        : [FEEDBACK_PACE.VOTES_ADDR, FEEDBACK_PACE.VOTES_ID, FEEDBACK_PACE.VOTES_ALL];
    const keys = [addr ? kind + '|a|' + addr : null, id ? kind + '|i|' + id : null, kind + '|all'];
    const at = (k) => { const b = M.get(k); return b && b.until > now ? b : null; };
    for (let i = 0; i < 3; i++) { if (!keys[i]) continue; const b = at(keys[i]); if (b && b.n >= lim[i]) return false; }
    /* the whole object's rows an hour (ROWS_HOUR): a post writes 2 */
    const rows = kind === 'posts' ? 2 : 1;
    const budget = at('rows|all');
    if (budget && budget.n + rows > FEEDBACK_PACE.ROWS_HOUR) return false;
    for (const k of keys) {
      if (!k) continue;
      const b = at(k);
      if (b) b.n++; else M.set(k, { n: 1, until: now + FEEDBACK_PACE.HOUR_MS });
    }
    if (budget) budget.n += rows; else M.set('rows|all', { n: rows, until: now + FEEDBACK_PACE.HOUR_MS });
    if (M.size > FEEDBACK_PACE.KEYS_MAX) {
      for (const [k, b] of M) if (b.until <= now) M.delete(k);
      /* still full: the oldest go (a Map keeps its order), never the game's own ceiling */
      for (const k of M.keys()) { if (M.size <= FEEDBACK_PACE.KEYS_MAX) break; if (!k.endsWith('|all')) M.delete(k); }
    }
    return true;
  }

  /* v2.3.5593: the KILL SWITCH `feedback: false` in the live flags (the room's:
     this object keeps none), read with the owner's key over the binding at
     most once a FLAG_TTL_MS, and only when someone writes.  No binding, no
     key, or no answer: the last word read, open at first. */
  async _boardOpen() {
    const now = Date.now();
    if (this._flagAt && now - this._flagAt < FEEDBACK_PACE.FLAG_TTL_MS) return this._flagOpen !== false;
    this._flagAt = now;
    const env = this.env || {};
    if (!env.GAME_ROOM || !env.ADMIN_KEY) return this._flagOpen !== false;
    try {
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(ROOMS.MAIN));
      const res = await stub.fetch(new Request('https://internal/api/admin/flags', { headers: { Authorization: 'Bearer ' + env.ADMIN_KEY } }));
      const j = await res.json();
      if (j && j.ok && j.flags && typeof j.flags === 'object') this._flagOpen = j.flags.feedback !== false;
    } catch (e) { /* the last word stands */ }
    return this._flagOpen !== false;
  }

  /* v2.3.5593: the owner's sweep (RT-1 N3): every ticket row over BIG_ROW
     characters, and the pace rows no version reads now (`rate:`,
     `crashrate:`), taken away; `_stats` rebuilt from the tickets left, so a
     row grown to SQLite's limit is small again. */
  async sweep() {
    let big = 0, paces = 0;
    const counts = Object.create(null);
    let total = 0;
    const entries = await this.state.storage.list({ prefix: 'ticket:' });
    for (const [k, raw] of entries) {
      if (typeof raw !== 'string' || raw.length > FEEDBACK_PACE.BIG_ROW) { await this.state.storage.delete(k); big++; continue; }
      let t = null;
      try { t = JSON.parse(raw); } catch { t = null; }
      if (!t) continue;
      total++;
      const key = feedbackWords(t.topic, FEEDBACK_TOPIC_MAX) + ':' + (typeof t.category === 'string' ? t.category : '');
      if (counts[key] !== undefined || Object.keys(counts).length < FEEDBACK_PACE.STATS_KEYS) counts[key] = (counts[key] || 0) + 1;
    }
    for (const prefix of ['rate:', 'crashrate:']) {
      const rows = await this.state.storage.list({ prefix });
      for (const k of rows.keys()) { await this.state.storage.delete(k); paces++; }
    }
    await this.state.storage.put('_stats', JSON.stringify({ ...counts, _total: total }));
    return { ok: true, big, paces, tickets: total };
  }
}
