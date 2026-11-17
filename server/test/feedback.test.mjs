/* Feedback board + the dropped socket event -- v2.3.2820.
 *
 * The 2026-09-24 demo audit: the only Feedback panel a player could reach
 * sent its reports as a `feedback` WebSocket event, which the GameRoom had
 * no case for, so the default branch rebroadcast every report to the whole
 * room and none reached the Feedback DO.  The panel now POSTs
 * /api/feedback/submit.  This suite pins the server half:
 *   1. The Feedback DO keeps a 500-character report (the panel's box) and
 *      refuses 501; category is still validated; the report lists.
 *   2. A `feedback` socket event is DROPPED by the GameRoom -- nothing is
 *      pushed into the room-wide eventBuffer for it.
 * v2.3.5593 (the red team, RT-3 S3 and P1: docs/security/rt3-findings.md,
 * its proofs t2-feedback.mjs and privacy-reads.mjs, here as checks):
 *   3. A name and a topic are words: an object, a number, or nothing but
 *      hidden characters is refused; a long name is cut to 24; hidden and
 *      direction characters and line breaks are taken out.
 *   4. What the board serves is words, even from a ticket kept before this
 *      version with an object for a name (React throws on one).
 *   5. The crash feed answers the owner's key only: a plain 404 without it,
 *      with a wrong one, and with no secret set.
 *   6. The owner takes a ticket down (DELETE /ticket?id=, the key): gone from
 *      the board and its topic's count; nobody else can.
 * v2.3.5593, the red team's RT-1 (N2, N3: rt1-findings.md, feedback-grow.mjs):
 *   7. Posts, crash reports and votes are paced in MEMORY by the caller's
 *      address (CF-Connecting-IP) and its id, under a ceiling for the whole
 *      game an hour: fresh made-up ids from one address stop at 5 an hour; the
 *      game stops at 200; and no `rate:` / `crashrate:` row is written.
 *   8. `_stats` keeps at most STATS_KEYS topics (it reached SQLite's 2 MB).
 *   9. The owner's sweep (DELETE /sweep, the key) takes away oversized tickets
 *      and the old pace rows and rebuilds `_stats`; nobody else can.
 *  10. The kill switch `feedback: false` in the room's live flags closes the
 *      board to writes (reading stays), read at most once a minute.
 *  11. An IPv6 line counts as its /64; the whole object's rows an hour stop at
 *      ROWS_HOUR across every kind; one claimed id an address a ticket for a
 *      vote; and a write the paces refuse never asks the room for the switch.
 * v2.3.5594 (RT-3 S2/S3, the planning session's list):
 *  12. A name that reads as the game, its team or its staff is refused, folded
 *      for case, spaces, punctuation and look-alikes ("BroTown Team
 *      (official)", "A d m i n", "Adm1n", a Cyrillic A); a name that only
 *      contains a short word ("Modest", "Devin") is not.
 * v2.3.5593, the sitting 19 review (each verified on this suite first):
 *  13. A player id over ID_MAX is refused on a post and a vote, before
 *      anything is kept; a vote under `__proto__` is recorded; the hour's
 *      rows are kept in storage, so a new object (a wake, a deploy) does not
 *      refill them; the sweep mends a real report a bad vote grew (it took it
 *      away), and pages; the owner's key is asked of the room's admin door,
 *      with the caller's address, so the room's count sees every miss.
 * Break proofs (2026-11-15, each turned its check red): the id check taken
 * out of submit -> FAIL 13 (a 1.9 MB id kept); the budget read from memory
 * only -> FAIL 13 (a new object takes a fresh 300); the voters left a plain
 * {} -> FAIL 13 (`__proto__` not kept); the sweep judging the whole row ->
 * FAIL 13 (the real report taken away); the caller's address not sent with
 * the ask -> FAIL 13 (the room's count could not see whose miss it was).
 */
import { Feedback, FEEDBACK_NAME_MAX, FEEDBACK_PACE, feedbackAddr } from '../src/feedback.js';
import { GameRoom } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      /* v2.3.5593: in key order, with `startAfter` and `limit`, as the runtime's */
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => (!opts?.prefix || k.startsWith(opts.prefix)) && (opts?.startAfter === undefined || k > opts.startAfter)).sort();
        for (const k of keys) { if (opts?.limit && out.size >= opts.limit) break; out.set(k, store.get(k)); }
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}

/* v2.3.5593 (the sitting 19 review): the owner's key is the ROOM's to judge
   (its admin door, admin.js _adminAuth): a real GameRoom as the binding, and
   every ask it is sent kept, with the address it came with.  The door's
   answer is passed on as it is when it refuses; when it lets the key in, the
   flags it carries are none (the board's own switch is §10's: with the
   room's flags passed on, guards/switches-thrown's `feedback` thrown would
   close these sections' board too) */
function ownerRoom(key) {
  const room = new GameRoom(makeState(), { ADMIN_KEY: key, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  const asks = [];
  return { asks, binding: { idFromName: (n) => n, get: () => ({ fetch: async (r) => {
    asks.push({ path: new URL(r.url).pathname, ip: r.headers.get('CF-Connecting-IP') });
    const res = await room.fetch(r);
    return res.status === 200 ? new Response(JSON.stringify({ ok: true, flags: {} }), { status: 200 }) : res;
  } }) } };
}

// ── 1. The board ──
{
  const fb = new Feedback(makeState(), {});
  const post = (body) => fb.fetch(new Request('https://x/api/feedback/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).then((r) => r.json());
  const base = { playerId: 'bp_fb', playerName: 'Scribe', category: 'bug', topic: 'ui' };

  /* v2.3.5706: words, not one letter 500 times (the text goes through the
     name's cleaner now: a run of one character past 6 is cut, as a chat line) */
  const long = await post({ ...base, text: 'abcdefghij'.repeat(50) });
  check('a 500-character report is kept (the panel offers 500; the old cap was 100)', long.ok === true, long);
  const tooLong = await post({ ...base, text: 'x'.repeat(501) });
  check('...501 is refused', tooLong.ok === false, tooLong);
  const badCat = await post({ ...base, category: 'rant', text: 'hello' });
  check('an unknown category is still refused', badCat.ok === false, badCat);
  const noTopic = await post({ ...base, topic: '', text: 'hello' });
  check('a report without a topic is still refused', noTopic.ok === false, noTopic);

  const list = await fb.fetch(new Request('https://x/api/feedback/list?sort=new&limit=10')).then((r) => r.json());
  check('the kept report is on the board, whole',
    list.ok && list.tickets.some((t) => t.text.length === 500 && t.playerName === 'Scribe'), list.total);
}

// ── 2. The socket event is dropped, not relayed ──
{
  const room = new GameRoom(makeState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_fb_a', name: 'T', phrase: 'p-fb', data: { x: 0, y: 0, z: 'town' } }));
  room.eventBuffer.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'feedback', payload: { id: 'bp_fb_a', name: 'T', text: 'my report' } }));
  const relayed = room.eventBuffer.filter((e) => e && (e.type === 'feedback' || (e.payload && e.payload.text === 'my report')));
  check('a `feedback` socket event is NOT pushed into the room-wide buffer', relayed.length === 0, relayed);

  /* Control: an ordinary client broadcast still relays, so the drop above is
     the new case and not a room that relays nothing. */
  await room.webSocketMessage(ws, JSON.stringify({ type: 'emote', payload: { id: 'bp_fb_a', emoji: '👋' } })   /* v2.3.3391: a listed emote (emotes.js) */);
  check('...while an ordinary client broadcast (emote) still relays (control)',
    room.eventBuffer.some((e) => e && e.type === 'emote'), room.eventBuffer.map((e) => e && e.type));
}

// ── 3-6. v2.3.5593: the board's words, and its owner's key ──
{
  const KEY = 'owner-key-for-tests';
  const st = makeState();
  const fb = new Feedback(st, { ADMIN_KEY: KEY, GAME_ROOM: ownerRoom(KEY).binding });
  const req = (path, init) => fb.fetch(new Request('https://x/api/feedback' + path, init));
  const post = (body) => req('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  let n = 0;
  const base = () => ({ playerId: 'bp_rt3_' + (n++), playerName: 'Scribe', category: 'bug', topic: 'ui', text: 'hello' });

  /* 3. the name and the topic are words */
  const obj = await post({ ...base(), playerName: { a: 1 } });
  check('3: a name that is an object is refused (it was kept, and served back)', obj.ok === false, obj);
  const num = await post({ ...base(), playerName: 12345 });
  check('3: a name that is a number is refused', num.ok === false, num);
  const blank = await post({ ...base(), playerName: '\u200b\u202e\u2066 ' });
  check('3: a name of nothing but hidden characters is refused', blank.ok === false, blank);
  const topicObj = await post({ ...base(), topic: { __proto__: null, x: 1 } });
  check('3: a topic that is an object is refused', topicObj.ok === false, topicObj);
  const long = await post({ ...base(), playerName: 'Ab'.repeat(2500) });   /* (a run of one letter is cut to 6 first, as in chat: chatguard.js RUN_MAX) */
  check('3: a 5,000-character name is cut to ' + FEEDBACK_NAME_MAX, long.ok === true && long.ticket.playerName === 'Ab'.repeat(FEEDBACK_NAME_MAX / 2), long.ticket && long.ticket.playerName.length);
  /* (v2.3.5594: a name like t1-names.mjs's "Owner (admin) SYSTEM" is refused outright now, 12) */
  const hidden = await post({ ...base(), playerName: 'Scribe\u202e (bard)\n\n\nHI\u200b' });
  check('3: direction and zero-width characters and line breaks are taken out of a name',
    hidden.ok === true && !/[\u0000-\u001f\u200b\u202e]/.test(hidden.ticket.playerName) && hidden.ticket.playerName === 'Scribe (bard) HI', hidden.ticket && JSON.stringify(hidden.ticket.playerName));

  /* 4. a ticket kept before this version, with an object for a name, is served as words */
  await st.storage.put('ticket:old-bad', JSON.stringify({ id: 'old-bad', playerId: 'x', playerName: { a: 1 }, category: 'bug', topic: { b: 2 }, text: { c: 3 }, up: 'lots', down: null, voters: {}, ts: Date.now() + 1000 }));
  const list = await req('/list?sort=new&limit=50').then((r) => r.json());
  const old = list.tickets.find((t) => t.id === 'old-bad');
  check('4: an old ticket with an object for a name is served with a string name (React prints it)', old && old.playerName === 'Bro' && typeof old.text === 'string' && typeof old.topic === 'string', old);
  const allWords = list.tickets.every((t) => typeof t.playerName === 'string' && typeof t.text === 'string' && typeof t.topic === 'string'
    && typeof t.category === 'string' && Number.isFinite(t.up) && Number.isFinite(t.down));
  check('4: every ticket the board serves is strings and numbers', allWords, list.tickets.map((t) => typeof t.playerName));

  /* 5. the crash feed is the owner's */
  await req('/crash', { method: 'POST', body: JSON.stringify({ sid: 's1', v: '1', ua: 'Mozilla/5.0 (iPhone)', zone: 'wheel', log: [{ kind: 'x', msg: 'as Scribe' }] }) });
  const anon = await req('/crashes?limit=10');
  check('5: the crash feed without a key is a plain 404 (it handed every report to anyone)', anon.status === 404, anon.status);
  const wrong = await req('/crashes?limit=10', { headers: { Authorization: 'Bearer not-the-key' } });
  check('5: ...with a wrong key, 404', wrong.status === 404, wrong.status);
  const owner = await req('/crashes?limit=10', { headers: { Authorization: 'Bearer ' + KEY } }).then((r) => r.json());
  check('5: ...with the owner\'s key, the reports', owner.ok === true && owner.count === 1, owner);
  const noSecret = await new Feedback(st, {}).fetch(new Request('https://x/api/feedback/crashes', { headers: { Authorization: 'Bearer ' + KEY } }));
  check('5: ...and with no secret set, 404 whatever is sent (fail closed)', noSecret.status === 404, noSecret.status);
  const noRoom = await new Feedback(st, { ADMIN_KEY: KEY }).fetch(new Request('https://x/api/feedback/crashes', { headers: { Authorization: 'Bearer ' + KEY } }));
  check('5: ...and with no room to ask (the key is the room\'s to judge), 404 (fail closed)', noRoom.status === 404, noRoom.status);

  /* 6. the owner takes a ticket down */
  const victim = await post({ ...base(), playerName: 'Helpful Bro', text: 'whisper your Login Key to claim' });   /* (a staff name is refused outright since v2.3.5594) */
  const id = victim.ticket.id;
  const del = (key) => req('/ticket?id=' + id, { method: 'DELETE', headers: key ? { Authorization: 'Bearer ' + key } : {} });
  check('6: a stranger cannot take a ticket down (404)', (await del(null)).status === 404 && (await del('guess')).status === 404);
  const before = JSON.parse(await st.storage.get('_stats'));
  const gone = await del(KEY).then((r) => r.json());
  const after = JSON.parse(await st.storage.get('_stats'));
  const list2 = await req('/list?sort=new&limit=50').then((r) => r.json());
  check('6: the owner\'s key takes it down: off the board, and its count with it',
    gone.ok === true && !list2.tickets.some((t) => t.id === id) && after._total === before._total - 1 && after['ui:bug'] === before['ui:bug'] - 1, { gone, before, after });
  const again = await del(KEY).then((r) => r.json());
  check('6: ...a second time finds nothing (no count goes below its tickets)', again.ok === false && JSON.parse(await st.storage.get('_stats'))._total === after._total, again);
}

// ── 7-10. v2.3.5593: the paces in memory, the topics' cap, the sweep, the switch (RT-1 N2, N3) ──
{
  const KEY = 'owner-key-for-tests';
  const st = makeState();
  const fb = new Feedback(st, { ADMIN_KEY: KEY });
  const req = (path, init) => fb.fetch(new Request('https://x/api/feedback' + path, init));
  const from = (ip) => (ip ? { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip } : { 'Content-Type': 'application/json' });
  const post = (body, ip) => req('/submit', { method: 'POST', headers: from(ip), body: JSON.stringify(body) }).then((r) => r.json());
  let n = 0;
  const fresh = (extra) => ({ playerId: 'bp_made_up_' + (n++), playerName: 'Flood', category: 'bug', topic: 'ui', text: 'x', ...(extra || {}) });

  /* 7. by address, fresh ids */
  const one = [];
  for (let i = 0; i < 8; i++) one.push(await post(fresh(), '203.0.113.7'));
  check('7: one address with a fresh made-up id each time is held to ' + FEEDBACK_PACE.POSTS_ADDR + ' posts an hour (200 of 200 were taken)',
    one.filter((r) => r.ok).length === FEEDBACK_PACE.POSTS_ADDR && one.slice(FEEDBACK_PACE.POSTS_ADDR).every((r) => r.ok === false), one.map((r) => r.ok));
  const other = await post(fresh(), '203.0.113.8');
  check('7: ...another address is not', other.ok === true, other);
  const keys = await st.storage.list({});
  check('7: no `rate:` or `crashrate:` row is written (the paces are in memory)', ![...keys.keys()].some((k) => /^(rate|crashrate):/.test(k)), [...keys.keys()].filter((k) => /rate:/.test(k)));
  /* the whole game's ceiling: many addresses */
  let taken = 0;
  for (let i = 0; i < FEEDBACK_PACE.POSTS_ALL + 20; i++) { const r = await post(fresh(), '198.51.100.' + (i % 250) + ':' + i); if (r.ok) taken++; }
  check('7: the whole game takes at most ' + FEEDBACK_PACE.POSTS_ALL + ' posts an hour, from any number of addresses', taken + one.filter((r) => r.ok).length + 1 === FEEDBACK_PACE.POSTS_ALL, taken);
  const crash = [];
  for (let i = 0; i < FEEDBACK_PACE.CRASH_ADDR + 5; i++) crash.push(await req('/crash', { method: 'POST', headers: from('203.0.113.9'), body: JSON.stringify({ sid: 'sid' + i, log: [{ kind: 'x' }] }) }).then((r) => r.json()));
  check('7: crash reports from one address with fresh sids stop at ' + FEEDBACK_PACE.CRASH_ADDR + ' an hour', crash.filter((r) => r.ok).length === FEEDBACK_PACE.CRASH_ADDR, crash.map((r) => r.ok));
  /* v2.3.5706: shown on posts, on a board of its own: the address above
     filled the crash share (SHARE.crash, 30, the address's own 30), so a
     crash report from anyone is refused for the hour now, which is the share */
  const fbLocal = new Feedback(makeState(), {});
  const local = [];
  for (let i = 0; i < FEEDBACK_PACE.POSTS_ADDR + 3; i++) local.push(await fbLocal.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: from(), body: JSON.stringify(fresh()) })).then((r) => r.json()));
  const crashAgain = { ok: local.every((r) => r.ok === true), local: local.map((r) => r.ok) };
  check('7: ...a local caller (no address) is not counted by address (flood.js\'s rule)', crashAgain.ok === true, crashAgain);
}
{
  /* 8. the topics' cap */
  const st = makeState();
  const fb = new Feedback(st, {});
  for (let i = 0; i < FEEDBACK_PACE.STATS_KEYS + 40; i++) {
    await fb.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.' + i },
      body: JSON.stringify({ playerId: 'bp_t' + i, playerName: 'T', category: 'bug', topic: 'topic' + i, text: 'x' }) }));
    fb._paces.clear();   /* (the paces are 7's; this is the row's cap) */
    if (fb._rowsHour) { fb._rowsHour.n = 0; fb._rowsHour.k = {}; fb._rowsHour.a = Object.create(null); }   /* (and the rows' budget, 11's and 13's; v2.3.5706: and the shares, SEC's) */
  }
  const stats = JSON.parse(await st.storage.get('_stats'));
  check('8: `_stats` keeps at most ' + FEEDBACK_PACE.STATS_KEYS + ' topics (+ the total), however many are posted', Object.keys(stats).length <= FEEDBACK_PACE.STATS_KEYS + 1 && stats._total === FEEDBACK_PACE.STATS_KEYS + 40, Object.keys(stats).length);

  /* 9. the sweep */
  const KEY = 'k9';
  const fb9 = new Feedback(st, { ADMIN_KEY: KEY, GAME_ROOM: ownerRoom(KEY).binding });
  await st.storage.put('ticket:huge', JSON.stringify({ id: 'huge', playerName: 'N'.repeat(1900000), category: 'bug', topic: 'ui', text: 'x', up: 0, down: 0, voters: {}, ts: 1 }));
  await st.storage.put('rate:bp_old', '{"count":5,"resetAt":0}');
  await st.storage.put('crashrate:old', '{"count":1,"resetAt":0}');
  await st.storage.put('_stats', JSON.stringify(Object.fromEntries(Array.from({ length: 5000 }, (_, i) => ['t' + i + ':bug', 1]))));
  const sweep = (key) => fb9.fetch(new Request('https://x/api/feedback/sweep', { method: 'DELETE', headers: key ? { Authorization: 'Bearer ' + key } : {} }));
  check('9: a stranger cannot sweep (404)', (await sweep(null)).status === 404 && (await sweep('guess')).status === 404);
  const sw = await sweep(KEY).then((r) => r.json());
  const left = await st.storage.list({});
  const stats9 = JSON.parse(await st.storage.get('_stats'));
  check('9: the owner\'s sweep takes away the ticket with a 1.9 MB name and the old pace rows, and rebuilds `_stats` small',
    sw.ok && sw.big === 1 && sw.paces === 2 && !left.has('ticket:huge') && !left.has('rate:bp_old') && !left.has('crashrate:old')
      && stats9._total === FEEDBACK_PACE.STATS_KEYS + 40 && Object.keys(stats9).length <= FEEDBACK_PACE.STATS_KEYS + 1, { sw, keys: Object.keys(stats9).length });
}
{
  /* 10. the kill switch, the room's */
  let flags = { feedback: false }, asked = 0;
  const room = { fetch: async (r) => { asked++; const ok = r.headers.get('Authorization') === 'Bearer k10' && new URL(r.url).pathname === '/api/admin/flags';
    return new Response(JSON.stringify(ok ? { ok: true, flags } : { ok: false }), { status: ok ? 200 : 404 }); } };
  const env = { ADMIN_KEY: 'k10', GAME_ROOM: { idFromName: (n) => n, get: () => room } };
  const st = makeState();
  const fb = new Feedback(st, env);
  const post = () => fb.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'bp_k', playerName: 'K', category: 'bug', topic: 'ui', text: 'x' }) })).then((r) => r.json());
  const closed = await post();
  const vote = await fb.fetch(new Request('https://x/api/feedback/vote', { method: 'POST', body: JSON.stringify({ ticketId: 'x', playerId: 'p', vote: 'up' }) })).then((r) => r.json());
  const crash = await fb.fetch(new Request('https://x/api/feedback/crash', { method: 'POST', body: JSON.stringify({ sid: 's', log: [{ kind: 'x' }] }) })).then((r) => r.json());
  const list = await fb.fetch(new Request('https://x/api/feedback/list')).then((r) => r.json());
  check('10: `feedback: false` in the room\'s live flags closes the board to posts, votes and crash reports, in words',
    closed.ok === false && /closed/.test(closed.error) && vote.ok === false && crash.ok === false && !(await st.storage.get('_crashlog')), { closed, vote, crash });
  check('10: ...reading stays', list.ok === true, list);
  check('10: ...the flags read once for all of it (at most once a minute)', asked === 1, asked);
  flags = { feedback: true };
  fb._flagAt -= FEEDBACK_PACE.FLAG_TTL_MS + 1;
  const open = await post();
  check('10: the switch put back, the next read after the minute opens it', open.ok === true && asked === 2, { open, asked });
  const noRoom = await new Feedback(makeState(), { ADMIN_KEY: 'k10' }).fetch(new Request('https://x/api/feedback/submit', { method: 'POST',
    body: JSON.stringify({ playerId: 'bp_n', playerName: 'N', category: 'bug', topic: 'ui', text: 'x' }) })).then((r) => r.json());
  check('10: no room to ask (a local test, no binding): open, as before', noRoom.ok === true, noRoom);
}

// ── 11. v2.3.5593: the /64, the rows' budget, one vote an address, a refusal asks nothing ──
{
  check('11: an IPv6 address counts as its /64; IPv4 and IPv4-in-IPv6 as themselves',
    feedbackAddr('2001:db8:1:2:aaaa::1') === '2001:db8:1:2::/64' && feedbackAddr('2001:0db8:0001:0002:ffff:ffff:ffff:ffff') === '2001:db8:1:2::/64'
      && feedbackAddr('203.0.113.5') === '203.0.113.5' && feedbackAddr('::ffff:203.0.113.5') === '203.0.113.5' && feedbackAddr(null) === null,
    [feedbackAddr('2001:db8:1:2:aaaa::1'), feedbackAddr('::ffff:203.0.113.5')]);
  const st = makeState();
  const fb = new Feedback(st, {});
  const H = (ip) => ({ 'Content-Type': 'application/json', 'CF-Connecting-IP': ip });
  const post = (body, ip) => fb.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: H(ip), body: JSON.stringify(body) })).then((r) => r.json());
  const line = [];
  for (let i = 0; i < 8; i++) line.push(await post({ playerId: 'bp_v6_' + i, playerName: 'Six', category: 'bug', topic: 'ui', text: 'x' }, '2001:db8:aa:bb:' + (i + 1).toString(16) + '::' + (i + 7).toString(16)));
  check('11: a new address of one IPv6 line for every post (a /64 is 2^64 of them) is held as one address: ' + FEEDBACK_PACE.POSTS_ADDR + ' an hour',
    line.filter((r) => r.ok).length === FEEDBACK_PACE.POSTS_ADDR, line.map((r) => r.ok));
  const ticketId = line[0].ticket.id;
  /* one claimed id an address a ticket for a vote */
  const vote = (playerId, ip) => fb.fetch(new Request('https://x/api/feedback/vote', { method: 'POST', headers: H(ip), body: JSON.stringify({ ticketId, playerId, vote: 'up' }) })).then((r) => r.json());
  const v1 = await vote('bp_voter_a', '198.51.100.20');
  const v2 = await vote('bp_voter_b', '198.51.100.20');
  const v3 = await vote('bp_voter_a', '198.51.100.20');
  check('11: one address votes once a ticket: a second made-up id is refused, the same id takes its vote back',
    v1.ok === true && v1.up === 1 && v2.ok === false && v3.ok === true && v3.up === 0, { v1, v2, v3 });
  /* the rows' budget across every kind: posts to their own ceiling, then
     votes until the whole object's budget stops them (a post writes 3 rows:
     its ticket, `_stats` and the budget's own row; a vote 2), and then a
     crash report is refused too; the rows counted are the rows written */
  /* v2.3.5706 (card SEC PR 7): the ONE shared budget is the old way, kept
     behind `feedbackshare: false` (read from the room's flags, as `feedback`
     is): this section plays it so; the shares, on, are §14's */
  const st2 = makeState();
  let puts = 0;
  const put0 = st2.storage.put;
  st2.storage.put = async (k, v) => { puts++; return put0(k, v); };
  const offRoom = { fetch: async () => new Response(JSON.stringify({ ok: true, flags: { feedbackshare: false } })) };
  const fb2 = new Feedback(st2, { ADMIN_KEY: 'k11s', GAME_ROOM: { idFromName: (x) => x, get: () => offRoom } });
  await fb2._boardOpen();
  const ip2 = (i) => '192.0.2.' + (i % 250) + '.' + i;
  let rows = 0, first = null;
  for (let i = 0; i < FEEDBACK_PACE.POSTS_ALL + 5; i++) {
    const r = await fb2.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: H(ip2(i)), body: JSON.stringify({ playerId: 'bp_b' + i, playerName: 'B', category: 'bug', topic: 'ui', text: 'x' }) })).then((x) => x.json());
    if (r.ok) { rows += 3; if (!first) first = r.ticket.id; }
  }
  let votes = 0, stopped = false;
  for (let i = 0; i < FEEDBACK_PACE.VOTES_ALL; i++) {
    const r = await fb2.fetch(new Request('https://x/api/feedback/vote', { method: 'POST', headers: H(ip2(5000 + i)), body: JSON.stringify({ ticketId: first, playerId: 'bp_vv' + i, vote: 'up' }) })).then((x) => x.json());
    if (r.ok) { rows += 2; votes++; } else { stopped = true; break; }
  }
  const lateCrash = await fb2.fetch(new Request('https://x/api/feedback/crash', { method: 'POST', headers: H(ip2(9000)), body: JSON.stringify({ sid: 'late', log: [{ kind: 'x' }] }) })).then((x) => x.json());
  check('11: the whole object writes at most ' + FEEDBACK_PACE.ROWS_HOUR + ' rows an hour, every kind together: votes stop at the budget (' + votes + '), under their own ceiling (' + FEEDBACK_PACE.VOTES_ALL + '), and a crash report after them is refused',
    rows === FEEDBACK_PACE.ROWS_HOUR && puts === rows && stopped && votes < FEEDBACK_PACE.VOTES_ALL && lateCrash.ok === false, { rows, puts, votes, stopped, lateCrash });
  /* a write the paces refuse never asks the room */
  let asked = 0;
  const env = { ADMIN_KEY: 'k11', GAME_ROOM: { idFromName: (x) => x, get: () => ({ fetch: async () => { asked++; return new Response(JSON.stringify({ ok: true, flags: {} })); } }) } };
  const fb3 = new Feedback(makeState(), env);
  const post3 = (i) => fb3.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: H('203.0.113.99'), body: JSON.stringify({ playerId: 'bp_r' + i, playerName: 'R', category: 'bug', topic: 'ui', text: 'x' }) })).then((x) => x.json());
  for (let i = 0; i < FEEDBACK_PACE.POSTS_ADDR; i++) await post3(i);
  const askedAfterTaken = asked;
  fb3._flagAt -= FEEDBACK_PACE.FLAG_TTL_MS + 1;
  const refused = [];
  for (let i = 0; i < 50; i++) refused.push(await post3(100 + i));
  check('11: a write the paces refuse never asks the room for the switch (50 refused posts, ' + (asked - askedAfterTaken) + ' asks)',
    askedAfterTaken === 1 && asked === askedAfterTaken && refused.every((r) => r.ok === false), { askedAfterTaken, asked });
}

// ── 12. v2.3.5594: names that read as the game or its staff ──
{
  const fb = new Feedback(makeState(), {});
  let i = 0;
  const post = (playerName) => fb.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.' + (i++) },
    body: JSON.stringify({ playerId: 'bp_n' + i, playerName, category: 'bug', topic: 'ui', text: 'x' }) })).then((r) => r.json());
  /* v2.3.5594 (the sitting 19 review): with digits beside the letters, accents, a dotless i, small capitals, CamelCase, two words, a plural */
  const staff = ['BroTown', 'BroTown Team (official)', 'Team', 'Admin', 'Mod', 'Moderator', 'Staff', 'Owner', 'Official', 'System', 'A d m i n', 'B.r.o.T.o.w.n', 'Adm1n', 'M0D', '0wner', '\u0410dmin', 'xX_Bro_Town_Xx', 'Admin2', 'Owner1', 'Mod7', '\u00c1dmin', 'Own\u00e9r', 'M\u00f8d', 'Adm\u0131n', '\u1d00\u1d05\u1d0d\u026a\u0274', 'AdminTeam', 'RealOwner', 'Game Master', 'Owners', 'GMs', 'GM', 'GM7', 'Bro Town', 'BroTownTeam', 'BroTown Staff', 'Devs', 'Developer'];
  const taken = [];
  for (const nm of staff) { const r = await post(nm); if (r.ok) taken.push(nm); else if (!/your own/.test(r.error)) taken.push(nm + ' (' + r.error + ')'); }
  check('12: every name that reads as the game, its team or its staff is refused, in words (' + staff.length + ' tried)', taken.length === 0, taken);
  /* v2.3.5594 (the sitting 19 review): "Dev" is a common real name; GM inside a longer name; brotown only as its own word */
  const own = ['Scribe', 'Modest', 'Devin', 'Teammate', 'Systema', 'Bro', 'Townie', 'Dev', 'Dev Patel', 'Bro Townsend', 'GM Bob', 'Landowner', 'Gemma'];
  const refused = [];
  for (const nm of own) { const r = await post(nm); if (!r.ok) refused.push(nm + ' (' + r.error + ')'); }
  check('12: ...and a player\'s own name that only contains a short word is not', refused.length === 0, refused);
}

// ── 13. v2.3.5593, the sitting 19 review ──
{
  const KEY = 'k13';
  const owner = ownerRoom(KEY);
  const st = makeState();
  const fb = new Feedback(st, { ADMIN_KEY: KEY, GAME_ROOM: owner.binding });
  const H = (ip) => ({ 'Content-Type': 'application/json', 'CF-Connecting-IP': ip });
  const req = (path, init) => fb.fetch(new Request('https://x/api/feedback' + path, init)).then((r) => r.json());
  const BIG = 'p'.repeat(1900000);
  /* the id, on a post and a vote */
  const bigPost = await req('/submit', { method: 'POST', headers: H('203.0.113.30'), body: JSON.stringify({ playerId: BIG, playerName: 'Big', category: 'bug', topic: 'ui', text: 'x' }) });
  const real = await req('/submit', { method: 'POST', headers: H('203.0.113.31'), body: JSON.stringify({ playerId: 'bp_real', playerName: 'Real', category: 'bug', topic: 'ui', text: 'a real report' }) });
  const tid = real.ticket.id;
  const bigVote = await req('/vote', { method: 'POST', headers: H('203.0.113.32'), body: JSON.stringify({ ticketId: tid, playerId: BIG, vote: 'up' }) });
  const bigTicketId = await req('/vote', { method: 'POST', headers: H('203.0.113.33'), body: JSON.stringify({ ticketId: 'x'.repeat(5000), playerId: 'bp_v', vote: 'up' }) });
  const rows = [...(await st.storage.list({})).values()];
  check('13: a player id over ' + FEEDBACK_PACE.ID_MAX + ' characters is refused on a post and a vote, before anything is kept (a 1.9 MB id was kept, and voted into a real report)',
    bigPost.ok === false && bigVote.ok === false && bigTicketId.ok === false && rows.every((v) => String(typeof v === 'string' ? v : JSON.stringify(v)).length < 4096), { bigPost, bigVote, bigTicketId });
  /* __proto__ */
  const pv = await req('/vote', { method: 'POST', headers: H('203.0.113.34'), body: JSON.stringify({ ticketId: tid, playerId: '__proto__', vote: 'up' }) });
  const back = await req('/vote', { method: 'POST', headers: H('203.0.113.34'), body: JSON.stringify({ ticketId: tid, playerId: '__proto__', vote: 'up' }) });
  const kept = JSON.parse(await st.storage.get('ticket:' + tid));
  check('13: a vote under `__proto__` is recorded, and taken back as any other (on a plain {} it was never kept)',
    pv.ok === true && pv.up === 1 && pv.myVote === 'up' && back.ok === true && back.up === 0 && kept.up === 0, { pv, back, up: kept.up });
  /* the budget survives a new object over the same storage */
  const budget = await st.storage.get(FEEDBACK_PACE.ROWS_KEY);
  await st.storage.put(FEEDBACK_PACE.ROWS_KEY, { n: FEEDBACK_PACE.ROWS_HOUR - 1, until: Date.now() + 60000 });
  const woken = new Feedback(st, {});
  const afterWake = await woken.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', headers: H('203.0.113.35'), body: JSON.stringify({ playerId: 'bp_wake', playerName: 'W', category: 'bug', topic: 'ui', text: 'x' }) })).then((r) => r.json());
  check('13: the hour\'s rows are kept in storage: a new object (a wake, a deploy) does not refill them (a probe took a fresh 300 on each wake)',
    budget && budget.n > 0 && afterWake.ok === false, { budget, afterWake });
  await st.storage.put(FEEDBACK_PACE.ROWS_KEY, { n: 0, until: 0 });
  /* the sweep mends a real report a bad vote grew, and pages */
  const grown = JSON.parse(await st.storage.get('ticket:' + tid));
  grown.voters = { bp_good: 'up', [BIG]: 'up', bp_odd: 'sideways' };
  grown.up = 2;
  await st.storage.put('ticket:' + tid, JSON.stringify(grown));
  for (let i = 0; i < FEEDBACK_PACE.PAGE + 30; i++) await st.storage.put('ticket:pg' + String(i).padStart(4, '0'), JSON.stringify({ id: 'pg' + i, playerId: 'bp_p', playerName: 'P', category: 'qol', topic: 'paging', text: 'x', up: 0, down: 0, voters: {}, ts: i }));
  for (let i = 0; i < FEEDBACK_PACE.PAGE + 30; i++) await st.storage.put('rate:old' + i, '{}');
  const sw = await fb.fetch(new Request('https://x/api/feedback/sweep', { method: 'DELETE', headers: { Authorization: 'Bearer ' + KEY } })).then((r) => r.json());
  const mended = JSON.parse(await st.storage.get('ticket:' + tid) || 'null');
  check('13: the sweep MENDS a real report a bad vote grew (it took the report away): the bad voters out, the counts follow',
    sw.ok && sw.mended === 1 && mended && mended.text === 'a real report' && Object.keys(mended.voters).join() === 'bp_good' && mended.up === 1, { sw, mended: mended && { up: mended.up, voters: Object.keys(mended.voters).map((k) => k.slice(0, 12)) } });
  const listed = await req('/list?sort=new&limit=50&topic=paging');
  check('13: the sweep and the list read a page at a time, and miss nothing (' + (FEEDBACK_PACE.PAGE + 30) + ' tickets, as many old pace rows)',
    sw.paces === FEEDBACK_PACE.PAGE + 30 && sw.tickets >= FEEDBACK_PACE.PAGE + 30 && listed.total === FEEDBACK_PACE.PAGE + 30, { paces: sw.paces, tickets: sw.tickets, total: listed.total });
  /* the owner's key: the room's door judges it, with the caller's address */
  owner.asks.length = 0;
  let wrong = 0;
  for (let i = 0; i < 25; i++) if ((await fb.fetch(new Request('https://x/api/feedback/crashes', { headers: { Authorization: 'Bearer guess' + i, 'CF-Connecting-IP': '198.51.100.66' } }))).status === 404) wrong++;
  /* the room's door (RT-1's #1885, on main) counts the misses by address and
     holds it: the right key from that address is refused too, from another
     it is the owner's */
  const held = await fb.fetch(new Request('https://x/api/feedback/crashes', { headers: { Authorization: 'Bearer ' + KEY, 'CF-Connecting-IP': '198.51.100.66' } }));
  const right = await fb.fetch(new Request('https://x/api/feedback/crashes', { headers: { Authorization: 'Bearer ' + KEY, 'CF-Connecting-IP': '198.51.100.68' } }));
  const bare = await fb.fetch(new Request('https://x/api/feedback/crashes', { headers: { 'CF-Connecting-IP': '198.51.100.67' } }));
  check('13: every key the owner\'s routes are sent is judged by the room\'s admin door, with the caller\'s address (2,000 wrong keys went uncounted here); the right key from another address is the owner\'s',
    wrong === 25 && right.status === 200 && bare.status === 404 && owner.asks.length === 27
      && owner.asks.every((a) => a.path === '/api/admin/flags') && owner.asks.slice(0, 26).every((a) => a.ip === '198.51.100.66'), { wrong, right: right.status, asks: owner.asks.length });
  check('13: ...and the door\'s count holds that address: its right key is refused too (RT-1\'s time-out, switch `adminlock`)', held.status === 404, held.status);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall feedback checks passed');
process.exit(failures ? 1 : 0);
