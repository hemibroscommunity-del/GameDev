/* ═══ v2.3.3276: A JOIN IS TOLD THE PLAYERS AROUND IT (server/src/nearjoin.js) ═══
 *
 * The owner, 2026-10-16: "Yes do suggested" -- the server split plan's Phase 0e.
 * The arriver is a real phone joining with `nj: 1` (src/game/nearJoin.js); the
 * stander, the walker and the elder are bare sockets speaking the game's
 * protocol, the elder without `nj` -- a phone from before this change.  The
 * stander and the walker are in the Wheel, and their looks went out (their
 * first track, whole) before the arriver joined, so it can only learn them
 * the new way.  In a room of their own (`nearjoin`):
 *   1. the worker advertises nearjoin; the arriver joined in town, so its
 *      snapshot has the stander and the walker as list entries (`fa`) -- and the
 *      elder's snapshot has them whole;
 *   2. ARRIVING in BroTown: the tick after the arrival brought the stander's
 *      look (`pl`), and they are drawn in it -- their hair and shirt, not the
 *      plain bro's -- the walker not;
 *   3. the walker, 2,700 px off, is a list entry on the arriver: their name and
 *      level (what the lists show), no look, parked out of sight;
 *   4. the walker WALKS IN to 500 px: their look came in a pl the moment they
 *      crossed into the 2,400 px circle, and not one frame drew them in a look
 *      that was not theirs (a sampler on every animation frame);
 *   5. the kill switch (`nearjoin: false` in the room's flags): a joining nj
 *      socket gets everyone whole and caps.nearjoin false;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs nearjoin
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const ROOM = 'nearjoin';
/* BroTown's arrival.  v2.3.3368: from the Wheel the worker plays
   (H.wheelGeom), never a short-Wheel number: since v2.3.3315 the room plays
   the long Wheel, and (21504, 21792) put the stander and the walker about
   92,700 px from the arriver, who came in at the long Wheel's arrival -- the
   stander was never near enough to be sent whole (the sweep of 2026-10-18). */
let ARRIVAL = null;
const NEAR_R = 2400;                       /* server/src/nearjoin.js NEAR_JOIN.R */
const STEP_MS = 33;

const flag = (wsPort, name, value) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags?room=${ROOM}` + (value === undefined ? '&name=' + name : ''), {
  method: value === undefined ? 'DELETE' : 'POST',
  headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: value === undefined ? undefined : JSON.stringify({ name, value }),
}).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

/* the looks: distinct hair, shirt and colours, as a phone's join and track carry them */
const LOOKS = {
  Stander: { hr: 'mohawk', hc: 'red', st: 'stripes', stc: 'blue', bt: '#ff22aa', bl: '#330011', sk: 'tan', rpgLv: 9,
    rpgData: { kills: 41, goldEarned: 900, playtime: 77, lifeTotal: 12, ap: 4, weapon: 'Copper Great Sword' } },
  Walker: { hr: 'long', hc: 'blonde', st: 'plain', stc: 'green', bt: '#22ffaa', bl: '#003311', sk: 'dark', rpgLv: 14,
    rpgData: { kills: 230, goldEarned: 5100, playtime: 410, lifeTotal: 30, ap: 9, weapon: 'Pine Bow' } },
  Elder: { hr: 'short', bt: '#8888ff', rpgLv: 3 },
};

/* a bare socket speaking the game's protocol (mp-presence2's), with a look */
function sock(wsPort, name, { nj = false, look = null } = {}) {
  const w = { x: 0, y: 0, ws: null, timer: null, synced: false, sync: null, z: 'town' };
  const id = 'nj' + name.toLowerCase() + Math.random().toString(36).slice(2, 10);
  w.id = id;
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    w.ws = ws;
    /* v2.3.3368: `ws` -- which Wheels this player draws; one that says nothing
       is out of step since v2.3.3315 (TRAPS §196) */
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, name, protocolVersion: 2, pres: 2, ws: [1, 5], ...(nj ? { nj: 1 } : {}), httpAuth: true,
      data: { ...(look || {}), rpgData: undefined, x: 1000, y: 1000, d: 'down', z: 'town', name } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; w.sync = JSON.parse(ev.data); resolve(); }
    };
    ws.onerror = () => reject(new Error(name + ' socket error'));
  });
  w.move = (x, y, z = 'wheel', vx = 0, vy = 0) => {
    w.x = x; w.y = y; w.z = z;
    w.ws.send(JSON.stringify({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: vx > 0 ? 'right' : vx < 0 ? 'left' : 'down',
      f: vx > 0 ? 'east' : vx < 0 ? 'west' : 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: Math.round(vx * 100), vy: Math.round(vy * 100), dodging: false, blocking: false, ba: null, dead: false }));
  };
  w.track = () => w.ws.send(JSON.stringify({ type: 'track', data: { ...(look || {}), x: w.x, y: w.y, dir: 'down', zone: w.z, name } }));
  /* to anywhere: through town and back (a zone change skips the speed bound) */
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  /* a straight walk to (x, y) at `pps` px a second */
  w.walkTo = (x, y, pps) => new Promise((resolve) => {
    const tick = () => {
      const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy), s = pps * STEP_MS / 1000;
      if (d <= s) { w.move(x, y, 'wheel', 0, 0); resolve(); return; }
      w.move(w.x + dx / d * s, w.y + dy / d * s, 'wheel', dx / d * pps / 60, dy / d * pps / 60);
      w.timer = setTimeout(tick, STEP_MS);
    };
    tick();
  });
  w.close = () => { clearTimeout(w.timer); try { w.ws.close(); } catch {} };
  return w;
}

/* On the arriver's page, before the game connects: what its snapshot held, and
   every tick's `pl` (who, when). */
function wire() {
  const Native = window.WebSocket;
  window.__njw = { sync: null, pl: [] };
  function Watched(url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string') return;
      if (d.startsWith('{"type":"state_sync"')) {
        try {
          const m = JSON.parse(d), pl = m.players || {};
          const ids = Object.keys(pl);
          window.__njw.sync = { n: ids.length, fa: ids.filter((k) => pl[k] && pl[k].fa === 1), whole: ids.filter((k) => pl[k] && !pl[k].fa), bytes: JSON.stringify(pl).length, entries: pl };
        } catch (e) { /* not ours */ }
      } else if (d.startsWith('{"type":"tick"') && d.indexOf('"pl":{') >= 0) {
        try { const m = JSON.parse(d); window.__njw.pl.push({ at: Date.now(), ids: Object.keys(m.pl || {}), withPlayers: Object.keys(m.players || {}) }); } catch (e) { /* not ours */ }
      }
    });
    return ws;
  }
  Watched.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Watched[k] = Native[k];
  window.WebSocket = Watched;
}

export async function run({ browser, wsPort, webPort, rec }) {
  ARRIVAL = (await H.wheelGeom()).arrival;
  await flag(wsPort, 'nearjoin', undefined);   /* a run before may have left the switch */

  /* ── the room before the arriver ── */
  const St = sock(wsPort, 'Stander', { look: LOOKS.Stander });
  const Wk = sock(wsPort, 'Walker', { look: LOOKS.Walker });
  await St.open(); await Wk.open();
  await St.place(ARRIVAL.x + 160, ARRIVAL.y + 30);
  await Wk.place(ARRIVAL.x + 2700, ARRIVAL.y);
  await new Promise((r) => setTimeout(r, 400));
  St.track(); Wk.track();   /* their first track: whole, to everyone -- before the arriver is here */
  await new Promise((r) => setTimeout(r, 400));
  /* keep them alive (the 2-minute idle logout counts any message) */
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 5000)); if (!alive) break; try { St.move(St.x, St.y); Wk.move(Wk.x, Wk.y); } catch {} } })();

  const A = await H.newPlayer(browser, { name: 'Arriver', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM, init: wire });
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
  await A.page.waitForTimeout(2500);
  const E = sock(wsPort, 'Elder', { look: LOOKS.Elder });
  await E.open();

  const copyOf = (id) => A.page.evaluate((pid) => {
    const S = window._gameState.current, o = (S.others || {})[pid];
    if (!o) return null;
    const dr = window.__btPeersDrawn ? window.__btPeersDrawn(pid) : null;
    return { name: o.name, rpgLv: o.rpgLv, hair: o.hair, shirt: o.shirt, bt: o.bt, skin: o.skin, away: !!o._away, lookFar: !!o._lookFar,
      kills: o.rpgData && o.rpgData.kills, gold: o.rpgData && o.rpgData.goldEarned, weapon: o.rpgData && o.rpgData.weapon,
      d: Math.hypot(o.x - S.player.x, o.y - S.player.y), drawn: !!(dr && dr.visible) };
  }, id);
  const until = async (fn, ms, gap = 150) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };

  /* ── 1. the snapshots ── */
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.nearjoin));
  const sync = await A.page.evaluate(() => { const s = window.__njw.sync; return s ? { n: s.n, fa: s.fa, whole: s.whole, bytes: s.bytes } : null; });
  rec.ok(`the worker advertises nearjoin, and the arriver (joined in town) had the stander and the walker as list entries (${sync && sync.fa.length} of ${sync && sync.n})`,
    inWheel && caps && !!sync && sync.fa.includes(St.id) && sync.fa.includes(Wk.id), { inWheel, caps, sync });
  const ew = E.sync && E.sync.players ? E.sync.players[Wk.id] : null;
  rec.ok('...while the elder (no nj) was sent the walker whole, their look and all', !!ew && !ew.fa && ew.hr === LOOKS.Walker.hr && ew.bt === LOOKS.Walker.bt, ew);

  /* ── 2. arriving: the stander's look ── */
  const plSt = await A.page.evaluate((id) => window.__njw.pl.filter((p) => p.ids.includes(id)).length, St.id);
  const cSt = await until(async () => { const c = await copyOf(St.id); return c && c.drawn ? c : null; }, 6000);
  rec.ok(`arriving in BroTown: the stander's look came in a pl (${plSt}), and they are drawn in it (${cSt ? cSt.hair + ', ' + cSt.shirt + ', ' + cSt.bt : '?'}), ${cSt ? Math.round(cSt.d) : '?'} px off`,
    plSt === 1 && !!cSt && cSt.hair === LOOKS.Stander.hr && cSt.shirt === LOOKS.Stander.st && cSt.bt === LOOKS.Stander.bt && !cSt.away && !cSt.lookFar && cSt.d < NEAR_R,
    { plSt, cSt: cSt || await copyOf(St.id) });

  /* ── 3. the walker, far: a list entry ── */
  const cW0 = await copyOf(Wk.id);
  const plW0 = await A.page.evaluate((id) => window.__njw.pl.filter((p) => p.ids.includes(id)).length, Wk.id);
  rec.ok(`the walker ${cW0 ? Math.round(Math.hypot(Wk.x - ARRIVAL.x, Wk.y - ARRIVAL.y)) : '?'} px off: a list entry -- name, level, kills and gold (what the lists show), no hair or shirt, parked out of sight`,
    !!cW0 && cW0.name === 'Walker' && cW0.rpgLv === LOOKS.Walker.rpgLv && cW0.kills === 230 && cW0.gold === 5100 && cW0.weapon === undefined
    && cW0.hair == null && cW0.away && cW0.lookFar && !cW0.drawn && plW0 === 0, { cW0, plW0 });

  /* ── 4. the walker walks in ── */
  await A.page.evaluate(({ id, hair, bt }) => {
    window.__njBad = { frames: 0, drawnFrames: 0, wrong: 0, firstWrong: null };
    const f = () => {
      const b = window.__njBad; if (!b) return;
      b.frames++;
      const S = window._gameState.current, o = (S.others || {})[id];
      const dr = window.__btPeersDrawn ? window.__btPeersDrawn(id) : null;
      if (o && dr && dr.visible && !o._away && Math.hypot(o.x - S.player.x, o.y - S.player.y) < 1600) {
        b.drawnFrames++;
        if (o.hair !== hair || o.bt !== bt) { b.wrong++; if (!b.firstWrong) b.firstWrong = { hair: o.hair, bt: o.bt, lookFar: !!o._lookFar }; }
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, { id: Wk.id, hair: LOOKS.Walker.hr, bt: LOOKS.Walker.bt });
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  const tIn = Date.now();
  await Wk.walkTo(me.x + 500, me.y, 420);
  await A.page.waitForTimeout(2500);
  const cW1 = await copyOf(Wk.id);
  const plW = await A.page.evaluate((id) => window.__njw.pl.filter((p) => p.ids.includes(id)), Wk.id);
  const bad = await A.page.evaluate(() => { const b = window.__njBad; window.__njBad = null; return b; });
  rec.ok(`the walker walks in: their look came in ONE pl, with their first whole entry, ${plW.length ? ((plW[0].at - tIn) / 1000).toFixed(1) : '?'} s into the walk`,
    plW.length === 1 && plW[0].withPlayers.includes(Wk.id), plW);
  rec.ok(`...drawn in their own look (${cW1 ? cW1.hair + ', ' + cW1.bt : '?'}), and in ${bad ? bad.drawnFrames : '?'} drawn frames of ${bad ? bad.frames : '?'} never in another`,
    !!cW1 && cW1.drawn && cW1.hair === LOOKS.Walker.hr && cW1.bt === LOOKS.Walker.bt && !cW1.lookFar && !!bad && bad.drawnFrames > 5 && bad.wrong === 0,
    { cW1, bad });

  /* ── 5. the kill switch ── */
  const set = await flag(wsPort, 'nearjoin', false);
  const X = sock(wsPort, 'Late', { nj: true });
  await X.open();
  const xs = X.sync || {};
  const xfa = Object.values(xs.players || {}).filter((e) => e && e.fa).length;
  rec.ok(`the kill switch (nearjoin: false): a joining nj socket gets everyone whole (${xfa} list entries) and caps.nearjoin false`,
    !!set && set.ok === true && xs.caps && xs.caps.nearjoin === false && xfa === 0, { set, nearjoin: xs.caps && xs.caps.nearjoin, xfa });
  await flag(wsPort, 'nearjoin', undefined);

  X.close(); E.close(); St.close(); Wk.close();
  alive = false;
  stopAlive = true;
  const errs = A.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
}
