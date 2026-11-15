/* ═══ v2.3.5602: A WAITING CROWD KNOCKS MORE SLOWLY (server/src/rfspread.js; card OPS PR 3) ═══
 *
 * Red team RT-2, F2: every waiting phone knocked every 5 s, so 2,000 waiting
 * were ~400 requests a second into the room's one thread.  This holds:
 *
 *   1. under PER_S refusals a second the answer is 5 s, as before;
 *   2. over it, retryMs = 5 s x rate / PER_S, never over the phone's 30 s;
 *   3. the count is the last WINDOW_S seconds: a quiet room is back to 5 s;
 *   4. through the room: a full room's refusal (the `?rf=1` socket and an old
 *      client's 503 alike) is counted, and its `room_full` carries the scaled
 *      retryMs; the answer's other fields are as room-full.md has them;
 *   5. `rf_spread: false`: 5 s whatever the crowd (and the count still kept,
 *      so turning it on again acts at once);
 *   6. the crowd's settling point: W phones obeying it, each knocking once
 *      per retryMs, settle near sqrt(8W) a second (the header's arithmetic).
 */
import { GameRoom } from '../src/index.js';
import { RF_SPREAD, rfNote, rfRate, rfRetryMs, rfSpreadOff } from '../src/rfspread.js';
import { makeStorage, openRoom } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const knock = (room, perS, seconds, from) => {
  for (let s = 0; s < seconds; s++) for (let i = 0; i < perS; i++) rfNote(room, from + s * 1000 + Math.floor((i * 1000) / perS));
  return from + seconds * 1000;
};

/* ── 1, 2, 3: the arithmetic ── */
{
  const room = {};
  let t = knock(room, 30, 10, T0);
  check('1. 30 refusals a second: 5 s, as before', rfRetryMs(room, t - 1) === 5000 && Math.abs(rfRate(room, t - 1) - 30) < 0.5, { ms: rfRetryMs(room, t - 1), rate: rfRate(room, t - 1) });
  const r2 = {};
  t = knock(r2, 80, 10, T0);
  check('2. 80 a second: 10 s (5 s x 80 / 40)', rfRetryMs(r2, t - 1) === 10000, rfRetryMs(r2, t - 1));
  const r3 = {};
  t = knock(r3, 400, 10, T0);
  check('2. 400 a second: the phone\'s ceiling, 30 s (never more)', rfRetryMs(r3, t - 1) === RF_SPREAD.MAX_MS && RF_SPREAD.MAX_MS === 30000, rfRetryMs(r3, t - 1));
  check('3. the count is the last 10 s: 5 s later, half of it is gone', Math.abs(rfRate(r2, t - 1 + 5000) - 40) <= 8, rfRate(r2, t - 1 + 5000));
  check('3. ...and 10 s of quiet is back to 5 s', rfRetryMs(r3, t + 10000) === 5000 && rfRate(r3, t + 10000) === 0);
  const r4 = {};
  rfNote(r4, T0 + 5000);
  rfNote(r4, T0 + 1000);
  check('3. a clock that went back is not counted (no throw)', Math.abs(rfRate(r4, T0 + 5000) - 0.1) < 1e-9, rfRate(r4, T0 + 5000));
}

/* ── 4. through the room ── */
{
  const sent = [];
  globalThis.WebSocketPair = function WebSocketPair() {
    const sock = (label) => ({ label, accept() {}, send(s) { sent.push(JSON.parse(s)); }, close() {} });
    return { 0: sock('client'), 1: sock('server') };
  };
  const NativeResponse = globalThis.Response;
  globalThis.Response = class TestResponse {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.webSocket = (init && init.webSocket) || null; }
  };
  const room = await openRoom(makeStorage(), { max_players: 1 });
  room.sessions.set({ label: 'seated' }, { id: 'bp_seated', name: 'S', data: {} });
  const realNow = Date.now;
  let now = T0;
  Date.now = () => now;
  const url = new URL('https://worker.example/ws?room=brotown-1&rf=1');
  let res = room._roomFullRefusal(url);
  check('4. a full room answers room_full (101) with 5 s while the crowd is small', res.status === 101 && sent.length === 1 && sent[0].type === 'room_full' && sent[0].retryMs === 5000 && sent[0].reason === 'full' && sent[0].cap === 1, sent[0]);
  /* 100 a second for 10 s, a third of them old clients (the 503) */
  for (let s = 0; s < 10; s++) for (let i = 0; i < 100; i++) {
    now = T0 + 1000 + s * 1000 + i * 10;
    room._roomFullRefusal(i % 3 === 0 ? new URL('https://worker.example/ws?room=brotown-1') : url);
  }
  sent.length = 0;
  res = room._roomFullRefusal(url);
  check('4. 100 a second (old clients\' 503 counted too): room_full asks for ~12.5 s', sent.length === 1 && sent[0].retryMs >= 12500 && sent[0].retryMs <= 12700, sent[0]);
  check('4. ...an old client still gets the byte-identical 503', room._roomFullRefusal(new URL('https://worker.example/ws')).status === 503);
  sent.length = 0;
  room._roomFullRefusal(url, 'ip');
  check('4. the address limit\'s refusal (reason ip) is counted and scaled the same', sent[0] && sent[0].reason === 'ip' && sent[0].retryMs >= 12500, sent[0]);

  /* ── 5. the switch ── */
  room._liveFlags.rf_spread = false;
  sent.length = 0;
  room._roomFullRefusal(url);
  check('5. `rf_spread: false`: 5 s whatever the crowd', rfSpreadOff(room) && sent[0].retryMs === 5000, sent[0]);
  check('5. ...the count is still kept (turning it on acts at once)', rfRate(room, now) > 90, rfRate(room, now));
  room._liveFlags.rf_spread = true;
  check('5. unset or true is on', !rfSpreadOff(room) && !rfSpreadOff({ _liveFlags: {} }) && rfRetryMs(room, now) > 5000);
  Date.now = realNow;
  globalThis.Response = NativeResponse;
}

/* ── 6. where a crowd settles ── */
for (const W of [2000, 5000]) {
  /* W phones, each knocking when its retry is up, the retry taken from the
     answer it got; one-second steps over 120 s */
  const room = {};
  const due = new Float64Array(W).map((_, i) => (i / W) * 5000);
  /* 100 ms steps, each phone jittered +-20% as wsClient.js _rfDelay does;
     the rate averaged over the last 60 s of 180 */
  let t = 0, late = 0;
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let step = 0; step < 1800; step++) {
    for (let i = 0; i < W; i++) {
      if (due[i] > t) continue;
      rfNote(room, T0 + t);
      due[i] = t + rfRetryMs(room, T0 + t) * (0.8 + rnd() * 0.4);
      if (step >= 1200) late++;
    }
    t += 100;
  }
  const rate = late / 60;
  const want = Math.sqrt(8 * W);
  check(`6. ${W} waiting settle near sqrt(8W) = ${Math.round(want)} knocks a second (not ${W / 5})`, Math.abs(rate - want) / want < 0.25, { rate, want });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
