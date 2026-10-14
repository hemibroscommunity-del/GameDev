/* ═══ v2.3.3250: FAR PLAYERS ONLY WHILE YOUR WORLD MAP IS OPEN (presence v2) ═══
 *
 * The owner, 2026-10-14: "Go recommended and keep working autonomously" --
 * the server split plan's Phase 0b, its second step (server/src/presence2.js,
 * src/game/presence2.js).  The watcher is a real phone in the Wheel's BroTown,
 * joining with `pres: 2`; the walker and the elder are bare sockets speaking
 * the game's protocol, the elder without `pres` -- a phone from before this
 * change.  In a room of their own (`presence2`):
 *   1. setup: the worker advertises presence2, the watcher's first tick
 *      carried the online list, the walker beside them is seen;
 *   2. THE GHOST: the walker is seen 2,000 px east, then goes far.  At the next
 *      roster the watcher's copy of them is PARKED -- PARK_R from the watcher,
 *      not frozen 2,000 px east -- and stays PARK_R ahead while the watcher
 *      walks 1,600 px toward where the walker was last seen (the copy left
 *      frozen would have stood 400 px in front of them);
 *   3. silent 12 s, the walker is kept: no ghost sweep while the online list
 *      is fresh;
 *   4. the world map opened: map_watch {on: true}, the walker's copy where they
 *      really are within a roster, their walk reaching the watcher, a dot on
 *      the map, and the open map repeating map_watch every 4 s;
 *   5. the map shut: map_watch {on: false}, the walker's walk no longer reaching
 *      the watcher and their copy parked again -- while the elder, far from the
 *      walker, is still sent them (an old phone keeps the old roster);
 *   6. a player gone without a word (an entry put in by hand) is forgotten at
 *      the next online list; the silent walker is kept;
 *   7. the kill switch (`presence2: false` in this room's live flags): the
 *      watcher, map shut, is sent the far walker again;
 *   8. the walker leaves: the watcher forgets them;
 *   9. no page errors.
 *
 *   node tools/qa/mp/run.mjs presence2
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const ROOM = 'presence2';
const PARK_R = 2400;   /* src/game/presence2.js PRESENCE2_CLIENT.PARK_R */
const STEP_MS = 33;    /* wsClient.js MOVE_GAP_SEEN_MS */
const SPEED = 165;     /* px a second */

/* this room's live flags (liveops.js); `value` undefined clears the flag */
const flag = (wsPort, value) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags?room=${ROOM}` + (value === undefined ? '&name=presence2' : ''), {
  method: value === undefined ? 'DELETE' : 'POST',
  headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: value === undefined ? undefined : JSON.stringify({ name: 'presence2', value }),
}).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

/* a bare socket speaking the game's protocol (mp-farpeer's walker), counting
   the ticks that carry `watchId` */
function sock(wsPort, name) {
  const w = { x: 0, y: 0, sent: 0, ws: null, timer: null, synced: false, z: 'town', watchId: null, seen: 0 };
  const id = 'p2' + name.toLowerCase() + Math.random().toString(36).slice(2, 10);
  w.id = id;
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, name, protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (w.watchId && ev.data.startsWith('{"type":"tick"') && ev.data.indexOf('"' + w.watchId + '":{') >= 0) w.seen++;
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error(name + ' socket error'));
  });
  w.move = (x, y, z = 'wheel', vx = 0, vy = 0) => {
    w.x = x; w.y = y; w.z = z;
    w.ws.send(JSON.stringify({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: vx > 0 ? 'right' : vx < 0 ? 'left' : 'down',
      f: vx > 0 ? 'east' : vx < 0 ? 'west' : 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: Math.round(vx * SPEED / 60 * 100), vy: Math.round(vy * SPEED / 60 * 100),
      dodging: false, blocking: false, ba: null, dead: false }));
    w.sent++;
  };
  /* to anywhere: through town and back (a zone change skips the speed bound) */
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  w.walk = (ms) => new Promise((resolve) => {
    const x0 = w.x, t0 = Date.now();
    const tick = () => {
      const t = Date.now() - t0;
      if (t >= ms) { w.move(w.x, w.y, 'wheel', 0, 0); resolve(); return; }
      const dir = Math.floor(t / 1500) % 2 ? -1 : 1;
      w.move(Math.max(x0 - 400, Math.min(x0 + 400, w.x + dir * SPEED * STEP_MS / 1000)), w.y, 'wheel', dir, 0);
      w.timer = setTimeout(tick, STEP_MS);
    };
    tick();
  });
  w.close = () => { clearTimeout(w.timer); try { w.ws.close(); } catch {} };
  return w;
}

/* On the watcher's page, before the game connects: count the ticks that carry
   the walker, the rosters marked `nr`, the online lists, and every map_watch
   the page sends. */
function wire() {
  const Native = window.WebSocket;
  window.__p2w = { id: null, n: 0, ticks: 0, nr: 0, on: 0, sent: [] };
  function Watched(url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const c = window.__p2w, d = ev.data;
      if (typeof d !== 'string' || !d.startsWith('{"type":"tick"')) return;
      c.ticks++;
      if (c.id && d.indexOf('"' + c.id + '":{') >= 0) c.n++;
      if (d.indexOf(',"nr":1') >= 0) c.nr++;
      if (d.indexOf(',"on":{') >= 0) c.on++;
    });
    const send = ws.send.bind(ws);
    ws.send = (data) => {
      try {
        if (typeof data === 'string' && data.indexOf('map_watch') >= 0) {
          const m = JSON.parse(data);
          const on = m.on !== undefined ? m.on : (m.payload && m.payload.on);
          window.__p2w.sent.push({ at: Date.now(), on });
        }
      } catch (e) { /* not ours */ }
      return send(data);
    };
    return ws;
  }
  Watched.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Watched[k] = Native[k];
  window.WebSocket = Watched;
}

export async function run({ browser, wsPort, webPort, rec }) {
  await flag(wsPort, undefined);   /* a run before may have left the switch */
  const W = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM, init: wire });
  await H.enterWorld(W);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(W, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await W.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await W.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await W.page.waitForTimeout(500).catch(() => {});
    }
  })();
  await W.page.waitForTimeout(2000);
  const w0 = await H.readState(W, (S) => ({ x: S.player.x, y: S.player.y }));
  const copyOf = (id) => W.page.evaluate((pid) => {
    const S = window._gameState.current, o = (S.others || {})[pid];
    if (!o) return null;
    return { x: o.x, y: o.y, rx: o.renderX, ry: o.renderY, away: !!o._away, last: o._lastUpdate || 0, zone: o.zone,
      d: Math.hypot(o.x - S.player.x, o.y - S.player.y), now: Date.now() };
  }, id);
  const until = async (fn, ms, gap = 150) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await W.page.waitForTimeout(gap); }
  };

  /* ── 1. setup ── */
  const K = sock(wsPort, 'Walker');
  await K.open();
  await K.place(w0.x + 150, w0.y);
  const E = sock(wsPort, 'Elder');
  await E.open();
  await E.place(w0.x - 300, w0.y + 4000);
  E.watchId = K.id;
  await W.page.waitForTimeout(1500);
  await W.page.evaluate((id) => { window.__p2w.id = id; }, K.id);
  const s1 = await H.readState(W, (S) => ({ caps: !!(S._serverCaps && S._serverCaps.presence2), onAt: S._onlineAt || 0 }));
  const c0 = await copyOf(K.id);
  rec.ok('setup: the worker advertises presence2, the watcher\'s first tick carried the online list, the walker beside them is seen',
    inWheel && s1.caps && s1.onAt > 0 && !!c0 && !c0.away, { inWheel, s1, c0 });

  /* ── 2. the ghost ── */
  await K.place(w0.x + 2000, w0.y);
  const c1 = await until(async () => { const c = await copyOf(K.id); return c && !c.away && Math.abs(c.x - (w0.x + 2000)) < 3 ? c : null; }, 4000);
  rec.ok('the walker seen 2,000 px east: the watcher\'s copy is there, not parked', !!c1, c1 || await copyOf(K.id));
  await K.place(w0.x + 8000, w0.y);
  const c2 = await until(async () => { const c = await copyOf(K.id); return c && c.away ? c : null; }, 5000);
  rec.ok(`...gone far: at the next roster their copy is PARKED ${c2 ? Math.round(c2.d) : '?'} px east (PARK_R), not left frozen 2,000 px east`,
    !!c2 && Math.abs(c2.d - PARK_R) < 2 && c2.x > w0.x && Math.abs(c2.rx - c2.x) < 1, c2 || await copyOf(K.id));
  /* the watcher walks east toward that spot, a stride at a time, and each
     stride the copy is measured after the game's own frame -- every frame
     parks it again (visualSystems.js), as a real walk's few px a frame */
  const strides = [];
  for (let i = 0; i < 16; i++) {
    strides.push(await W.page.evaluate(async ({ id, step }) => {
      const S = window._gameState.current, P = S.player;
      P.x += step;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const o = (S.others || {})[id];
      if (!o) return null;
      return { d: Math.hypot(o.x - P.x, o.y - P.y), drawn: Math.hypot((o.renderX != null ? o.renderX : o.x) - P.x, (o.renderY != null ? o.renderY : o.y) - P.y), away: !!o._away };
    }, { id: K.id, step: 100 }));
    await W.page.waitForTimeout(180);
  }
  const wEnd = await H.readState(W, (S) => ({ x: S.player.x, y: S.player.y }));
  const closest = strides.reduce((m, t) => Math.min(m, t ? Math.min(t.d, t.drawn) : -1), Infinity);
  rec.ok(`walking 1,600 px toward where the walker was last seen: after every frame their copy was PARK_R away, parked (closest ${Math.round(closest)} px); frozen, it would have stood ${Math.round(w0.x + 2000 - wEnd.x)} px ahead`,
    strides.length === 16 && strides.every((t) => t && t.away) && closest >= PARK_R - 1 && wEnd.x >= w0.x + 1590, { strides: strides.slice(-3), closest, wEnd });

  /* ── 3. silence is not leaving ── */
  const t3 = Date.now();
  await W.page.waitForTimeout(12000);
  const c3 = await copyOf(K.id);
  rec.ok(`silent ${Math.round((Date.now() - (c3 ? c3.last : t3)) / 1000)} s (the old ghost sweep's limit is 10 s), the walker is kept: the online list is fresh`,
    !!c3 && c3.away && Date.now() - c3.last > 10000, c3);

  /* ── 4. the map opened ── */
  await W.page.evaluate(() => window.__btWorldMapOpen(true));
  const tOpen = Date.now();
  const c4 = await until(async () => { const c = await copyOf(K.id); return c && !c.away && Math.abs(c.x - K.x) <= 2 ? c : null; }, 5000);
  const sent4 = await W.page.evaluate(() => window.__p2w.sent.slice());
  rec.ok(`the map opened: map_watch {on: true} sent, and within a roster the walker's copy is where they really are (${c4 ? Math.round(c4.d) : '?'} px away)`,
    sent4.some((m) => m.on === true && m.at >= tOpen - 50) && !!c4, { sent4, c4: c4 || await copyOf(K.id), k: [K.x, K.y] });
  await W.page.evaluate(() => { window.__p2w.n = 0; });
  await K.walk(3000);
  await W.page.waitForTimeout(1200);
  const n4 = await W.page.evaluate(() => window.__p2w.n);
  const c4b = await copyOf(K.id);
  rec.ok(`...their walk reaches the watcher while the map is open (${n4} ticks in 3 s), the copy ending where they stopped`,
    n4 >= 2 && !!c4b && !c4b.away && Math.abs(c4b.x - K.x) <= 2, { n4, c4b, k: K.x });
  await W.page.evaluate(() => { const b = document.querySelector('[data-world-map-zoom-in]'); if (b) b.click(); });
  await W.page.waitForTimeout(600);
  const wm = await W.page.evaluate(() => { const m = window.__btWorldMap || {}; return { open: m.open, zoom: m.zoom, others: m.more ? m.more.others : null }; });
  rec.ok(`...and the world map draws them (zoom ${wm.zoom && wm.zoom.toFixed(2)}: ${wm.others} bro)`, wm.open && wm.others >= 1, wm);
  await W.page.waitForTimeout(Math.max(0, tOpen + 9000 - Date.now()));
  const beats = await W.page.evaluate((t) => window.__p2w.sent.filter((m) => m.on === true && m.at >= t - 50).length, tOpen);
  rec.ok(`...and the open map repeats map_watch every 4 s (${beats} in 9 s)`, beats >= 3, beats);

  /* ── 5. the map shut ── */
  const tShut = Date.now();
  await W.page.evaluate(() => window.__btWorldMapOpen(false));
  await W.page.waitForTimeout(2200);   /* the ticks in flight, then a roster */
  const c5a = await copyOf(K.id);
  await W.page.evaluate(() => { window.__p2w.n = 0; });
  E.seen = 0;
  await K.walk(3000);
  await W.page.waitForTimeout(800);
  const n5 = await W.page.evaluate(() => window.__p2w.n);
  const sent5 = await W.page.evaluate((t) => window.__p2w.sent.filter((m) => m.at >= t - 50), tShut);
  rec.ok(`the map shut: map_watch {on: false} sent, the walker's copy parked again, and their walk no longer reaches the watcher (${n5} ticks in 3 s)`,
    sent5.some((m) => m.on === false) && !!c5a && c5a.away && n5 === 0, { sent5, c5a, n5 });
  rec.ok(`...while an old phone (no pres) far from the walker is still sent them (${E.seen} ticks)`, E.seen > 0, E.seen);

  /* ── 6. gone without a word ── */
  const onAt6 = await H.readState(W, (S) => S._onlineAt || 0);
  await W.page.evaluate((x) => {
    const S = window._gameState.current;
    S.others.p2qaghost = { x: x.x + 100, y: x.y, renderX: x.x + 100, renderY: x.y, zone: 'wheel', name: 'Ghost', _lastUpdate: Date.now() };
  }, w0);
  const swept = await until(async () => (await H.readState(W, (S) => (S._onlineAt || 0))) > onAt6, 36000, 500);
  const s6 = await W.page.evaluate((id) => { const S = window._gameState.current; return { ghost: Object.prototype.hasOwnProperty.call(S.others, 'p2qaghost'), walker: !!S.others[id] }; }, K.id);
  rec.ok('a player gone without a word is forgotten at the next online list, and the silent walker is kept',
    !!swept && !s6.ghost && s6.walker, { swept, s6 });

  /* ── 7. the kill switch ── */
  const set = await flag(wsPort, false);
  await W.page.waitForTimeout(1500);
  await W.page.evaluate(() => { window.__p2w.n = 0; });
  await K.walk(3000);
  await W.page.waitForTimeout(1500);
  const n7 = await W.page.evaluate(() => window.__p2w.n);
  rec.ok(`the kill switch (presence2: false): the watcher, map shut, is sent the far walker again (${n7} ticks)`, !!set && set.ok === true && n7 > 0, { set, n7 });
  await flag(wsPort, undefined);

  /* ── 8. the walker leaves ── */
  K.close();
  const left = await until(async () => !(await W.page.evaluate((id) => !!window._gameState.current.others[id], K.id)), 6000, 250);
  rec.ok('the walker leaves: the watcher forgets them', !!left);

  E.close();
  stopAlive = true;
  const errs = W.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await W.ctx.close().catch(() => {});
}
