/* ═══ v2.3.3197: A FAR PLAYER LESS OFTEN, A NEAR ONE ON EVERY MOVE ═══
 *
 * Owner, 2026-10-13: "Send far away players less often and using shorter
 * position numbers make sense go ahead with it" (server/src/tick.js
 * FAR_PLAYERS: past NEAR_R, 2,400 px, a player's moves reach you at most every
 * EVERY_MS, 250 ms, each time where they are now; positions in whole pixels).
 *
 * The watcher is a real phone (the game, in the Wheel's BroTown).  The walker
 * is a bare socket sending a phone's moves 30 times a second (the game's own
 * cadence on a phone; this box draws a browser too few frames a second to
 * send them from a page).  It
 *   1. walks beside the watcher: the watcher's copy of them is updated on
 *      nearly every move (v2.3.3203: on a straight walk about every 66 ms,
 *      steady movers -- 12 a second at least);
 *   2. is carried out past NEAR_R and walks there: the watcher's copy is
 *      updated about four times a second, never drops out of the watcher's
 *      players, and ends where the walker stopped (v2.3.3223: about once a
 *      second, with the presence roster -- no far send of its own any more,
 *      FAR_PLAYERS.EVERY_MS 0; `BT_FARPEER_FAR_MS=250` runs it against a
 *      server whose live flags carry `far_ms: 250`, the old four);
 *   3. comes back and walks beside the watcher again: every move again;
 *   4. positions reach the watcher in whole pixels;
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs farpeer
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const NEAR_R = 2400;   /* server/src/tick.js FAR_PLAYERS.NEAR_R */
const ROOM = 'farpeer';
const STEP_MS = 33;    /* wsClient.js MOVE_GAP_SEEN_MS */
const SPEED = 165;     /* px a second */
/* v2.3.3223: the far send's own interval on the server under test (its live
   flag `far_ms`); 0, the default, is "with the presence roster only" */
const FAR_MS = Number(process.env.BT_FARPEER_FAR_MS || 0);

/* the walker: a bare socket speaking the game's protocol (tools/qa/load/bots.mjs) */
function walker(wsPort) {
  const w = { x: 0, y: 0, sent: 0, ws: null, timer: null, synced: false, z: 'town' };
  const id = 'fpwalk' + Math.random().toString(36).slice(2, 10);
  w.id = id;
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, name: 'Walker', protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Walker' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error('walker socket error'));
  });
  /* a phone's move (BroTown.jsx's broadcast through the shim) */
  w.move = (x, y, z = 'wheel', vx = 0, vy = 0) => {
    w.x = x; w.y = y; w.z = z;
    w.ws.send(JSON.stringify({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: vx > 0 ? 'right' : vx < 0 ? 'left' : 'down',
      f: vx > 0 ? 'east' : vx < 0 ? 'west' : 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: Math.round(vx * SPEED / 60 * 100), vy: Math.round(vy * SPEED / 60 * 100),
      dodging: false, blocking: false, ba: null, dead: false }));
    w.sent++;
  };
  /* to anywhere: through town and back, a zone change skipping the speed bound (movement.js) */
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  /* walk east and west for `ms`, a phone's 30 moves a second */
  w.walk = (ms) => new Promise((resolve) => {
    const x0 = w.x, t0 = Date.now();
    w.sent = 0;
    const tick = () => {
      const t = Date.now() - t0;
      if (t >= ms) { w.move(w.x, w.y, 'wheel', 0, 0); resolve(w.sent / (ms / 1000)); return; }
      const dir = Math.floor(t / 1500) % 2 ? -1 : 1;      /* 1.5 s east, 1.5 s back */
      w.move(Math.max(x0 - 400, Math.min(x0 + 400, w.x + dir * SPEED * STEP_MS / 1000)), w.y, 'wheel', dir, 0);
      w.timer = setTimeout(tick, STEP_MS);
    };
    tick();
  });
  w.close = () => { clearTimeout(w.timer); try { w.ws.close(); } catch {} };
  return w;
}

/* On the watcher's page, before the game connects: count every tick that
   carries the walker, as it arrives.  Read off the game's own copy of the
   walker instead, a page this box draws a few frames a second takes several
   ticks in one go between frames and the count is the page's, not the wire's. */
function countTicks() {
  const Native = window.WebSocket;
  window.__farCount = { id: null, n: 0 };
  function Counted(url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const c = window.__farCount, d = ev.data;
      if (c.id && typeof d === 'string' && d.startsWith('{"type":"tick"') && d.indexOf('"' + c.id + '":') >= 0) c.n++;
    });
    return ws;
  }
  Counted.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Counted[k] = Native[k];
  window.WebSocket = Counted;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* v2.3.3223: BT_FARPEER_FAR_MS -- the room's own far send back, through its
     live flags (POST /api/admin/flags, liveops.js), before anyone joins */
  if (FAR_MS > 0) {
    const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/flags?room=${ROOM}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'far_ms', value: FAR_MS }),
    }).catch((e) => ({ ok: false, status: String(e) }));
    rec.ok(`far_ms ${FAR_MS} in the room's live flags`, !!res.ok, res.status);
  }
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM, init: countTicks });
  await H.enterWorld(B);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(B, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await B.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await B.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await B.page.waitForTimeout(500).catch(() => {});
    }
  })();
  await B.page.waitForTimeout(2000);
  const b0 = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));

  const W = walker(wsPort);
  await W.open();
  await W.place(b0.x + 150, b0.y);
  await B.page.waitForTimeout(1500);
  const seen = await B.page.evaluate((id) => !!(window._gameState.current.others || {})[id], W.id);
  rec.ok('setup: the watcher in the Wheel\'s BroTown, the walker beside them and seen', inWheel && seen, { inWheel, seen, b0 });

  /* the watcher counts the ticks that carry the walker (countTicks), and
     checks the game still has them (present / missing) */
  await B.page.evaluate((id) => {
    window.__farCount.id = id;
    window.__farS = { id, present: 0, missing: 0 };
    setInterval(() => {
      const f = window.__farS;
      if ((window._gameState.current.others || {})[f.id]) f.present++; else f.missing++;
    }, 50);
  }, W.id);
  const watch = async (ms) => {
    await B.page.evaluate(() => { window.__farCount.n = 0; window.__farS.present = 0; window.__farS.missing = 0; });
    const sentPerSec = await W.walk(ms);
    const s = await B.page.evaluate(() => ({ n: window.__farCount.n, present: window.__farS.present, missing: window.__farS.missing }));
    s.perSec = Math.round(s.n / (ms / 1000) * 10) / 10;
    s.sentPerSec = Math.round(sentPerSec * 10) / 10;
    return s;
  };
  const peerOnB = () => B.page.evaluate((id) => {
    const S = window._gameState.current, o = (S.others || {})[id];
    return o ? { x: o.x, y: o.y, z: o.zone || o.z } : null;
  }, W.id);

  /* ── 1. near ── */
  const near = await watch(3000);
  await B.page.waitForTimeout(400);
  const p1 = await peerOnB();
  const d1 = Math.hypot(W.x - b0.x, W.y - b0.y);
  /* v2.3.3203: a straight walk is held to an update every ~66 ms (steady
     movers, server/src/steadymovers.js) -- about 15 a second, the turns at
     once -- where every move went out before */
  rec.ok(`near (${Math.round(d1)} px): the watcher's copy was updated ${near.perSec} times a second for the walker's ${near.sentPerSec} moves`,
    near.perSec >= 12, { near, d1 });
  rec.ok(`positions reach the watcher in whole pixels (${p1 && p1.x}, ${p1 && p1.y})`, !!p1 && Number.isInteger(p1.x) && Number.isInteger(p1.y), p1);

  /* ── 2. far ── */
  await W.place(b0.x + 300, b0.y - 2700);
  await B.page.waitForTimeout(1500);
  const far = await watch(3000);
  await B.page.waitForTimeout(1600);   /* the next roster (about a second), and its trip */
  const p2 = await peerOnB();
  const d2 = Math.hypot(W.x - b0.x, W.y - b0.y);
  const gap = p2 ? Math.hypot(p2.x - W.x, p2.y - W.y) : Infinity;
  /* v2.3.3223: with the presence roster only, about once a second (every 45
     ticks); a far send of its own (`far_ms`) was four a second */
  const [lo, hi] = FAR_MS > 0 ? [Math.min(3, 1000 / FAR_MS - 1), 1000 / FAR_MS + 2] : [0.5, 1.5];
  rec.ok(`far (${Math.round(d2)} px): the watcher's copy was updated ${far.perSec} times a second for the walker's ${far.sentPerSec} moves (${FAR_MS > 0 ? 'far_ms ' + FAR_MS : 'with the roster'})`,
    d2 > NEAR_R && far.perSec >= lo && far.perSec <= hi && far.sentPerSec >= 25, { far, d2, lo, hi });
  rec.ok(`far: the walker never dropped out of the watcher's players (${far.missing} of ${far.present + far.missing} samples missing)`,
    far.missing === 0 && far.present > 0, far);
  rec.ok(`far: once they stop, the watcher's copy is where they stopped (${gap.toFixed(1)} px off, in the Wheel)`,
    gap <= 1 && !!p2 && p2.z === 'wheel', { gap, p2, w: [W.x, W.y] });

  /* ── 3. near again ── */
  await W.place(b0.x - 200, b0.y + 120);
  await B.page.waitForTimeout(1500);
  const near2 = await watch(3000);
  const d3 = Math.hypot(W.x - b0.x, W.y - b0.y);
  rec.ok(`back near (${Math.round(d3)} px): updated ${near2.perSec} times a second again`, near2.perSec >= 12, { near2, d3 });

  W.close();
  stopAlive = true;
  const errs = B.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await B.ctx.close().catch(() => {});
}
