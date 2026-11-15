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
 * No live flag: this object cannot read the room's flags, and each change
 * only refuses a bad value or closes a door to strangers; a switch would
 * reopen the hole.  The page's half: FeedbackPanel prints String(), and
 * lazyPanel.js's guard catches a window that throws. */
export const FEEDBACK_NAME_MAX = 24;
export const FEEDBACK_TOPIC_MAX = 32;
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
        return new Response(JSON.stringify(await this.submit(body)), { headers: H });
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
        return new Response(JSON.stringify(await this.vote(body)), { headers: H });
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
        return new Response(JSON.stringify(await this.crashReport(body)), { headers: H });
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
  async crashReport(data) {
    const { sid, v, ua, zone, log } = data || {};
    if (!sid || !Array.isArray(log) || !log.length) return { ok: false, error: 'Missing fields' };
    const rateKey = 'crashrate:' + String(sid).slice(0, 32);
    const rate = JSON.parse(await this.state.storage.get(rateKey) || '{"count":0,"resetAt":0}');
    if (Date.now() < rate.resetAt && rate.count >= 12) return { ok: false, error: 'Rate limited' };
    if (Date.now() >= rate.resetAt) { rate.count = 0; rate.resetAt = Date.now() + 3600000; }
    rate.count++;
    await this.state.storage.put(rateKey, JSON.stringify(rate));
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

  async submit(data) {
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
    const playerKey = 'rate:' + playerId;
    const rateData = JSON.parse(await this.state.storage.get(playerKey) || '{"count":0,"resetAt":0}');
    if (Date.now() < rateData.resetAt && rateData.count >= 5) return { ok: false, error: 'Rate limited — max 5/hour' };
    if (Date.now() >= rateData.resetAt) { rateData.count = 0; rateData.resetAt = Date.now() + 3600000; }
    rateData.count++;
    await this.state.storage.put(playerKey, JSON.stringify(rateData));

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
    stats[topicKey] = (stats[topicKey] || 0) + 1;
    stats._total = (stats._total || 0) + 1;
    await this.state.storage.put('_stats', JSON.stringify(stats));

    return { ok: true, ticket: this.sanitize(ticket) };
  }

  async vote(data) {
    const { ticketId, playerId, vote } = data;
    if (!ticketId || !playerId || !['up', 'down'].includes(vote)) return { ok: false, error: 'Invalid vote' };

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
}
