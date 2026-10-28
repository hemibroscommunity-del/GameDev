/* THE SERVER'S OWN BOT SIGNALS (v2.3.3724, docs/specs/server-botsig.md).
 *
 * botsig.js judges only what the worker sees for itself.  What this suite pins:
 *   1. the robust statistics (botstats.js): spread and peak read by quantile,
 *      a stalled frame moves nothing, the halving keeps them small;
 *   2. AIMED: a script's straight walk through each node's centre trips it;
 *      a stick's walk (heading noise, a rough aim) never does; a keyboard's
 *      8 headings are never judged, even dead on a centre;
 *   3. GESTURE: the same start-to-strike time every harvest trips it; a
 *      person's 1.2-2.5 s does not, with network jitter on top;
 *   4. COOK: a timer's beat trips it; a person's does not;
 *   5. REFLEX: wind-ups answered at once (the round trip taken off) trip it;
 *      a person's few hundred ms do not; a kiter already walking away and a
 *      player behind a raised shield are not measured;
 *   6. ROOTED: 600 hits on 3 monsters from one spot trip it; an archer
 *      stepping between shots does not;
 *   7. MARATHON and LOOP: four hours without a five-minute break, and the
 *      same route through them;
 *   8. CLOUD: an AS number on the hidden list adds its weight, never a flag
 *      alone;
 *   9. the flag: kind `server-signals`, its reasons, in the Test panel's list;
 *      nothing flags below SIG_FLAG_AT; a hidden setting moves the line;
 *      `disable_botsig` stops the measuring; a test-mode character is never
 *      measured;
 *  10. COST: a thousand moves, hits and reactions write nothing; the evidence
 *      rides the close's write and comes back at the next join;
 *  11. the wiring: real move, extraction_start, node_strike, cook_request,
 *      monster_damage and ability_use messages reach it, and the socket's
 *      network (request.cf) is read at the opening;
 *  12. the optional re-check: OFF by default; on (and the account check
 *      configured), a flagged player is asked for Turnstile once, and passes. */
import { GameRoom } from '../src/index.js';
import { BOTSIG, freshSig, hydrateSig, judgeApproach, judgeSig } from '../src/botsig.js';
import { histNew, histAdd, histSpread, histPeak, histTotal } from '../src/botstats.js';
import { HIDDEN } from '../src/hidden.js';

const KEY = 'test-admin-key-botsig';
function makeState() {
  const store = new Map();
  let puts = 0;
  return {
    store, puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts++; (globalThis.__putKeys || (globalThis.__putKeys = [])).push(typeof k === 'string' ? k : Object.keys(k).join('+')); if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, structuredClone(v)); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = (extra) => ({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: KEY, ...(extra || {}) });
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() { this.closed = true; } }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* a seeded random, so a run is a run */
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return s - 3; };   /* ~N(0, 0.7) */
const T = BOTSIG;

/* the clock, ours */
const realNow = Date.now;
let NOW = realNow();
Date.now = () => NOW;

async function join(room, id, extra) {
  const ws = fakeWs(id);
  room.sessions.set(ws, Object.assign({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW }, extra || {}));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'P' + id.slice(-4), phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: -100000, y: -100000, z: 'town' } }));
  const session = room.sessions.get(ws);
  return { ws, session, ps: room.playerState[id] };
}

/* ── walks ── */
/* a script: straight from (x0, y0) to the centre, stopping `stop` short */
function botWalk(x0, y0, tx, ty, stop) {
  const pts = [];
  const d = Math.hypot(tx - x0, ty - y0);
  const ux = (tx - x0) / d, uy = (ty - y0) / d;
  for (let s = 0; s <= d - stop; s += 7.3) pts.push({ x: Math.round((x0 + ux * s) * 10) / 10, y: Math.round((y0 + uy * s) * 10) / 10 });
  pts.push({ x: Math.round((tx - ux * stop) * 10) / 10, y: Math.round((ty - uy * stop) * 10) / 10 });
  return pts;
}
/* a thumb on the stick: aims roughly (anywhere within 50 px of the centre),
   its heading wanders a degree or two a step, sometimes rests still for a
   stretch (a resting thumb sends the same angle: straight), steers back */
function stickWalk(x0, y0, tx, ty, stop) {
  const pts = [{ x: x0, y: y0 }];
  const ax = tx + (rnd() - 0.5) * 100, ay = ty + (rnd() - 0.5) * 100;
  let x = x0, y = y0, h = Math.atan2(ay - y0, ax - x0) + gauss() * 0.15;
  let rest = 0;
  for (let k = 0; k < 400; k++) {
    if (Math.hypot(tx - x, ty - y) <= stop) break;
    if (rest > 0) rest--;
    else {
      const want = Math.atan2(ay - y, ax - x);
      let dh = want - h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      h += dh * 0.25 + gauss() * 0.03;
      if (rnd() < 0.1) rest = 3 + Math.floor(rnd() * 8);
    }
    x += Math.cos(h) * 7.3; y += Math.sin(h) * 7.3;
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  return pts;
}
/* a keyboard: the nearest of 8 headings toward the node, then straight */
function keyWalk(x0, y0, tx, ty, stop) {
  const h = Math.round(Math.atan2(ty - y0, tx - x0) / (Math.PI / 4)) * (Math.PI / 4);
  const pts = [];
  let x = x0, y = y0;
  for (let k = 0; k < 400; k++) {
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    if (Math.hypot(tx - x, ty - y) <= stop || ((tx - x) * Math.cos(h) + (ty - y) * Math.sin(h)) < 0) break;
    x += Math.cos(h) * 7.3; y += Math.sin(h) * 7.3;
  }
  return pts;
}
/* one approach through the room's hook: the walk into the session's ring
   (as _sigOnMove keeps it), then the harvest's start */
let nodeSeq = 0;
function approach(room, P, walk, node) {
  for (const p of walk) { P.ps.x = p.x; P.ps.y = p.y; room._sigOnMove(P.session, { vx: 0, vy: 0 }); NOW += 33; }
  room._sigOnStart(P.session, { nodeId: node.id, zone: node.zone, skill: 'woodcutting' });
}
function fakeNodes(room, zone, n) {
  room.nodes = room.nodes || {};
  room.nodes[zone] = [];
  for (let i = 0; i < n; i++) room.nodes[zone].push({ id: zone + '_n' + (nodeSeq++), x: 5000 + rnd() * 3000, y: 5000 + rnd() * 3000, alive: true, nodeType: 'tree', tierLvl: 1, zone });
  return room.nodes[zone];
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sigOf = (room, id) => room._botfp.get(id).sig;

// ── 1. the statistics ──
{
  const h = histNew(72);
  for (let i = 0; i < 300; i++) histAdd(h, 1300 + (i % 3), 50, 8, 400);
  check('1. a constant (to a few ms) lands in a bin or two: spread <= 1', histSpread(h) <= 1, histSpread(h));
  histAdd(h, 60000, 50, 8, 400);
  histAdd(h, 51, 50, 8, 400);
  check('1. ...and two stalled frames move nothing (quantiles, not variance)', histSpread(h) <= 1 && histPeak(h, 2) > 0.95, { s: histSpread(h), p: histPeak(h, 2) });
  const g = histNew(72);
  for (let i = 0; i < 300; i++) histAdd(g, 1200 + rnd() * 1300 + gauss() * 40, 50, 8, 400);
  check('1. a person\'s 1.2-2.5 s spreads over many bins', histSpread(g) >= 5, histSpread(g));
  const c = histNew(72);
  for (let i = 0; i < 2000; i++) histAdd(c, 500, 50, 8, 400);
  check('1. past the cap every count halves (stored small)', histTotal(c) <= 400 && histTotal(c) >= 200, histTotal(c));
  check('1. hydrate: a broken stored sig is a fresh one; a good one round-trips',
    JSON.stringify(hydrateSig({ v: 9 })) === JSON.stringify(freshSig()) && JSON.stringify(hydrateSig(null)) === JSON.stringify(freshSig())
    && hydrateSig({ v: 1, aim: { n: 50, hit: 40 } }).aim.hit === 40 && hydrateSig({ v: 1, aim: { n: 'x', hit: 1 } }).aim.n === 0);
}

// ── 2. aimed ──
{
  const room = new GameRoom(makeState(), env());
  const nodes = fakeNodes(room, 'meadow', 12);
  const bot = await join(room, 'bp_sig_aimbot');
  for (let i = 0; i < 60; i++) {
    const n = pick(nodes);
    const from = { x: n.x + (rnd() - 0.5) * 900, y: n.y + (rnd() - 0.5) * 900 };
    approach(room, bot, botWalk(from.x, from.y, n.x, n.y, 35), n);
  }
  const sb = sigOf(room, 'bp_sig_aimbot');
  console.log('    bot aim: ' + JSON.stringify(sb.aim));
  check('2. a script walking straight through each centre: nearly every walk aimed', sb.aim.n >= 50 && sb.aim.hit / sb.aim.n > 0.85, sb.aim);
  check('2. ...the reason is aimed, and it flags (server-signals)', sb.reasons.includes('aimed') && room._botfp.get('bp_sig_aimbot').flags.some((f) => f.kind === 'server-signals'), sb.reasons);

  /* a script that never sends the start: the walk is judged at the strike */
  const ns = await join(room, 'bp_sig_nostart');
  for (let i = 0; i < 50; i++) {
    const n = pick(nodes);
    const from = { x: n.x + (rnd() - 0.5) * 900, y: n.y + (rnd() - 0.5) * 900 };
    for (const p of botWalk(from.x, from.y, n.x, n.y, 35)) { ns.ps.x = p.x; ns.ps.y = p.y; room._sigOnMove(ns.session, { vx: 0, vy: 0 }); NOW += 33; }
    room._sigOnStrike(ns.session, { id: n.id, zone: 'meadow' });
  }
  room._sigEval('bp_sig_nostart', room._botfp.get('bp_sig_nostart'), NOW);
  check('2. ...and one that never sends the start is judged at its strike: aimed', sigOf(room, 'bp_sig_nostart').aim.n >= 40 && sigOf(room, 'bp_sig_nostart').reasons.includes('aimed'), sigOf(room, 'bp_sig_nostart').aim);

  const thumb = await join(room, 'bp_sig_thumb');
  for (let i = 0; i < 300; i++) {
    const n = pick(nodes);
    const from = { x: n.x + (rnd() - 0.5) * 900, y: n.y + (rnd() - 0.5) * 900 };
    approach(room, thumb, stickWalk(from.x, from.y, n.x, n.y, 60), n);
  }
  const st = sigOf(room, 'bp_sig_thumb');
  console.log('    thumb aim: ' + JSON.stringify(st.aim));
  check('2. 300 walks with a stick (a resting thumb included): not aimed', st.aim.n >= 100 && st.aim.hit / st.aim.n < 0.1 && !st.reasons.includes('aimed'), st.aim);

  const keys = await join(room, 'bp_sig_keys');
  /* the worst case for a keyboard: nodes in a row, walked along it dead on centre */
  const row = [];
  for (let i = 0; i < 8; i++) row.push({ id: 'meadow_row' + i, x: 9000 + i * 200, y: 9000, zone: 'meadow' });
  room.nodes.meadow.push(...row);
  for (let i = 0; i < 120; i++) {
    const a = row[i % 7], b = row[(i % 7) + 1];
    approach(room, keys, keyWalk(a.x, a.y, b.x, b.y, 30), b);
  }
  const sk = sigOf(room, 'bp_sig_keys');
  check('2. a keyboard walking along a row of nodes, dead on each centre: never judged (its 8 headings)', sk.aim.n === 0 && !sk.reasons.includes('aimed'), sk.aim);
  const j = judgeApproach([{ x: 0, y: 0 }, { x: 25, y: 2 }, { x: 50, y: 0 }], 100, 0, T);
  check('2. judge: a kink over the straightness line is not straight', j && j.straight === false, j);
  check('2. judge: a run shorter than the chord is not judged', judgeApproach([{ x: 0, y: 0 }, { x: 10, y: 3 }], 100, 30, T) === null);
}

// ── 3. gesture, 4. cook ──
{
  const room = new GameRoom(makeState(), env());
  const nodes = fakeNodes(room, 'meadow', 4);
  const bot = await join(room, 'bp_sig_gbot');
  const hum = await join(room, 'bp_sig_ghum');
  for (let i = 0; i < 80; i++) {
    for (const [P, extra] of [[bot, 1210 + gauss() * 20], [hum, 1200 + rnd() * 1300 + gauss() * 40]]) {
      const n = nodes[i % 4];
      room.extractions[P.session.id] = { nodeId: n.id, zone: 'meadow', startedAt: NOW, openDelayBase: 900 };
      NOW += Math.round(900 + extra);
      room._sigOnStrike(P.session, { id: n.id, swipeFp: { ent: 0.1 } });
    }
  }
  const gb = sigOf(room, 'bp_sig_gbot'), gh = sigOf(room, 'bp_sig_ghum');
  check('3. a gesture timed to the same 1.2 s every harvest (jitter on top): gesture', gb.reasons.includes('gesture'), { s: histSpread(gb.gest) });
  check('3. ...weighs W_GEST, under the flag alone', gb.score === T.W_GEST && gb.score < T.SIG_FLAG_AT, gb.score);
  check('3. a person\'s gestures: not', !gh.reasons.includes('gesture'), { s: histSpread(gh.gest) });
  const kbd = await join(room, 'bp_sig_gkey');
  for (let i = 0; i < 80; i++) {
    const n = nodes[i % 4];
    room.extractions['bp_sig_gkey'] = { nodeId: n.id, zone: 'meadow', startedAt: NOW, openDelayBase: 900 };
    NOW += 900 + 1500;
    room._sigOnStrike(kbd.session, { id: n.id });   /* E held: no fingerprint */
  }
  check('3. E held on a computer (exactly 1.5 s every time, no fingerprint) is not timed: no false gesture', histTotal(sigOf(room, 'bp_sig_gkey').gest) === 0);
  check('3. a strike whose start is another node\'s is not timed', (() => { const before = histTotal(gh.gest); room.extractions['bp_sig_ghum'] = { nodeId: 'other', startedAt: NOW - 2000, openDelayBase: 0 }; room._sigOnStrike(hum.session, { id: nodes[0].id }); return histTotal(gh.gest) === before; })());

  const cb = await join(room, 'bp_sig_cbot');
  const ch = await join(room, 'bp_sig_chum');
  for (let i = 0; i < 80; i++) { NOW += 1334 + Math.round(gauss() * 25); room._sigOnCook(cb.session); }
  for (let i = 0; i < 80; i++) { NOW += Math.round(2600 + rnd() * 4000); room._sigOnCook(ch.session); }
  const kb = sigOf(room, 'bp_sig_cbot'), kh = sigOf(room, 'bp_sig_chum');
  check('4. cooks on a 45-a-minute timer: cook, weighing W_COOK (' + T.W_COOK + ')', kb.reasons.includes('cook') && kb.score === T.W_COOK, kb.reasons);
  check('4. a person\'s cooking: not', !kh.reasons.includes('cook'), { s: histSpread(kh.cook) });
}

// ── 5. reflex ──
{
  const room = new GameRoom(makeState(), env());
  const bot = await join(room, 'bp_sig_rbot');
  const hum = await join(room, 'bp_sig_rhum');
  const kit = await join(room, 'bp_sig_rkite');
  const m = { id: 'mon1', x: 0, y: 0 };
  for (const P of [bot, hum, kit]) { P.ps.x = 100; P.ps.y = 0; }
  kit.session._sigVel = { vx: 300, vy: 0 };   /* already walking away */
  for (let i = 0; i < 40; i++) {
    for (const [P, react] of [[bot, 80 + 15 + gauss() * 10], [hum, 80 + 260 + rnd() * 380 + gauss() * 40]]) {
      P.session._sigVel = { vx: 0, vy: 0 };
      room._sigOnWindup(P.session.id, m, NOW);
      NOW += Math.max(1, Math.round(react));
      P.ps.x += 3;
      room._sigOnMove(P.session, { vx: 300, vy: 0 });
      NOW += 2000;
    }
    room._sigOnWindup(kit.session.id, m, NOW);
    NOW += 40;
    room._sigOnMove(kit.session, { vx: 300, vy: 0 });
  }
  const rb = sigOf(room, 'bp_sig_rbot'), rh = sigOf(room, 'bp_sig_rhum'), rk = sigOf(room, 'bp_sig_rkite');
  check('5. wind-ups answered a few ms after the round trip: reflex, and it flags', rb.reasons.includes('reflex') && room._botfp.get('bp_sig_rbot').flags.some((f) => f.kind === 'server-signals'), rb.react);
  check('5. a person\'s 260-640 ms: not', rh.react.n >= 30 && !rh.reasons.includes('reflex') && rh.react.quick / rh.react.n < 0.2, rh.react);
  check('5. a kiter already walking away is not measured (no reaction to judge)', rk.react.n === 0, rk.react);
  /* a dodge answers it too; an answer past the window is no reaction */
  const d = await join(room, 'bp_sig_rdodge');
  d.ps.x = 100; d.ps.y = 0;
  room._sigOnWindup('bp_sig_rdodge', m, NOW); NOW += 90; room._sigOnAbility(d.session, { type: 'dodge' });
  room._sigOnWindup('bp_sig_rdodge', m, NOW); NOW += 3000; room._sigOnMove(d.session, { vx: 300, vy: 0 });
  check('5. a dodge is an answer; an answer after REACT_WINDOW_MS is none', sigOf(room, 'bp_sig_rdodge').react.n === 1, sigOf(room, 'bp_sig_rdodge').react);
  const sh = await join(room, 'bp_sig_rshield');
  sh.ps.x = 100; sh.ps.y = 0;
  room._sigOnWindup('bp_sig_rshield', m, NOW); NOW += 400; room._sigOnMove(sh.session, { vx: 0, vy: 0, blocking: true });
  room._sigOnWindup('bp_sig_rshield', m, NOW);
  check('5. raising the shield answers it; a player already behind it is not measured', sigOf(room, 'bp_sig_rshield').react.n === 1 && !(room._sigWU && room._sigWU.has('bp_sig_rshield')));
}

// ── 6. rooted ──
{
  const room = new GameRoom(makeState(), env());
  const bot = await join(room, 'bp_sig_root');
  const arch = await join(room, 'bp_sig_arch');
  bot.ps.x = 500.3; bot.ps.y = 700.7;
  for (let i = 0; i < 640; i++) { NOW += 100; room._sigOnHit(bot.session, { monsterId: 'm' + (i % 5) }); }
  for (let i = 0; i < 640; i++) {
    NOW += 600;
    if (i % 12 === 0) { arch.ps.x += 30 + rnd() * 40; arch.ps.y += (rnd() - 0.5) * 40; }
    room._sigOnHit(arch.session, { monsterId: 'm' + Math.floor(i / 12) });
  }
  room._sigEval('bp_sig_root', room._botfp.get('bp_sig_root'), NOW);
  room._sigEval('bp_sig_arch', room._botfp.get('bp_sig_arch'), NOW);
  check('6. 640 hits on 5 monsters without moving 2 px: rooted, and it flags', sigOf(room, 'bp_sig_root').reasons.includes('rooted')
    && room._botfp.get('bp_sig_root').flags.some((f) => f.kind === 'server-signals'), sigOf(room, 'bp_sig_root').root);
  check('6. an archer stepping between targets: not', !sigOf(room, 'bp_sig_arch').reasons.includes('rooted'), sigOf(room, 'bp_sig_arch').root);
}

// ── 7. marathon and loop, 8. cloud ──
{
  const room = new GameRoom(makeState(), env());
  const nodes = fakeNodes(room, 'meadow', 6);
  const loop = await join(room, 'bp_sig_loop');
  const pause = await join(room, 'bp_sig_pause');
  const T0 = NOW;
  let k = 0;
  while (NOW - T0 < T.MARATHON_MS + 600000) {
    const n = nodes[k % 6];
    loop.ps.x = n.x + 10; loop.ps.y = n.y;
    room._sigOnStart(loop.session, { nodeId: n.id, zone: 'meadow', skill: 'woodcutting' });
    const m2 = nodes[Math.floor(rnd() * 6)];
    room._sigOnStart(pause.session, { nodeId: m2.id, zone: 'meadow', skill: 'woodcutting' });
    k++;
    NOW += 20000;
    if (k % 500 === 0) NOW += T.BREAK_MS + 1000;   /* both take a break every ~2.8 h */
  }
  room._sigEval('bp_sig_loop', room._botfp.get('bp_sig_loop'), NOW);
  const sl = sigOf(room, 'bp_sig_loop');
  check('7. a break every ~2.8 h resets the streak: neither is a marathon at 4 h', !sl.reasons.includes('loop') && !sl.reasons.includes('marathon'), sl.act);
  const room2 = new GameRoom(makeState(), env());
  const nodes2 = fakeNodes(room2, 'meadow', 6);
  const L = await join(room2, 'bp_sig_loop2');
  const W = await join(room2, 'bp_sig_wander');
  const S0 = NOW;
  let q = 0;
  while (NOW - S0 < T.MARATHON_MS + 600000) {
    room2._sigOnStart(L.session, { nodeId: nodes2[q % 6].id, zone: 'meadow', skill: 'woodcutting' });
    room2._sigOnStart(W.session, { nodeId: nodes2[Math.floor(rnd() * 6)].id, zone: 'meadow', skill: 'woodcutting' });
    q++; NOW += 20000;
  }
  room2._sigEval('bp_sig_loop2', room2._botfp.get('bp_sig_loop2'), NOW);
  room2._sigEval('bp_sig_wander', room2._botfp.get('bp_sig_wander'), NOW);
  check('7. four hours of the same six-node loop, no break: loop', sigOf(room2, 'bp_sig_loop2').reasons.includes('loop'), sigOf(room2, 'bp_sig_loop2').loop.n);
  check('7. four hours wandering at random among the same nodes, no break: marathon only', sigOf(room2, 'bp_sig_wander').reasons.includes('marathon') && !sigOf(room2, 'bp_sig_wander').reasons.includes('loop'),
    { rep: sigOf(room2, 'bp_sig_wander').loop.rep, n: sigOf(room2, 'bp_sig_wander').loop.n });
  check('7. a marathon alone never flags (W_MARATHON < SIG_FLAG_AT)', sigOf(room2, 'bp_sig_wander').score < T.SIG_FLAG_AT && !room2._botfp.get('bp_sig_wander').flags.length);

  const cl = await join(room2, 'bp_sig_cloud', { asn: 16509, asOrg: 'AMAZON-02' });
  const sc = sigOf(room2, 'bp_sig_cloud');
  check('8. a join from a cloud network: cloud, its org kept, its weight, never a flag alone', sc.reasons.includes('cloud') && sc.net.org === 'AMAZON-02'
    && sc.score === T.W_CLOUD && !room2._botfp.get('bp_sig_cloud').flags.length, sc);
  const home = await join(room2, 'bp_sig_home', { asn: 7922, asOrg: 'COMCAST-7922' });
  check('8. a home network: nothing', !sigOf(room2, 'bp_sig_home').reasons.length);
  void cl; void home;
}

// ── 9. the flag, the hidden line, the switches ──
{
  const state = makeState();
  const room = new GameRoom(state, env());
  await room._hiddenEnsure();
  const cl = await join(room, 'bp_sig_c2', { asn: 16509 });
  check('9. cloud alone: no flag at the placeholder line', !room._botfp.get('bp_sig_c2').flags.length);
  const r = await room._adminFetch(new Request('https://w/api/admin/dev/hidden', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'SIG_FLAG_AT', value: 2 }) }));
  check('9. the line is a hidden setting (POST /dev/hidden SIG_FLAG_AT 2)', r.status === 200);
  room._sigEval('bp_sig_c2', room._botfp.get('bp_sig_c2'), NOW);
  const f = room._botfp.get('bp_sig_c2').flags.find((x) => x.kind === 'server-signals');
  check('9. ...and moved: the same evidence flags now, kind server-signals with its reasons', !!f && f.detail.reasons.includes('cloud') && f.detail.score === T.W_CLOUD, f);
  const list = await room._botfpFlaggedList();
  /* its own hourly clock: a botfp flag a minute ago does not hold it back, nor it botfp's */
  const r3 = room._botfpRecord('bp_sig_c3', NOW);
  r3.lastFlagAt = NOW - 60000;
  r3.sig = Object.assign(freshSig(), { net: { asn: 16509, org: null } });
  room._sigEval('bp_sig_c3', r3, NOW);
  check('9. its own hourly clock: a botfp flag a minute ago does not hold it back, and botfp\'s clock is untouched',
    r3.flags.some((x) => x.kind === 'server-signals') && r3.lastFlagAt === NOW - 60000);
  room._sigEval('bp_sig_c3', r3, NOW + 1000);
  check('9. ...and at most one an hour', r3.flags.filter((x) => x.kind === 'server-signals').length === 1);
  check('9. it shows in the Test panel\'s Bot flags list', list.some((x) => x.id === 'bp_sig_c2' && x.last.kind === 'server-signals' && Array.isArray(x.last.detail.reasons)), list);
  const off = await room._adminFetch(new Request('https://w/api/admin/flags', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'disable_botsig', value: true }) }));
  check('9. `disable_botsig` is a lower-case live flag', off.status === 200);
  const p = await join(room, 'bp_sig_off');
  p.ps.x = 1; p.ps.y = 1;
  for (let i = 0; i < 700; i++) room._sigOnHit(p.session, { monsterId: 'm' + (i % 4) });
  room._sigOnMove(p.session, { vx: 0, vy: 0 });
  check('9. ...thrown: nothing is measured', !(sigOf(room, 'bp_sig_off') && sigOf(room, 'bp_sig_off').root.max) && !p.session._sigPath);
  await room._adminFetch(new Request('https://w/api/admin/flags?name=disable_botsig', { method: 'DELETE', headers: { Authorization: 'Bearer ' + KEY } }));
  const tm = await join(room, 'bp_sig_tm');
  tm.ps._testMode = true;
  tm.ps.x = 1; tm.ps.y = 1;
  for (let i = 0; i < 700; i++) room._sigOnHit(tm.session, { monsterId: 'm' + (i % 4) });
  room._sigOnWindup('bp_sig_tm', { x: 0, y: 0 }, NOW);
  /* ...nor scored for anything else: every signal's door at once */
  tm.ps.x = 100; tm.ps.y = 100;
  tm.session.asn = 16509;
  room._sigOnJoin(tm.session);
  for (let i = 0; i < 80; i++) {
    room._sigOnCook(tm.session);
    room.extractions['bp_sig_tm'] = { nodeId: 'x', zone: 'meadow', startedAt: NOW - 2000, openDelayBase: 0 };
    room._sigOnStrike(tm.session, { id: 'x', swipeFp: { ent: 0.1 } });
    room._sigOnStart(tm.session, { nodeId: 'x', zone: 'meadow' });
    room._sigOnMove(tm.session, { vx: 1, vy: 0, dodging: true });
    room._sigOnAbility(tm.session, { type: 'dodge' });
    NOW += 1334;
  }
  const tsig = room._botfp.get('bp_sig_tm') && room._botfp.get('bp_sig_tm').sig;
  check('9. a test-mode character sails through every signal: network, cook, gesture, walk, reflex -- nothing measured, nothing flagged',
    (!tsig || (tsig.net.asn === null && histTotal(tsig.cook) === 0 && histTotal(tsig.gest) === 0 && tsig.aim.n === 0 && tsig.react.n === 0 && tsig.loop.n === 0))
    && !(room._botfp.get('bp_sig_tm') && room._botfp.get('bp_sig_tm').flags.some((f) => f.kind === 'server-signals')) && !tm.session._sigPath, tsig);
  check('9. a test-mode character is never measured', !(sigOf(room, 'bp_sig_tm') && sigOf(room, 'bp_sig_tm').root.max) && !(room._sigWU && room._sigWU.has('bp_sig_tm')));
  void cl;
}

// ── 10. cost ──
{
  const state = makeState();
  const room = new GameRoom(state, env());
  const nodes = fakeNodes(room, 'meadow', 6);
  const P = await join(room, 'bp_sig_cost');
  await new Promise((r) => setTimeout(r, 0));
  const before = state.puts();
  const m = { id: 'mc', x: P.ps.x - 1000, y: P.ps.y };
  for (let i = 0; i < 1000; i++) {
    NOW += 33; P.ps.x += 3; P.ps.y += (i % 7) * 0.1;
    /* a person's answer: ten moves (~330 ms) after each wind-up, they step away
       (script-quick answers would flag, and a flag is written at once, on purpose) */
    room._sigOnMove(P.session, { vx: (i % 25) === 10 ? 300 : 0, vy: 0 });
    room._sigOnHit(P.session, { monsterId: 'mc' });
    if (i % 25 === 0) room._sigOnWindup('bp_sig_cost', m, NOW);
  }
  await new Promise((r) => setTimeout(r, 0));
  check('10. a thousand moves, hits and reactions write nothing', state.puts() === before, { puts: state.puts() - before, keys: (globalThis.__putKeys || []).slice(-3) });
  for (let i = 0; i < 30; i++) room._sigOnStart(P.session, { nodeId: nodes[i % 6].id, zone: 'meadow', skill: 'woodcutting' });
  await new Promise((r) => setTimeout(r, 0));
  check('10. ...thirty harvest starts within the pace write nothing more (botfp\'s PUT_MIN_MS pace)', state.puts() - before <= 1, { puts: state.puts() - before });
  room._botfpFlush(P.session);
  await new Promise((r) => setTimeout(r, 0));
  const stored = state.store.get('botstat:bp_sig_cost');
  check('10. the close writes the evidence in the botstat record it always wrote', !!stored && stored.sig && stored.sig.react.n > 0 && stored.sig.root.max > 0, stored && stored.sig);
  const room2 = new GameRoom(state, env());
  const P2 = await join(room2, 'bp_sig_cost');
  void P2;
  const s2 = room2._botfp.get('bp_sig_cost').sig;
  check('10. ...and the next join reads it back (reconnecting clears nothing)', s2 && s2.react.n === stored.sig.react.n && s2.root.max === stored.sig.root.max, s2);
}

// ── 11. the wiring ──
{
  const state = makeState();
  const room = new GameRoom(state, env());
  const P = await join(room, 'bp_sig_wire');
  const send = (type, payload) => room.webSocketMessage(P.ws, JSON.stringify(Object.assign({ type }, payload)));
  P.ps.z = 'meadow';
  const n = room._ensureZoneNodes('meadow')[0];
  P.ps.x = n.x - 120; P.ps.y = n.y; P.ps.lastMoveAt = undefined;
  for (let i = 0; i < 12; i++) { NOW += 66; await send('move', { x: n.x - 120 + i * 9, y: n.y, z: 'meadow', vx: 300, vy: 0, d: 'right', f: 'east' }); }
  check('11. a real move reaches the ring', Array.isArray(P.session._sigPath) && P.session._sigPath.length >= 5, P.session._sigPath && P.session._sigPath.length);
  P.ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  await send('extraction_start', { payload: { nodeId: n.id, zone: 'meadow', skill: room._harvestSkillName(n.nodeType) } });
  check('11. extraction_start reaches the aim', sigOf(room, 'bp_sig_wire').loop.prev === 'meadow:' + n.id, sigOf(room, 'bp_sig_wire').loop);
  const ex = room.extractions['bp_sig_wire'];
  if (ex) ex.startedAt = NOW - (ex.openDelayBase || 0) - 1500;
  await send('node_strike', { payload: { id: n.id, zone: 'meadow', accuracy: 'good', swipeFp: { len: 800, n: 90, dur: 1500, ent: 0.12, tv: 40, vc: 0.3, h: 'w1' } } });
  check('11. node_strike is timed against its start before the handler spends it', histTotal(sigOf(room, 'bp_sig_wire').gest) === 1);
  await send('cook_request', { payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
  NOW += 3000;
  await send('cook_request', { payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
  check('11. cook_request reaches the beat', histTotal(sigOf(room, 'bp_sig_wire').cook) === 1);
  await send('monster_damage', { payload: { monsterId: 'nope', zone: 'meadow', slot: 'melee' } });
  check('11. monster_damage reaches the spot', sigOf(room, 'bp_sig_wire').root.run === 1);
  room._sigOnWindup('bp_sig_wire', { x: P.ps.x + 100, y: P.ps.y }, NOW);
  NOW += 500;
  await send('ability_use', { payload: { type: 'dodge' } });
  check('11. ability_use dodge reaches the reflex', sigOf(room, 'bp_sig_wire').react.n === 1);
  /* the socket's network: fetch's upgrade reads request.cf */
  const src = (await import('node:fs')).readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('11. the upgrade reads request.cf.asn and asOrganization onto the session', /request\.cf/.test(src) && /asOrganization/.test(src) && /asn: Number\.isFinite\(_asn\)/.test(src));
  const tg = (await import('node:fs')).readFileSync(new URL('../src/telegraph.js', import.meta.url), 'utf8');
  check('11. both wind-up starts (basic and telegraph) start the reflex clock', (tg.match(/_sigOnWindup\(/g) || []).length === 2);
}

// ── 12. the optional re-check ──
{
  const state = makeState();
  const room = new GameRoom(state, env({ TURNSTILE_SECRET: 's', TURNSTILE_SITEKEY: 'k' }));
  room._verifyToken = async (tok) => tok === 'good-token';
  const id = 'bp_sig_rv';
  state.store.set('botstat:' + id, { v: 1, counters: {}, flags: [{ at: NOW, kind: 'server-signals', detail: { reasons: ['aimed'] } }], sig: Object.assign(freshSig(), { reverify: true }) });
  /* the character exists (a key on file is not needed for this: the join's auth passes for a phrase it stamps) */
  /* a new character passes the account check once, as ever (verify.js) */
  const a = { ws: fakeWs(id) };
  room.sessions.set(a.ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
  await room.webSocketMessage(a.ws, JSON.stringify({ type: 'join', id, name: 'Rv', phrase: 'p-' + id, verify: 'good-token', protocolVersion: 2, ws: [1, 5], data: { x: -100000, y: -100000, z: 'town' } }));
  check('12. OFF by default: a flagged player joins as ever', !!room.playerState[id] && !a.ws.sent.some((m) => m.type === 'join_rejected'), a.ws.sent.filter((m) => m.type === 'join_rejected'));
  room._liveFlags = Object.assign(room._liveFlags || {}, { botsig_reverify: true });
  const fresh = new GameRoom(state, env({ TURNSTILE_SECRET: 's', TURNSTILE_SITEKEY: 'k' }));
  fresh._liveFlags = { botsig_reverify: true };
  fresh._verifyToken = async (tok) => tok === 'good-token';
  check('12. on: refused without a token (the account check asked again)', (await fresh._sigReverifyOk(id, null, '1.2.3.4')) === false);
  check('12. ...passes with one', (await fresh._sigReverifyOk(id, 'good-token', '1.2.3.4')) === true);
  check('12. ...and once: the record says it is passed', state.store.get('botstat:' + id).sig.reverify === false && (await fresh._sigReverifyOk(id, null, '1.2.3.4')) === true);
  const unconf = new GameRoom(state, env());
  unconf._liveFlags = { botsig_reverify: true };
  state.store.get('botstat:' + id).sig.reverify = true;
  check('12. on, but the account check not configured: never asked', (await unconf._sigReverifyOk(id, null, '1.2.3.4')) === true);
  state.store.set('testmode:' + id, { v: 1, on: true, at: NOW, name: 'Rv' });
  check('12. a character in test mode is never re-checked (the owner\'s mode supersedes the anti-bot)', (await fresh._sigReverifyOk(id, null, '1.2.3.4')) === true);
  state.store.delete('testmode:' + id);
  const src = (await import('node:fs')).readFileSync(new URL('../src/join.js', import.meta.url), 'utf8');
  check('12. the join asks it after the key is accepted, and refuses the way the account check does', /_authOk === true && !\(await this\._sigReverifyOk\(msg\.id, msg\.verify, session\.ip\)\)\) \{ this\._verifyRefuse\(ws\); return; \}/.test(src));
}

// ── the reasons' words are where the owner reads them ──
{
  const dp = (await import('node:fs')).readFileSync(new URL('../../src/ui/panels/DevPanel.jsx', import.meta.url), 'utf8');
  const missing = ['server-signals', 'aimed', 'reflex', 'rooted', 'cook', 'gesture', 'loop', 'marathon', 'cloud'].filter((r) => !dp.includes("'" + r + "'") && !dp.includes(r + ':'));
  check('the Test panel says every reason in words', missing.length === 0, missing);
  void HIDDEN;
  void judgeSig;
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
if (failures) process.exit(1);
