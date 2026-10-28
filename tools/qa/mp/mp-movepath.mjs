/* ═══ v2.3.3732: THE MESSAGE DIET -- A STEADY WALK IS A PATH, NOT A STREAM ═══
 *
 * A phone on the path (`?diet=1` in its address, or every phone with
 * `pathall: true` in the live flags) in the Wheel sends a steady walk about 5 times a second with its speed and
 * a change at once, and the worker moves its copy along that speed between
 * (server/src/movepath.js, src/game/moveDiet.js pathMayWait, wsClient.js
 * movePathOn; docs/specs/move-path.md).  Run TWICE, a page as today and one
 * with ?diet=1, each with a real page and a bare peer socket beside it (and
 * on the first, the live switches flipped: `pathall`, then the kill switch,
 * each reaching the page at once):
 *
 *   1. a straight walk in BroTown: moves a second on the wire (seen by the
 *      peer), and how often the peer's copy is updated;
 *   2. a zig-zag in BroTown (straight runs, hard reversals, sidesteps at roll
 *      speed): the worker's copy against the phone (read 20 times a second
 *      off /api/admin/player), overall and in the 150 ms after each change;
 *      the copy's biggest step between reads; the peer's DRAWING of the walker
 *      (its own visualSystems.js model, fed what the peer was sent);
 *   3. the same zig-zag among a land's monsters (test mode, so the page may
 *      put its walk next to them; god mode, so it lives): every
 *      `monster_attack` on the walker, how many came within 150 ms after a
 *      change, and how far the copy was from the phone at that moment;
 *   4. on: the page says the path is on and kept moves back; off: it says
 *      neither; no page errors.
 * It passes only as "no worse": with the path, the copy is no further from
 * the phone (in BroTown and among the monsters, overall and after a change),
 * the peer draws the walker no worse, and the wire carries clearly fewer.
 *
 * As mp-movediet: this box draws in software and its page runs its timers a
 * few times a second, so during a walk the game draws a frame a second and
 * the walk is the game's own move broadcast written every 16 ms from a page
 * timer, its place by the time that really passed; the game's own moves are
 * held off the wire meanwhile.  What is under test is the shim's batch and
 * the worker.
 *
 *   node tools/qa/mp/run.mjs movepath
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const SPEED = 165;     /* px a second, a phone's walk */
const ROLL_PX_F = 6;   /* a roll's speed, px a 60 Hz frame (BroTown.jsx bcastVx) */
const AFTER_MS = 150;

/* the peer: a bare socket in BroTown that keeps every tick entry of the
   watched player, with when it came */
function peer(wsPort) {
  const p = { ws: null, synced: false, watch: null, got: [] };
  p.id = 'mppeer' + Math.random().toString(36).slice(2, 10);
  p.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?rf=1`);
    p.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: p.id, name: 'Peer', protocolVersion: 2, httpAuth: true, ws: [1, 5],
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Peer' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!p.synced && ev.data.startsWith('{"type":"state_sync"')) { p.synced = true; resolve(); }
      if (p.watch && ev.data.startsWith('{"type":"tick"') && ev.data.indexOf('"' + p.watch + '":') >= 0) {
        try { const m = JSON.parse(ev.data); const e = m.players && m.players[p.watch]; if (e && typeof e.x === 'number') p.got.push([Date.now(), e]); } catch {}
      }
    };
    ws.onerror = () => reject(new Error('peer socket error'));
  });
  const mv = (x, y, z) => p.ws.send(JSON.stringify({ type: 'move', x, y, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
    vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false }));
  p.place = async (x, y) => { mv(1000, 1000, 'town'); await new Promise((r) => setTimeout(r, 300)); mv(x, y, 'wheel'); };
  p.keep = setInterval(() => { try { if (p.ws && p.ws.readyState === 1 && p.x) mv(p.x, p.y, 'wheel'); } catch {} }, 1000);
  p.close = () => { clearInterval(p.keep); try { p.ws.close(); } catch {} };
  return p;
}

/* On the walker's page, before the game connects: every move on the wire,
   and every monster_attack that comes in */
function instrument() {
  window.__mvWire = [];
  window.__mvHits = [];
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    if (typeof d === 'string' && d.indexOf('"type":"move"') >= 0 && window.__mvWire.length < 20000) {
      try {
        const v = JSON.parse(d);
        for (const m of Array.isArray(v) ? v : [v]) if (m && m.type === 'move') window.__mvWire.push([performance.now(), m.pd === 1 ? 1 : 0]);
      } catch (e) { /* not ours */ }
    }
    return send.call(this, d);
  };
  const desc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
  Object.defineProperty(WebSocket.prototype, 'onmessage', {
    configurable: true,
    get() { return desc.get.call(this); },
    set(fn) {
      const wrapped = function (ev) {
        try {
          if (typeof ev.data === 'string' && ev.data.indexOf('monster_attack') >= 0) {
            const at = Date.now();
            const v = JSON.parse(ev.data);
            const walk = (o) => {
              if (!o || typeof o !== 'object') return;
              if (Array.isArray(o)) { for (const x of o) walk(x); return; }
              if (o.type === 'monster_attack' && o.payload) window.__mvHits.push([at, o.payload.targetId, !!o.payload.dodged]);
              else if (o.events) walk(o.events);
            };
            walk(v);
          }
        } catch (e) { /* not ours */ }
        return fn && fn.apply(this, arguments);
      };
      desc.set.call(this, wrapped);
    },
  });
}

/* the phone's drawing of another player (src/game/visualSystems.js, as in
   server/test/move-path.test.mjs) -- fed what the peer got, judged against
   where the walker really was */
function drawn(updates, truth) {
  let o = null, k = 0;
  const err = [];
  if (!truth.length) return { mean: 0, p95: 0, n: 0 };
  const t0 = truth[0][0], t1 = truth[truth.length - 1][0];
  let j = 0;
  for (let t = t0; t <= t1; t += 1000 / 60) {
    while (k < updates.length && updates[k][0] <= t) {
      const e = updates[k][1];
      if (!o) o = { x: e.x, y: e.y, rx: e.x, ry: e.y, svx: e.vx / 100, svy: e.vy / 100 };
      o.x = e.x; o.y = e.y; o.vx = e.vx / 100; o.vy = e.vy / 100;
      k++;
    }
    while (j + 1 < truth.length && truth[j + 1][0] <= t) j++;
    if (!o) continue;
    const vk = 0.15, nk = 0.03, ik = 0.15;
    o.svx += (o.vx - o.svx) * vk; o.svy += (o.vy - o.svy) * vk;
    if (o.vx === 0 && Math.abs(o.svx) < 0.01) o.svx = 0;
    if (o.vy === 0 && Math.abs(o.svy) < 0.01) o.svy = 0;
    const dx = o.x - o.rx, dy = o.y - o.ry, d = Math.hypot(dx, dy);
    if (d > 100) { o.rx = o.x; o.ry = o.y; }
    else if (Math.abs(o.svx) > 0.005 || Math.abs(o.svy) > 0.005) {
      o.rx += o.svx; o.ry += o.svy;
      if (d > 30) { o.rx += dx * nk; o.ry += dy * nk; }
    } else if (d > 0.5) { o.rx += dx * ik; o.ry += dy * ik; }
    else { o.rx = o.x; o.ry = o.y; }
    err.push(Math.hypot(o.rx - truth[j][1], o.ry - truth[j][2]));
  }
  return stats(err);
}
function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return { mean: s.reduce((a, b) => a + b, 0) / Math.max(1, s.length), p95: s[Math.floor(s.length * 0.95)] || 0, max: s[s.length - 1] || 0, n: s.length };
}
const r1 = (v) => Math.round(v * 10) / 10;

/* where the walker really was at `t` (Date.now ms), from the page's record */
function truthAt(truth, t) {
  let lo = 0, hi = truth.length - 1;
  if (hi < 0 || t < truth[0][0] || t > truth[hi][0] + 50) return null;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (truth[m][0] <= t) lo = m; else hi = m - 1; }
  return truth[lo];
}

/* The walk: legs {ms, ang (radians) | null, roll?}; the game's own move
   broadcast every 16 ms from a page timer.  Returns the page's record of
   where it was (Date.now, x, y), when each leg began, and the wire count. */
const walkOn = (A, legs, start) => Promise.race([new Promise((_, rej) => setTimeout(() => rej(new Error('the walk did not finish in 90 s')), 90000)), walkOnPage(A, legs, start)]);
const walkOnPage = (A, legs, start) => A.page.evaluate(({ legs, speed, roll, start }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const ch = S.channel;
  if (!ch.__qaWrapped) {
    const orig = ch.send;
    ch.send = function (m) {
      if (window.__qaOwnMoves && m && m.event === 'move' && !(m.payload && m.payload.__qa)) return undefined;
      return orig.apply(this, arguments);
    };
    ch.__qaWrapped = true;
  }
  window.__qaOwnMoves = true;
  if (!window.__qaRaf) window.__qaRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 1000);
  const wire0 = window.__mvWire.length;
  const d0 = window.__btMoveDiet ? window.__btMoveDiet() : null;
  let x = start ? start[0] : S.player.x, y = start ? start[1] : S.player.y;
  const truth = [], changes = [];
  let li = 0, legT = performance.now(), last = performance.now();
  changes.push(Date.now());
  const timer = setInterval(() => {
    const now = performance.now();
    const dt = now - last; last = now;
    if (li < legs.length && now - legT >= legs[li].ms) { li++; legT = now; changes.push(Date.now()); }
    const leg = legs[li];
    const done = !leg;
    let vx = 0, vy = 0;
    if (!done && leg.ang !== null) {
      const sp = leg.roll ? roll * 60 : speed;
      const ux = Math.cos(leg.ang), uy = Math.sin(leg.ang);
      x += ux * sp * dt / 1000; y += uy * sp * dt / 1000;
      vx = Math.round(ux * sp / 60 * 100); vy = Math.round(uy * sp / 60 * 100);
    }
    truth.push([Date.now(), x, y]);
    ch.send({ type: 'broadcast', event: 'move', payload: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'right', f: 'east', z: 'wheel', vx, vy, __qa: 1 } });
    if (done) {
      clearInterval(timer);
      setTimeout(() => {
        window.__qaOwnMoves = false;
        window.requestAnimationFrame = window.__qaRaf;
        const d1 = window.__btMoveDiet ? window.__btMoveDiet() : null;
        resolve({ truth, changes, wire: window.__mvWire.slice(wire0), diet: d1, waited: d0 && d1 ? d1.pathWaited - d0.pathWaited : null });
      }, 250);
    }
  }, 16);
}), { legs, speed: SPEED, roll: ROLL_PX_F, start: start || null });

/* the worker's copy, read off /api/admin/player as fast as it answers (about
   20 a second), with the moment it was read */
function readCopy(wsPort, id) {
  const out = [];
  let on = true;
  const loop = (async () => {
    while (on) {
      const t0 = Date.now();
      try {
        const live = await H.serverPlayer(wsPort, id);
        const t1 = Date.now();
        if (live && typeof live.x === 'number') out.push([(t0 + t1) / 2, live.x, live.y, t1 - t0]);
      } catch { /* the next */ }
      const wait = 50 - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  })();
  return { out, stop: async () => { on = false; await loop; } };
}
function copyErr(copy, truth, changes, onlyAfter) {
  const err = [], after = [];
  let worstStep = 0;
  for (let i = 0; i < copy.length; i++) {
    const [t, x, y, lat] = copy[i];
    if (lat > 30) continue;   /* a slow read says little about when it was */
    const p = truthAt(truth, t);
    if (!p) continue;
    const e = Math.hypot(x - p[1], y - p[2]);
    err.push(e);
    if (changes.some((c) => t >= c && t <= c + AFTER_MS)) after.push(e);
    if (i > 0) worstStep = Math.max(worstStep, Math.hypot(x - copy[i - 1][1], y - copy[i - 1][2]) - SPEED * (t - copy[i - 1][0]) / 1000);
  }
  return { all: stats(err), after: stats(after), worstStepOverWalk: worstStep };
}

/* the zig-zag: runs, hard reversals, quarter turns, sidesteps at roll speed */
function zig(baseAng) {
  const L = [];
  const A = (k) => baseAng + k * Math.PI / 2;
  L.push({ ms: 700, ang: A(0) }, { ms: 500, ang: A(1) });
  for (let i = 0; i < 6; i++) L.push({ ms: 220, ang: A(i % 2 ? 2 : 0) });
  L.push({ ms: 300, ang: A(3), roll: true }, { ms: 400, ang: A(0) }, { ms: 300, ang: A(1), roll: true }, { ms: 300, ang: null });
  for (let i = 0; i < 6; i++) L.push({ ms: 250, ang: A(i % 2 ? 1 : 3) });
  L.push({ ms: 600, ang: A(2) }, { ms: 400, ang: null });
  return L;
}

async function oneRun(browser, wsPort, webPort, rec, on) {
  const tag = on ? 'path on' : 'today';
  /* the worker understands the path by default; this one phone asks for it
     with ?diet=1 (wsClient.js movePathOn) */
  const A = await H.newPlayer(browser, { name: on ? 'PathOn' : 'PathOff', wsPort, webPort, world: 'wheel', wide: true, viewport: VIEW, init: instrument, query: on ? 'diet=1' : '' });
  const conLog = [];
  A.page.on('console', (m) => { conLog.push(m.type() + ' ' + m.text()); if (conLog.length > 60) conLog.shift(); });
  A.page.on('framenavigated', (f) => { if (f === A.page.mainFrame()) { console.log(`      ${tag}: the page navigated to ${f.url()}`); console.log(conLog.slice(-40).map((l) => '        | ' + String(l).slice(0, 220)).join('\n')); } });
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  /* this box draws in software, and with the game's frames slowed for the
     walks (below) the black-screen watchdog sees a dark Wheel and reloads the
     page (BroTown.jsx, "world dark 20s despite rebuild"): it does not judge
     before the intro lifts, so the lift's stamp is taken away (otherwise only
     toasts read it) */
  await A.page.evaluate(() => { const S = window._gameState.current; S.__introLiftedAt = 0; }).catch(() => {});
  const stopKeep = H.keepAlive(A, 15000);
  let P = null;
  try {
    return await oneRunIn(A, P = peer(wsPort), wsPort, rec, on, tag, inWheel);
  } finally {
    stopKeep();
    if (P) P.close();
    await A.ctx.close().catch(() => {});
  }
}

async function oneRunIn(A, P, wsPort, rec, on, tag, inWheel) {
  await A.page.waitForTimeout(2000);
  const a0 = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, caps: !!(S._serverCaps && S._serverCaps.movepath) }));
  await P.open();
  P.x = a0.x - 150; P.y = a0.y;
  await P.place(P.x, P.y);
  await A.page.waitForTimeout(2000);
  const path = await A.page.evaluate(() => window.__btMoveDiet ? window.__btMoveDiet().path : null);
  rec.ok(`${tag} -- setup: the walker in the Wheel's BroTown with a peer beside them; caps.movepath ${a0.caps}, the page's path ${path}`,
    inWheel && a0.caps === true && path === on, { inWheel, a0, path });
  /* the live switches, on the page without ?diet=1: `pathall` puts it on the
     path and the kill switch takes it off, each at once, no reload */
  if (!on) {
    const pathNow = () => A.page.evaluate(() => (window.__btMoveDiet ? window.__btMoveDiet().path : null));
    const waitPath = async (want) => { for (let i = 0; i < 20; i++) { if ((await pathNow()) === want) return true; await A.page.waitForTimeout(250); } return false; };
    await H.liveFlag(wsPort, 'pathall', true);
    const allOn = await waitPath(true);
    await H.liveFlag(wsPort, 'movepath', false);
    const killed = await waitPath(false);
    await H.liveFlag(wsPort, 'movepath', null);
    const back = await waitPath(true);
    await H.liveFlag(wsPort, 'pathall', null);
    const off = await waitPath(false);
    rec.ok(`the live switches reach a phone at once: pathall on -> on ${allOn}, the kill switch -> off ${killed}, cleared -> on ${back}, pathall cleared -> off ${off}`,
      allOn && killed && back && off, { allOn, killed, back, off });
  }
  const out = { tag };

  /* ── 1. a straight walk ── */
  console.log(`      ${tag}: 1 straight (url ${A.page.url()})`);
  P.watch = a0.id; P.got = [];
  const st = await walkOn(A, [{ ms: 3000, ang: 0 }]);
  out.rate = st.wire.length / 3;
  out.pdShare = st.wire.length ? st.wire.filter((w) => w[1]).length / st.wire.length : 0;
  out.peerRate = P.got.filter((g) => g[0] >= st.truth[0][0] && g[0] <= st.truth[st.truth.length - 1][0]).length / 3;
  out.waited = st.waited;
  await A.page.waitForTimeout(1200);

  /* ── 2. the zig-zag in BroTown ── */
  console.log(`      ${tag}: 2 zigzag (url ${A.page.url()})`);
  P.got = [];
  const rd = readCopy(wsPort, a0.id);
  const zz = await walkOn(A, zig(Math.PI));
  await rd.stop();
  const zs = zig(0).reduce((a, l) => a + l.ms, 0) / 1000;
  out.zigRate = zz.wire.length / zs;
  out.town = copyErr(rd.out, zz.truth, zz.changes.slice(1));
  out.watch = drawn(P.got.filter((g) => g[0] >= zz.truth[0][0]), zz.truth);
  await A.page.waitForTimeout(1200);

  /* ── 3. among a land's monsters ── */
  console.log(`      ${tag}: 3 land (url ${A.page.url()})`);
  await H.devOp(wsPort, 'testmode', a0.id, { on: true });
  await H.devOp(wsPort, 'vitals', a0.id, { god: true, godMinutes: 8 });
  /* to the Flame Fields' first goblins (mp-monsternumbers' way there) */
  await H.openLands(A, wsPort).catch(() => null);
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const spot = WHEEL_SPAWNS.ember.points[0];
  console.log(`      ${tag}: lands open, gliding to the Flame Fields`);
  await H.glideTo(A, spot[0], spot[1] + 40, { timeoutMs: 90000 });
  console.log(`      ${tag}: there (url ${A.page.url()})`);
  await A.page.waitForTimeout(3000);
  const mon = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m && m.alive && typeof m.x === 'number');
    const me = S.player;
    ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    return ms.slice(0, 1).map((m) => ({ x: m.x, y: m.y, id: m.id, arch: m.arch || m.archetype }))[0] || null;
  });
  out.hits = null;
  if (mon) {
    let n = 0, all = 0, afterN = 0;
    const atHit = [], hitAfter = [];
    for (let rep = 0; rep < 3; rep++) {
      const h0 = await A.page.evaluate(() => window.__mvHits.length);
      const rd2 = readCopy(wsPort, a0.id);
      const legs = [];
      for (let k = 0; k < 2; k++) legs.push(...zig(k * Math.PI / 4));
      const w = await walkOn(A, legs, [mon.x + 40, mon.y + 30]);
      await rd2.stop();
      const hits = (await A.page.evaluate((h0) => window.__mvHits.slice(h0), h0)).filter((h) => h[1] === a0.id);
      const ce = copyErr(rd2.out, w.truth, w.changes.slice(1));
      all += ce.all.n; n++;
      for (const [t] of hits) {
        const after = w.changes.slice(1).some((c) => t >= c && t <= c + AFTER_MS);
        if (after) afterN++;
        /* the copy nearest the blow (the blow left the worker a moment before
           the page heard it, on this box a few ms) */
        let best = null;
        for (const c of rd2.out) if (c[3] <= 30 && (!best || Math.abs(c[0] - t) < Math.abs(best[0] - t))) best = c;
        const p = best && truthAt(w.truth, best[0]);
        if (best && p && Math.abs(best[0] - t) <= 60) { const e = Math.hypot(best[1] - p[1], best[2] - p[2]); atHit.push(e); if (after) hitAfter.push(e); }
      }
      out.hitsTotal = (out.hitsTotal || 0) + hits.length;
      out.landCopy = out.landCopy || [];
      out.landCopy.push(ce);
      out.landSecs = (out.landSecs || 0) + legs.reduce((a, l) => a + l.ms, 0) / 1000;
      await A.page.waitForTimeout(800);
    }
    out.hits = { total: out.hitsTotal, after: afterN, perS: out.hitsTotal / out.landSecs, atHit: stats(atHit), atHitAfter: stats(hitAfter) };
    out.land = {
      mean: out.landCopy.reduce((a, c) => a + c.all.mean * c.all.n, 0) / Math.max(1, out.landCopy.reduce((a, c) => a + c.all.n, 0)),
      p95: Math.max(...out.landCopy.map((c) => c.all.p95)),
      afterMean: out.landCopy.reduce((a, c) => a + c.after.mean * c.after.n, 0) / Math.max(1, out.landCopy.reduce((a, c) => a + c.after.n, 0)),
      afterP95: Math.max(...out.landCopy.map((c) => c.after.p95)),
    };
  }
  await H.devOp(wsPort, 'vitals', a0.id, { god: false });
  await H.devOp(wsPort, 'testmode', a0.id, { on: false });

  rec.ok(`${tag}: a straight walk sends ${r1(out.rate)} moves a second (${Math.round(out.pdShare * 100)}% marked for the path, ${out.waited} kept back); the peer is sent the walker ${r1(out.peerRate)} times a second; `
    + `the zig-zag ${r1(out.zigRate)} a second`,
    on ? (out.pdShare > 0.9 && out.waited > 0) : (out.pdShare === 0), out);
  console.log(`      ${tag}: BroTown zig-zag, the copy from the phone: mean ${r1(out.town.all.mean)} px, 95% ${r1(out.town.all.p95)}, in the ${AFTER_MS} ms after a change mean ${r1(out.town.after.mean)}, 95% ${r1(out.town.after.p95)} `
    + `(${out.town.all.n} reads); its biggest step past the walk between reads ${r1(out.town.worstStepOverWalk)} px; the peer draws the walker off by mean ${r1(out.watch.mean)}, 95% ${r1(out.watch.p95)}`);
  if (out.hits) console.log(`      ${tag}: among the monsters: ${out.hits.total} blows in ${r1(out.landSecs)} s (${r1(out.hits.perS)} a second), ${out.hits.after} within ${AFTER_MS} ms after a change; `
    + `the copy from the phone at a blow mean ${r1(out.hits.atHit.mean)} px, 95% ${r1(out.hits.atHit.p95)} (after a change: mean ${r1(out.hits.atHitAfter.mean)}); `
    + `over the walk mean ${r1(out.land.mean)}, 95% ${r1(out.land.p95)}, after a change mean ${r1(out.land.afterMean)}, 95% ${r1(out.land.afterP95)}`);
  else console.log(`      ${tag}: no monster in the page's list to walk among`);
  const errs = A.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`${tag}: no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  let off, on;
  try {
    off = await oneRun(browser, wsPort, webPort, rec, false);
    on = await oneRun(browser, wsPort, webPort, rec, true);
  } finally {
    await H.liveFlag(wsPort, 'movepath', null).catch(() => {});
    await H.liveFlag(wsPort, 'pathall', null).catch(() => {});
  }
  rec.ok(`fewer moves on the wire: a straight walk ${r1(off.rate)} -> ${r1(on.rate)} a second, the zig-zag ${r1(off.zigRate)} -> ${r1(on.zigRate)}`,
    on.rate <= off.rate * 0.6 && on.zigRate < off.zigRate, { off: off.rate, on: on.rate, zoff: off.zigRate, zon: on.zigRate });
  rec.ok(`no worse in BroTown: the copy from the phone mean ${r1(off.town.all.mean)} -> ${r1(on.town.all.mean)} px, after a change ${r1(off.town.after.mean)} -> ${r1(on.town.after.mean)} (2 px of slack)`,
    on.town.all.mean <= off.town.all.mean + 2 && on.town.after.mean <= off.town.after.mean + 2, { off: off.town, on: on.town });
  rec.ok(`no worse for the watcher: the peer draws the walker off by mean ${r1(off.watch.mean)} -> ${r1(on.watch.mean)} px, 95% ${r1(off.watch.p95)} -> ${r1(on.watch.p95)} (2 / 4 px of slack)`,
    on.watch.mean <= off.watch.mean + 2 && on.watch.p95 <= off.watch.p95 + 4, { off: off.watch, on: on.watch });
  if (off.hits && on.hits) {
    rec.ok(`no worse among the monsters: the copy from the phone over the walk mean ${r1(off.land.mean)} -> ${r1(on.land.mean)} px, after a change ${r1(off.land.afterMean)} -> ${r1(on.land.afterMean)}; `
      + `at a blow ${r1(off.hits.atHit.mean)} -> ${r1(on.hits.atHit.mean)}; blows within ${AFTER_MS} ms after a change ${off.hits.after}/${off.hits.total} -> ${on.hits.after}/${on.hits.total}`,
      on.land.mean <= off.land.mean + 2 && on.land.afterMean <= off.land.afterMean + 2, { off: off.hits, on: on.hits, offLand: off.land, onLand: on.land });
  } else {
    rec.ok('among the monsters: skipped (no monster in the page\'s list near the arrival)', true, { off: !!off.hits, on: !!on.hits });
  }
}
