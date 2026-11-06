/* The login wheel -- v2.3.4295 (docs/specs/login-wheel.md).
 *   1. The odds ARE the art: weights = the segment spans, 100 about half.
 *   2. One spin a day per ACCOUNT (the device, up to ten characters): a second
 *      character on the device sees nothing; another device spins.
 *   3. The gold goes to the character that spins, once: a double go, a
 *      replay, a reconnect never pays twice.
 *   4. The next UTC day frees the spin.
 *   5. caps.loginspin and the kill switch; the two answers are privileged. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { LOGIN_SPIN, loginSpinPick } from '../src/loginspin.js';
import { LOGIN_SPIN_SEGS, loginSpinBus } from '../../src/game/loginSpinWheel.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name); else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const room = new GameRoom(makeState(), mockEnv);
let now = Date.UTC(2026, 10, 5, 12);
room._loginSpinNow = () => now;
const settle = () => new Promise((r) => setTimeout(r, 10));
async function join(id, device) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, device: { id: device }, data: { x: 0, y: 0, z: 'town' } }));
  return ws;
}
const ask = async (ws, type) => { ws.sent.length = 0; await room.webSocketMessage(ws, JSON.stringify({ type, payload: {} })); await settle(); return ws.sent; };
const got = (ws, t) => ws.sent.find((m) => m.type === t);

// 1. the odds are the art
{
  const S = LOGIN_SPIN.SEGS; const total = S.reduce((s, x) => s + (x.to - x.from), 0);
  check('the segments fill the circle exactly', Math.abs(total - 360) < 1e-6, total);
  const share = S.map((x) => (x.to - x.from) / 360);
  check('100 gold is about half the wheel, 10K the thinnest', share[0] > 0.48 && share[0] < 0.5 && share[5] < share[4] && share[5] > 0.02 && share[5] < 0.03, share);
  const n = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 36000; i++) n[loginSpinPick(i / 36000)]++;
  check('loginSpinPick follows the spans', n.every((c, i) => Math.abs(c / 36000 - share[i]) < 0.001), n);
  const ev = S.reduce((s, x) => s + x.coins * (x.to - x.from) / 360, 0);
  console.log('INFO average spin pays', Math.round(ev), 'gold');
}

check('MIRROR: the client segment table is the worker\'s', JSON.stringify(LOGIN_SPIN_SEGS) === JSON.stringify(LOGIN_SPIN.SEGS));

// 2-3. an account, its characters, the pot
const send = async (ws, type, payload) => { ws.sent.length = 0; await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); return ws.sent; };
const a1 = await join('bp_ls_a1', 'devaaa');
check('caps.loginspin is advertised', a1.sent.find((m) => m.type === 'state_sync' && m.caps)?.caps.loginspin === true);
room._loginSpinRand = () => 0.05;                          /* 100 gold */
const coinsOf = (id) => room.playerState[id].coins;
{
  const s = await ask(a1, 'loginspin_ask');
  check('the first ask of the day: a spin waits', s.find((m) => m.type === 'loginspin_state')?.payload.avail === true, s);
  const coins0 = coinsOf('bp_ls_a1');
  await Promise.all([room.webSocketMessage(a1, JSON.stringify({ type: 'loginspin_go', payload: {} })), room.webSocketMessage(a1, JSON.stringify({ type: 'loginspin_go', payload: {} }))]);
  await settle();
  const results = a1.sent.filter((m) => m.type === 'loginspin_result');
  check('a double go: both answers name the SAME open pot (100)', results.length === 2 && results.every((r) => r.payload.idx === 0 && r.payload.pot === 100 && r.payload.open && r.payload.can), results);
  check('...and nothing is paid yet (the pot is held)', coinsOf('bp_ls_a1') === coins0, [coins0, coinsOf('bp_ls_a1')]);
  /* double: a win doubles, the pot is still held */
  room._loginSpinRand = () => 0.2;
  let r = await send(a1, 'loginspin_double', { k: 0 });
  const w1 = r.find((m) => m.type === 'loginspin_round')?.payload;
  check('YES: a 50/50 win doubles the pot to 200 and keeps it open', w1?.win === true && w1.pot === 200 && w1.open && w1.k === 1 && coinsOf('bp_ls_a1') === coins0, w1);
  r = await send(a1, 'loginspin_double', { k: 0 });
  const rep = r.find((m) => m.type === 'loginspin_round')?.payload;
  check('a replay of round 0 (a double tap) is only answered, never rolled again', rep?.replay === true && rep.pot === 200 && rep.k === 1, rep);
  r = await send(a1, 'loginspin_double', { k: 1 });
  const w2 = r.find((m) => m.type === 'loginspin_round')?.payload;
  check('as many times as they like: 400 now', w2?.win === true && w2.pot === 400 && w2.k === 2, w2);
  r = await send(a1, 'loginspin_collect', { k: 2 });
  const c1 = r.find((m) => m.type === 'loginspin_round')?.payload;
  check('NO (collect): pays the pot once, 400, to the spinner', c1?.collected === true && coinsOf('bp_ls_a1') === coins0 + 400, [c1, coins0, coinsOf('bp_ls_a1')]);
  r = await send(a1, 'loginspin_collect', { k: 2 });
  check('a second collect pays nothing', coinsOf('bp_ls_a1') === coins0 + 400, coinsOf('bp_ls_a1'));
  const again = await ask(a1, 'loginspin_go');
  check('a go after the spin pays nothing and starts no new spin', !again.some((m) => m.type === 'loginspin_result') && coinsOf('bp_ls_a1') === coins0 + 400, again);
  check('...and says nothing is left', again.find((m) => m.type === 'loginspin_state')?.payload.avail === false);
}
{
  const a2 = await join('bp_ls_a2', 'devaaa');             /* a second character, same device */
  const s = await ask(a2, 'loginspin_ask');
  check('another character on the same device: no spin', s.find((m) => m.type === 'loginspin_state')?.payload.avail === false, s);
  const g = await ask(a2, 'loginspin_go');
  check('...and its go pays nothing', !g.some((m) => m.type === 'loginspin_result'), g);
  const b = await join('bp_ls_b1', 'devbbb');              /* another device = another account */
  const sb = await ask(b, 'loginspin_ask');
  check('another device: its own spin', sb.find((m) => m.type === 'loginspin_state')?.payload.avail === true, sb);
  /* a loss: the pot is gone, nothing is paid, and the day is spent */
  await ask(b, 'loginspin_go');
  room._loginSpinRand = () => 0.7;
  const cb = coinsOf('bp_ls_b1');
  const lr = (await send(b, 'loginspin_double', { k: 0 })).find((m) => m.type === 'loginspin_round')?.payload;
  check('a 50/50 loss: nothing, the pot closed, nothing paid', lr?.lost === true && lr.pot === 0 && !lr.open && coinsOf('bp_ls_b1') === cb, lr);
  const a1b = await join('bp_ls_a1', 'devaaa');            /* a reconnect */
  const sr = await ask(a1b, 'loginspin_ask');
  check('a reconnect the same day: nothing to spin', sr.find((m) => m.type === 'loginspin_state')?.payload.avail === false, sr);
}
// a walk-away: an open pot is collected at the account's next ask, by whichever character asks
{
  room._loginSpinRand = () => 0.05;
  const d1 = await join('bp_ls_d1', 'devddd');
  await ask(d1, 'loginspin_go');
  const cd = coinsOf('bp_ls_d1');
  check('an open pot is not yet paid', coinsOf('bp_ls_d1') === cd);
  const d2 = await join('bp_ls_d2', 'devddd');
  await ask(d2, 'loginspin_ask');
  check('walking away: the next ask of the account collects the held 100, paid to the spinner', coinsOf('bp_ls_d1') === cd + 100, [cd, coinsOf('bp_ls_d1')]);
}
// the house limit: a pot one more double would carry past 100,000 is paid by itself
{
  room._loginSpinRand = () => 0.999;                       /* 10K sliver */
  const e1 = await join('bp_ls_e1', 'devfff');
  await ask(e1, 'loginspin_go');
  const ce = coinsOf('bp_ls_e1');
  room._loginSpinRand = () => 0.1;                          /* wins */
  let k = 0, last = null;
  for (let i = 0; i < 6; i++) { const rr = (await send(e1, 'loginspin_double', { k })).find((m) => m.type === 'loginspin_round')?.payload; if (!rr || rr.replay) break; last = rr; k = rr.k; if (!rr.open) break; }
  check('10K -> 20K -> 40K -> 80K, then paid by itself (160K would pass the limit)', last && last.pot === 80000 && !last.open && coinsOf('bp_ls_e1') === ce + 80000, [last, ce, coinsOf('bp_ls_e1')]);
}

// 4. the next UTC day
{
  now += 24 * 3600 * 1000;
  const a2 = await join('bp_ls_a2', 'devaaa');
  room._loginSpinRand = () => 0.999;                       /* the 10K sliver */
  const s = await ask(a2, 'loginspin_ask');
  check('the next day the account has a spin again', s.find((m) => m.type === 'loginspin_state')?.payload.avail === true, s);
  const c0 = coinsOf('bp_ls_a2');
  await ask(a2, 'loginspin_go');
  await send(a2, 'loginspin_collect', { k: 0 });
  check('...and the character that spins it is paid (10,000)', coinsOf('bp_ls_a2') === c0 + 10000, [c0, coinsOf('bp_ls_a2')]);
}

// 4b. safe areas only
{
  const f1 = await join('bp_ls_f1', 'devggg');
  const ps = room.playerState.bp_ls_f1; ps.z = 'wheel';
  room._wheelSafeAt = () => false;
  const g = await ask(f1, 'loginspin_go');
  const st = g.find((m) => m.type === 'loginspin_state')?.payload;
  check('outside the safe ground a go is refused (safe:false), nothing spun', st?.safe === false && !g.some((m) => m.type === 'loginspin_result'), g);
  check('...and a refused go stamps nothing: the day is still unspent', !room.__lsCache.get('d:devggg') || room.__lsCache.get('d:devggg').day === 0, room.__lsCache.get('d:devggg'));
  const ag = await ask(f1, 'loginspin_ask');
  check('...and the account still has its spin (avail:true) after the refusal', ag.find((m) => m.type === 'loginspin_state')?.payload.avail === true, ag);
  /* the client: a refusal then closing the window must not grey the bar's button (v2.3.4345, the owner's playtest) */
  loginSpinBus.state({ avail: true }); loginSpinBus.open(); loginSpinBus.state({ avail: true, safe: false }); loginSpinBus.close();
  check('...and the client keeps the button bright after a refusal and a close (avail stays true)', loginSpinBus.get().avail === true, loginSpinBus.get());
  room._wheelSafeAt = () => true;
  room._loginSpinRand = () => 0.05;
  await ask(f1, 'loginspin_go');
  room._wheelSafeAt = () => false;
  const y = await send(f1, 'loginspin_double', { k: 0 });
  check('...and so is YES on a held pot (the pot stays held)', y.find((m) => m.type === 'loginspin_state')?.payload.safe === false && room.__lsCache.get('d:devggg').open === true, y);
  const n = await send(f1, 'loginspin_collect', { k: 0 });
  check('...but NO (collect) works anywhere: the gold is theirs', n.find((m) => m.type === 'loginspin_round')?.payload.collected === true);
  delete room._wheelSafeAt;
}

// 5. kill switch, privileged events
{
  room._liveFlags = { ...(room._liveFlags || {}), loginspin: false };
  const c = await join('bp_ls_c1', 'devccc');
  check('switched off: the cap is down', c.sent.find((m) => m.type === 'state_sync' && m.caps)?.caps.loginspin === false);
  const s = await ask(c, 'loginspin_ask'); const g = await ask(c, 'loginspin_go');
  check('...and every ask is refused', s.length === 0 && g.length === 0, [s, g]);
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('both answers are PRIVILEGED_EVENTS', /'loginspin_state', 'loginspin_result', 'loginspin_round'/.test(src.slice(src.indexOf('PRIVILEGED_EVENTS'))));
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall loginspin checks passed');
process.exit(failures ? 1 : 0);
