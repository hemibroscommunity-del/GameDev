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
 */
import { Feedback } from '../src/feedback.js';
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
  await room.webSocketMessage(ws, JSON.stringify({ type: 'emote', payload: { id: 'bp_fb_a', emote: 'wave' } }));
  check('...while an ordinary client broadcast (emote) still relays (control)',
    room.eventBuffer.some((e) => e && e.type === 'emote'), room.eventBuffer.map((e) => e && e.type));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall feedback checks passed');
process.exit(failures ? 1 : 0);
