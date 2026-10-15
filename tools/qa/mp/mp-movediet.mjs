/* ═══ v2.3.3204: A STEADY WALK ON THE SAFE GROUND, HALF AS OFTEN ═══
 *
 * The phone keeps a steady walk's moves back on the Wheel's safe ground until
 * 66 ms after the last one sent (src/game/moveDiet.js, wsClient.js
 * moveDietOn / flushInputBuffer).  The mover is a real page in BroTown, a
 * bare socket stands beside them so the zone has a peer (alone, a phone sends
 * every 66 ms anyway, wsClient.js MOVE_GAP_SOLO_MS).
 *
 * The page's own frames are too few on this box to walk at a phone's pace --
 * drawing in software takes the page's whole thread, and its timers with it --
 * so during a walk the game draws one frame a second (its
 * requestAnimationFrame slowed), and the walk is the game's own move broadcast
 * (S.channel.send, the shim BroTown calls every frame) written every 16 ms
 * from a page timer, its place by the time that really passed; the game's own
 * moves are kept off the wire meanwhile.  What is under test is the shim's
 * batch (wsClient.js flushInputBuffer), which runs on its own 33 ms timer.
 * Every move that reaches the WIRE is counted (the socket's send).
 *   1. a straight walk in BroTown: at most 15 moves a second (one every 66
 *      ms), the diet on and keeping moves back;
 *   2. a walk that turns all the time (a circle, 6 degrees a frame): nothing
 *      kept back, every batch -- 30 a second on a phone, what this box's
 *      timers manage here -- and the straight walk clearly fewer;
 *   3. the peer's copy of the mover is updated about as often as they sent;
 *   4. an attack held, or a lock: the diet steps aside;
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs movediet
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const ROOM = 'movediet';
const SPEED = 165;     /* px a second, a phone's walk */

/* the peer: a bare socket that stands in BroTown and counts the ticks that
   carry the mover */
function peer(wsPort) {
  const p = { ws: null, synced: false, watch: null, n: 0 };
  p.id = 'mdpeer' + Math.random().toString(36).slice(2, 10);
  p.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    p.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: p.id, name: 'Peer', protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Peer' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!p.synced && ev.data.startsWith('{"type":"state_sync"')) { p.synced = true; resolve(); }
      if (p.watch && ev.data.startsWith('{"type":"tick"') && ev.data.indexOf('"' + p.watch + '":') >= 0) p.n++;
    };
    ws.onerror = () => reject(new Error('peer socket error'));
  });
  const mv = (x, y, z) => p.ws.send(JSON.stringify({ type: 'move', x, y, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
    vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false }));
  p.place = async (x, y) => { mv(1000, 1000, 'town'); await new Promise((r) => setTimeout(r, 300)); mv(x, y, 'wheel'); };
  /* a standing phone's keepalive, so the room keeps them */
  p.keep = setInterval(() => { try { if (p.ws && p.ws.readyState === 1 && p.x) mv(p.x, p.y, 'wheel'); } catch {} }, 1000);
  p.close = () => { clearInterval(p.keep); try { p.ws.close(); } catch {} };
  return p;
}

/* On the mover's page, before the game connects: every move that goes out on
   the wire, and when */
function countMoves() {
  window.__mvWire = [];
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    /* v2.3.3254: a frame may be a bundle (a JSON array of messages) */
    if (typeof d === 'string' && d.indexOf('"type":"move"') >= 0 && window.__mvWire.length < 5000) {
      try {
        const v = JSON.parse(d);
        for (const m of Array.isArray(v) ? v : [v]) if (m && m.type === 'move') window.__mvWire.push(performance.now());
      } catch (e) { /* not ours */ }
    }
    return send.call(this, d);
  };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Mover', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM, init: countMoves });
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  await A.page.waitForTimeout(2000);
  const a0 = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, caps: !!(S._serverCaps && S._serverCaps.movediet) }));
  const P = peer(wsPort);
  await P.open();
  P.x = a0.x - 150; P.y = a0.y;
  await P.place(P.x, P.y);
  await A.page.waitForTimeout(2000);
  const seen = await A.page.evaluate((id) => !!(window._gameState.current.others || {})[id], P.id);
  rec.ok('setup: the mover in the Wheel\'s BroTown with a peer beside them, the room advertising caps.movediet',
    inWheel && seen && a0.caps && typeof a0.id === 'string', { inWheel, seen, a0 });

  /* the walk: the game's own move broadcast every 16 ms, the place by the
     time that really passed; the game's own moves held off the wire */
  const walk = (ms, turnDegPerS) => A.page.evaluate(({ ms, turnDegPerS, speed }) => new Promise((resolve) => {
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
    /* the game's frames slowed to one a second, so the page's timers run */
    if (!window.__qaRaf) window.__qaRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 1000);
    let fires = 0;
    const t0 = performance.now();
    let x = S.player.x, y = S.player.y, last = t0, ang = 0;
    const wire0 = window.__mvWire.length;
    const d0 = window.__btMoveDiet ? window.__btMoveDiet() : null;
    let onSeen = 0, samples = 0;
    const timer = setInterval(() => {
      fires++;
      const now = performance.now();
      const dt = now - last; last = now;
      ang += turnDegPerS * Math.PI / 180 * dt / 1000;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      x += ux * speed * dt / 1000; y += uy * speed * dt / 1000;
      const done = now - t0 >= ms;
      const vx = done ? 0 : Math.round(ux * speed / 60 * 100), vy = done ? 0 : Math.round(uy * speed / 60 * 100);
      ch.send({ type: 'broadcast', event: 'move', payload: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'right', f: 'east', z: 'wheel', vx, vy, __qa: 1 } });
      if (window.__btMoveDiet) { samples++; if (window.__btMoveDiet().on) onSeen++; }
      if (done) {
        clearInterval(timer);
        setTimeout(() => {
          window.__qaOwnMoves = false;
          window.requestAnimationFrame = window.__qaRaf;
          const d1 = window.__btMoveDiet ? window.__btMoveDiet() : null;
          resolve({ wire: window.__mvWire.length - wire0, secs: ms / 1000, onShare: samples ? onSeen / samples : 0,
            waited: d0 && d1 ? d1.waited - d0.waited : null, fires, end: [x, y] });
        }, 150);
      }
    }, 16);
  }), { ms, turnDegPerS, speed: SPEED });

  /* ── 1. a straight walk ── */
  P.watch = a0.id; P.n = 0;
  const st = await walk(3000, 0);
  const stRate = st.wire / st.secs, peerRate = P.n / st.secs;
  rec.ok(`a straight walk in BroTown: ${stRate.toFixed(1)} moves a second on the wire (at most 15: one every 66 ms), the diet on ${Math.round(st.onShare * 100)}% of the walk, ${st.waited} kept back`,
    stRate >= 6 && stRate <= 16 && st.onShare >= 0.9 && st.waited > 0, st);
  rec.ok(`the peer's copy of the mover was updated ${peerRate.toFixed(1)} times a second`, peerRate >= 11, { n: P.n, peerRate });
  await A.page.waitForTimeout(1500);

  /* ── 2. a walk that turns all the time ── */
  const ci = await walk(3000, 360);
  const ciRate = ci.wire / ci.secs;
  /* this box's page runs its timers slower than a phone (the walk's own
     16 ms timer fired ci.fires times in 3 s), so the batch's rate is the
     box's: what matters is that NOTHING was kept back, and that the straight
     walk sent clearly fewer than the box's batch could */
  rec.ok(`a walk turning 360 degrees a second: ${ciRate.toFixed(1)} moves a second, none kept back (a change never waits); the straight walk sent ${Math.round(stRate / ciRate * 100)}% of that`,
    ci.waited === 0 && ciRate >= 12 && stRate <= ciRate * 0.75, { ci, stRate });
  await A.page.waitForTimeout(1500);

  /* ── 3. a fight steps the diet aside ── */
  const fight = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const before = window.__btMoveDiet().on;
    const was = S.autoAttack;
    S.autoAttack = true;
    const attacking = window.__btMoveDiet().on;
    S.autoAttack = was;
    const wasLock = S.lockedTarget;
    S.lockedTarget = { type: 'monster', id: 'qa', ref: null, src: 'qa' };
    const locked = window.__btMoveDiet().on;
    S.lockedTarget = wasLock;
    return { before, attacking, locked, after: window.__btMoveDiet().on };
  });
  rec.ok('an attack held or a lock steps the diet aside', fight.before === true && fight.attacking === false && fight.locked === false && fight.after === true, fight);

  P.close();
  stopAlive = true;
  const errs = A.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
}
