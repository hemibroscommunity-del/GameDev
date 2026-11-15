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
 */
import { Feedback, FEEDBACK_NAME_MAX, FEEDBACK_PACE } from '../src/feedback.js';
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
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}

// ── 1. The board ──
{
  const fb = new Feedback(makeState(), {});
  const post = (body) => fb.fetch(new Request('https://x/api/feedback/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).then((r) => r.json());
  const base = { playerId: 'bp_fb', playerName: 'Scribe', category: 'bug', topic: 'ui' };

  const long = await post({ ...base, text: 'x'.repeat(500) });
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
  const fb = new Feedback(st, { ADMIN_KEY: KEY });
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
  const hidden = await post({ ...base(), playerName: 'Owner\u202e (admin)\n\n\nSYSTEM\u200b' });
  check('3: direction and zero-width characters and line breaks are taken out of a name',
    hidden.ok === true && !/[\u0000-\u001f\u200b\u202e]/.test(hidden.ticket.playerName) && hidden.ticket.playerName === 'Owner (admin) SYSTEM', hidden.ticket && JSON.stringify(hidden.ticket.playerName));

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

  /* 6. the owner takes a ticket down */
  const victim = await post({ ...base(), playerName: 'BroTown Team', text: 'whisper your Login Key to claim' });
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
  for (let i = 0; i < 15; i++) crash.push(await req('/crash', { method: 'POST', headers: from('203.0.113.9'), body: JSON.stringify({ sid: 'sid' + i, log: [{ kind: 'x' }] }) }).then((r) => r.json()));
  check('7: crash reports from one address with fresh sids stop at ' + FEEDBACK_PACE.CRASH_ADDR + ' an hour', crash.filter((r) => r.ok).length === FEEDBACK_PACE.CRASH_ADDR, crash.map((r) => r.ok));
  const crashAgain = await req('/crash', { method: 'POST', headers: from(), body: JSON.stringify({ sid: 'local', log: [{ kind: 'x' }] }) }).then((r) => r.json());
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
  }
  const stats = JSON.parse(await st.storage.get('_stats'));
  check('8: `_stats` keeps at most ' + FEEDBACK_PACE.STATS_KEYS + ' topics (+ the total), however many are posted', Object.keys(stats).length <= FEEDBACK_PACE.STATS_KEYS + 1 && stats._total === FEEDBACK_PACE.STATS_KEYS + 40, Object.keys(stats).length);

  /* 9. the sweep */
  const KEY = 'k9';
  const fb9 = new Feedback(st, { ADMIN_KEY: KEY });
  await st.storage.put('ticket:huge', JSON.stringify({ id: 'huge', playerName: 'N'.repeat(1900000), category: 'bug', topic: 'ui', text: 'x', up: 0, down: 0, voters: {}, ts: 1 }));
  await st.storage.put('rate:bp_old', '{"count":5,"resetAt":0}');
  await st.storage.put('crashrate:old', '{"count":1,"resetAt":0}');
  await st.storage.put('_stats', JSON.stringify(Object.fromEntries(Array.from({ length: 5000 }, (_, i) => ['t' + i + ':bug', 1]))));
  const sweep = (key) => fb9.fetch(new Request('https://x/api/feedback/sweep', { method: 'DELETE', headers: key ? { Authorization: 'Bearer ' + key } : {} }));
  check('9: a stranger cannot sweep (404)', (await sweep(null)).status === 404 && (await sweep('guess')).status === 404);
  const sw = await sweep(KEY).then((r) => r.json());
  const left = await st.storage.list({});
  const stats9 = JSON.parse(await st.storage.get('_stats'));
  check('9: the owner\'s sweep takes away the 1.9 MB ticket and the old pace rows, and rebuilds `_stats` small',
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

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall feedback checks passed');
process.exit(failures ? 1 : 0);
