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
 */
import { Feedback, FEEDBACK_NAME_MAX } from '../src/feedback.js';
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

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall feedback checks passed');
process.exit(failures ? 1 : 0);
