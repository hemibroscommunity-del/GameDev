/* ═══ v2.3.3277: YOUR PARTY ON THE MINIMAP AND THE WORLD MAP (src/game/partyMarks.js) ═══
 *
 * The owner, 2026-10-16: "Yes do suggested" -- the backlog's party follow-up
 * (ARCHITECTURE-HANDOFF item D).  The leader is a real phone in the Wheel's
 * BroTown; the friend is a bare socket speaking the game's protocol.  In a room
 * of their own (`partymap`):
 *   1. a party: the phone invites, the friend accepts; the phone's party is open
 *      with the friend in it;
 *   2. the friend beside you: the minimap draws them as your party's mark, in
 *      the box, not on its edge;
 *   3. the friend 3,000 px east, off the box: their mark rides the box's east
 *      edge, level with them;
 *   4. the world map at its first zoom (the bros are drawn only from 1.5): the
 *      friend drawn as party and named, and the key says "party";
 *   5. the friend leaves the party: no party mark on either map;
 *   6. the dungeons' and the farm's box (minimapRenderer.js, played in today's
 *      town here: a second phone, in a room of its own): a party member in the
 *      party's blue, no green dot for them; out of the party, a green dot again;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs partymap
 */
import { join } from 'node:path';
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const ROOM = 'partymap', ROOM2 = 'partymap2';
const PARTY_BLUE = 0x5d93d2, C_OTHER = 0x58b97b;
const STEP_MS = 33;

function sock(wsPort, name, room = ROOM) {
  const w = { x: 0, y: 0, ws: null, timer: null, synced: false, z: 'town', got: [] };
  const id = 'pm' + name.toLowerCase() + Math.random().toString(36).slice(2, 10);
  w.id = id;
  w.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${room}&rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, name, protocolVersion: 2, pres: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name, hr: 'long', bt: '#22aaff' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (ev.data.indexOf('"party_') >= 0) { try { w.got.push(JSON.parse(ev.data)); } catch {} }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error(name + ' socket error'));
  });
  w.send = (m) => w.ws.send(JSON.stringify(m));
  w.move = (x, y, z = 'wheel', vx = 0, vy = 0) => {
    w.x = x; w.y = y; w.z = z;
    w.send({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: Math.round(vx * 100), vy: Math.round(vy * 100), dodging: false, blocking: false, ba: null, dead: false });
  };
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  w.close = () => { clearTimeout(w.timer); try { w.ws.close(); } catch {} };
  return w;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `partymap-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Leader', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM });
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
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId }));
  const F = sock(wsPort, 'Friend');
  await F.open();
  await F.place(me.x + 150, me.y + 20);
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 5000)); if (!alive) break; try { F.move(F.x, F.y); } catch {} } })();
  const until = async (fn, ms, gap = 150) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };
  const mini = () => A.page.evaluate(() => { const m = window.__btMinimap || {}; return { party: m.party || null, box: m.box, mapBottom: m.mapBottom, frame: m.frame, px: m.playerBoxX, py: m.playerBoxY }; });

  /* ── 1. a party ── */
  await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, F.id);
  await until(async () => F.got.some((m) => m.type === 'party_invited' || (m.payload && m.payload.from)), 5000);
  F.send({ type: 'party_accept', target: me.id });
  const party = await until(() => A.page.evaluate((id) => { const p = window._gameState.current._party; return p && p.state === 'open' && p.members.some((m) => m.id === id) ? p.members.map((m) => m.id) : null; }, F.id), 6000);
  rec.ok('a party: the phone invited, the friend accepted, and the phone\'s party is open with them in it', inWheel && !!party, { inWheel, party });

  /* ── 2. beside you ── */
  const m2 = await until(async () => { const m = await mini(); return m.party && m.party.length === 1 && !m.party[0].edge ? m : null; }, 6000);
  rec.ok(`the friend beside you: the minimap draws them as your party's mark (${m2 ? m2.party[0].px : '?'} px), in the box, not on its edge`,
    !!m2 && m2.party[0].id === F.id && m2.party[0].px === 15 && Math.abs(m2.party[0].x - m2.px) < 30, m2 || await mini());
  await shot(A, 'beside');

  /* ── 3. off the box ── */
  await F.place(me.x + 3000, me.y + 20);
  const m3 = await until(async () => { const m = await mini(); return m.party && m.party.length === 1 && m.party[0].edge ? m : null; }, 8000);
  const hi = m3 ? m3.box - (m3.frame + 9) : null;
  rec.ok(`the friend 3,000 px east, off the box: their mark rides its east edge (x ${m3 ? m3.party[0].x : '?'} of ${hi}), level with them, smaller`,
    !!m3 && Math.abs(m3.party[0].x - hi) <= 1 && Math.abs(m3.party[0].y - m3.py) <= 3 && m3.party[0].px === 11, m3 || await mini());
  await shot(A, 'edge');

  /* ── 4. the world map ── */
  await A.page.evaluate(() => window.__btWorldMapOpen(true));
  const wm = await until(() => A.page.evaluate(() => { const m = window.__btWorldMap || {}; return m.open && m.more && m.more.party === 1 ? { zoom: m.zoom, party: m.more.party, names: m.more.partyNames, others: m.more.others } : null; }), 5000);
  const key = await A.page.evaluate(() => [...document.querySelectorAll('span, div')].some((e) => e.childElementCount <= 1 && e.textContent.trim() === 'party'));
  rec.ok(`the world map at zoom ${wm ? wm.zoom : '?'} (the bros only from 1.5): the friend drawn as party and named (${wm ? wm.names : '?'}), and the key says "party"`,
    !!wm && wm.zoom < 1.5 && wm.party === 1 && wm.names === 1 && key, { wm, key });
  await shot(A, 'worldmap');
  await A.page.evaluate(() => window.__btWorldMapOpen(false));

  /* ── 5. the friend leaves ── */
  F.send({ type: 'party_leave' });
  const gone = await until(async () => { const m = await mini(); const p = await A.page.evaluate(() => window._gameState.current._party); return !p && m.party && m.party.length === 0 ? m : null; }, 6000);
  rec.ok('the friend leaves the party: no party mark on the minimap', !!gone, gone || await mini());

  alive = false; F.close();
  stopAlive = true;
  const errsA = A.logs.filter((l) => /pageerror/.test(l));
  await A.ctx.close().catch(() => {});

  /* ── 6. the dungeons' and the farm's box ── */
  const B = await H.newPlayer(browser, { name: 'Townie', wsPort, webPort, viewport: VIEW, query: 'room=' + ROOM2 });
  await H.enterWorld(B);
  await B.page.waitForTimeout(1500);
  const meB = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, zone: S.currentZone }));
  const G = sock(wsPort, 'Guest', ROOM2);
  await G.open();
  G.move(meB.x + 90, meB.y + 10, meB.zone);
  let aliveG = true;
  (async () => { while (aliveG) { await new Promise((r) => setTimeout(r, 4000)); if (!aliveG) break; try { G.move(G.x, G.y, G.z); } catch {} } })();
  const marksB = () => B.page.evaluate(([blue, green]) => {
    const all = window.__btMinimapAll ? window.__btMinimapAll() : [];
    const pl = all.filter((m) => m.icon === 'player');
    return { blue: pl.filter((m) => m.color === blue).length, green: pl.filter((m) => m.color === green).length, wheel: !!(window.__btMinimap && window.__btMinimap.wheel) };
  }, [PARTY_BLUE, C_OTHER]);
  const untilB = async (fn, ms) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await B.page.waitForTimeout(150); } };
  const before = await untilB(async () => { const m = await marksB(); return m.green >= 1 ? m : null; }, 6000);
  await B.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, G.id);
  await new Promise((r) => setTimeout(r, 800));
  G.send({ type: 'party_accept', target: meB.id });
  const inParty = await untilB(async () => { const m = await marksB(); return m.blue === 1 && m.green === 0 ? m : null; }, 6000);
  await shot(B, 'town');
  G.send({ type: 'party_leave' });
  const outParty = await untilB(async () => { const m = await marksB(); return m.blue === 0 && m.green >= 1 ? m : null; }, 6000);
  rec.ok(`the dungeons' and the farm's box (today's town, ${meB.zone}): a green dot, then in your party the party's blue (${inParty ? inParty.blue : '?'}) and no green, then out of it green again`,
    !!before && !!inParty && !!outParty, { before, inParty, outParty, after: await marksB() });
  aliveG = false; G.close();
  const errsB = B.logs.filter((l) => /pageerror/.test(l));
  await B.ctx.close().catch(() => {});

  const errs = errsA.concat(errsB);
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
}
