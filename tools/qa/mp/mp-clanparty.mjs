/* ═══ v2.3.3315: CLANS BECOME PARTIES (server/src/clanparty.js) ═══
 *
 * The owner: "skip clans altogether and just go from party to alliances",
 * then "Go recommended" to the plan whose third step this is
 * (docs/specs/alliance.md "Step 3").  A real phone and two bare sockets
 * speaking the game's protocol:
 *   1. under the switch that keeps clans (`clanparty: false`), the phone founds
 *      [GOLD] Gold Crew and a friend (a socket) joins it;
 *   2. the switch comes off with both still on, and the next join anywhere (a
 *      second socket) turns the clan into a party: the phone's strip reads
 *      [GOLD] 2/50, its chat "Your clan [GOLD] is a party now", its own plate
 *      and the friend's plate as it draws it read [GOLD], and the friend's
 *      socket was told the same (party_state, `fromClan`);
 *   3. the Saloon's Alliance part: "[GOLD] Gold Crew", "Your clan is this
 *      party now", its count toward 20;
 *   4. the dashboard's Clan page: the party's tag, and Find a party opens the
 *      player list;
 *   5. the Guild Hall says "Clans are parties now", its row opens the clan
 *      window's word on it, and that window's Find a party opens the player
 *      list;
 *   6. no new clans: the friend's clan_create is answered "Clans are parties
 *      now";
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs clanparty
 */
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

function sock(wsPort, name, id) {
  const w = { x: 0, y: 0, ws: null, synced: false, z: 'town', got: [], id, name };
  w.open = () => new Promise((resolve, reject) => {
    w.synced = false;
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, name, protocolVersion: 2, pres: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name, hr: 'long', bt: '#22aaff' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (ev.data.indexOf('"party_') >= 0 || ev.data.indexOf('"clan_') >= 0) { try { w.got.push(JSON.parse(ev.data)); } catch {} }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error(name + ' socket error'));
    ws.onclose = (ev) => { w.closed = { code: ev.code, reason: ev.reason, at: Date.now() }; };
  });
  w.send = (m) => w.ws.send(JSON.stringify(m));
  w.move = (x, y, z = 'wheel') => {
    w.x = x; w.y = y; w.z = z;
    w.send({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false });
  };
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  w.here = () => w.send({ type: 'track', data: { aw: 0 } });   /* mp-alliance: standing still is not activity */
  w.close = () => { try { w.ws.close(); } catch {} };
  return w;
}

async function tap(P, sel) {
  const c = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!c) return false;
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 7 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return true;
}

const txt = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null; }, sel);
const head = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-party-head]');
  return el ? { kind: el.getAttribute('data-party-head'), text: el.parentElement.textContent.replace(/\s+/g, ' ').trim() } : null;
});

export async function run(ctx) {
  const set = await H.liveFlag(ctx.wsPort, 'clanparty', false);
  ctx.rec.ok('the room keeps clans to begin with (clanparty: false, guard)', !!(set && set.ok), set);
  try { await runIt(ctx); } finally { await H.liveFlag(ctx.wsPort, 'clanparty', null).catch(() => {}); }
}

async function runIt({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `clanparty-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Leader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errs = [];
  A.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(A);
  let wheel = false;
  for (let i = 0; i < 120 && !wheel; i++) {
    wheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!wheel) await A.page.waitForTimeout(500);
  }
  rec.ok('the phone in the Wheel (guard)', wheel);
  let stopA = H.keepAlive(A);
  const until = async (fn, ms, gap = 250) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, caps: !!(S._serverCaps && S._serverCaps.clanparty) }));
  rec.ok('the phone was told clans are kept (no caps.clanparty, guard)', me.caps === false, me.caps);

  /* ── 1. a clan, the old way ── */
  await H.grant(wsPort, me.id, 'gold', { amount: 900 });
  await until(async () => (await H.readState(A, (S) => (S.rpg && S.rpg.coins) || 0)) >= 500, 8000);
  /* the clan window's own send (ClanPanel.jsx): the page's channel takes it as a broadcast event */
  await A.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'clan_create', payload: { name: 'Gold Crew', tag: 'GOLD' } }); });
  const founded = await until(async () => (await H.readState(A, (S) => S._clanData && S._clanData.tag)) === 'GOLD', 10000);
  rec.ok('1. the phone founds [GOLD] Gold Crew under the switch', !!founded, await H.readState(A, (S) => S._clanData));
  const tagId = Math.random().toString(36).slice(2, 7);
  const M = sock(wsPort, 'Mate', 'cp' + tagId + 'm');
  await M.open();
  await M.place(me.x + 70, me.y + 30);
  await A.page.evaluate((target) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'clan_invite', payload: { target, from: S.myId, fromName: S.myName, clanName: S._clanData.name, clanTag: S._clanData.tag } });
  }, M.id);
  await A.page.waitForTimeout(800);
  M.send({ type: 'clan_join_accept', payload: { inviter: me.id } });
  const two = await until(async () => (await H.readState(A, (S) => (S._clanData && S._clanData.members ? S._clanData.members.length : 0))) === 2, 10000);
  rec.ok('1. ...and a friend joins it', !!two, await H.readState(A, (S) => S._clanData && S._clanData.members));
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 4000)); if (!alive) break; try { if (M.synced && M.ws.readyState === 1) { M.move(M.x, M.y); M.here(); } } catch {} } })();

  /* ── 2. the switch comes off; the next join turns the clan into a party ── */
  const cleared = await H.liveFlag(wsPort, 'clanparty', null);
  rec.ok('2. (setup) the switch comes off', !!(cleared && cleared.ok) && !('clanparty' in (cleared.flags || {})), cleared);
  const N = sock(wsPort, 'Newcomer', 'cp' + tagId + 'n');
  await N.open();
  const h2 = await until(async () => { const h = await head(A); return h && /\[GOLD\]/.test(h.text) ? h : null; }, 12000);
  rec.ok(`2. the next join turns it into a party: the strip reads "${h2 ? h2.text : '?'}"`, !!h2 && h2.kind === 'clan' && /2\/50/.test(h2.text), h2 || await head(A));
  const line = await until(async () => A.page.evaluate(() => {
    const S = window._gameState.current;
    const l = (S.chatLog || []).find((m) => /Your clan \[GOLD\] is a party now/.test(m.text || ''));
    return l ? l.text : null;
  }), 6000);
  rec.ok(`2. ...the chat says "${line || '?'}"`, !!line, line);
  const selfPlate = await until(async () => { const t = await A.page.evaluate(() => window.__btSelfPlate || null); return t && /^\[GOLD\] /.test(t) ? t : null; }, 8000);
  rec.ok(`2. ...the phone's own plate reads "${selfPlate || '?'}"`, !!selfPlate && /^\[GOLD\] Leader/.test(selfPlate), selfPlate);
  const matePlate = await until(async () => {
    const t = await A.page.evaluate((id) => (window.__btPeerBadge && window.__btPeerBadge[id] ? window.__btPeerBadge[id].name : null), M.id);
    return t && /^\[GOLD\] /.test(t) ? t : null;
  }, 10000);
  rec.ok(`2. ...and the friend's plate as the phone draws it, "${matePlate || '?'}"`, !!matePlate && /^\[GOLD\] Mate/.test(matePlate), matePlate);
  const clanGone = await until(async () => (await H.readState(A, (S) => S._clanData)) === null, 6000);
  rec.ok('2. ...the clan window\'s copy of the clan is gone (clan_state null)', !!clanGone, await H.readState(A, (S) => S._clanData));
  const mateTold = M.got.some((m) => m.type === 'party_state' && m.payload && m.payload.fromClan === 1 && m.payload.ally && m.payload.ally.tag === 'GOLD');
  rec.ok('2. ...the friend\'s socket was told (party_state, fromClan, [GOLD])', mateTold, M.got.filter((m) => m.type === 'party_state').map((m) => m.payload && m.payload.ally));
  await shot(A, '2-party');

  /* ── 3. the Saloon ── */
  await A.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open('party'));
  const sal = await until(async () => {
    const t = await txt(A, '[data-ally-clan="1"]');
    return t && /\[GOLD\] Gold Crew/.test(t) ? t : null;
  }, 6000);
  const salWell = await txt(A, '[data-ally-on]');
  rec.ok(`3. the Saloon's Alliance part: "${sal || '?'}"`, !!sal && /Your clan is this party now/.test(salWell || '') && /\/20/.test(salWell || ''), salWell);
  await shot(A, '3-saloon');
  await A.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open(null));
  await A.page.waitForTimeout(500);

  /* ── 3b. the next visit: a phone learns a worker's rules at its join (its
     caps), so the phone reloads, as a player's next visit would -- and the
     party is read back from storage, a former clan still ── */
  stopA();
  await A.page.reload();
  await H.enterWorld(A);
  wheel = false;
  for (let i = 0; i < 120 && !wheel; i++) {
    wheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!wheel) await A.page.waitForTimeout(500);
  }
  stopA = H.keepAlive(A);
  const capsNow = await until(async () => H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.clanparty)), 10000);
  const h3 = await until(async () => { const h = await head(A); return h && /\[GOLD\]/.test(h.text) ? h : null; }, 12000);
  rec.ok(`3b. the next visit: told clans are parties now (caps.clanparty), the party read back, "${h3 ? h3.text : '?'}"`, !!capsNow && !!h3 && h3.kind === 'clan', { capsNow, h3 });

  /* ── 4. the dashboard's Clan page ── */
  await A.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('clan'));
  const dash = await until(async () => A.page.evaluate(() => {
    const el = document.querySelector('[data-dash-clanparty]');
    return el ? { tag: el.getAttribute('data-dash-clanparty'), text: (el.textContent || '').replace(/\s+/g, ' ').trim() } : null;
  }), 6000);
  rec.ok(`4. the dashboard's Clan page: "${dash ? dash.text.slice(0, 90) : '?'}"`, !!dash && dash.tag === 'GOLD' && /\[GOLD\] Gold Crew/.test(dash.text) && /Your clan, now a party/.test(dash.text), dash);
  await shot(A, '4-dash');
  await tap(A, '[data-dash-find-party]');
  const plist1 = await until(async () => A.page.evaluate(() => !!document.querySelector('.bt-plist')), 6000);
  rec.ok('4. ...its Find a party opens the player list', !!plist1);
  await A.page.evaluate(() => { if (window._uiPanels && window._uiPanels.playerList) window._uiPanels.playerList(false); });
  await A.page.waitForTimeout(400);

  /* ── 5. the Guild Hall and the clan window ── */
  await A.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open('guildhall'));
  const row = await until(async () => txt(A, '[data-hall-row="clan"]'), 6000);
  rec.ok(`5. the Guild Hall's clan row: "${row || '?'}"`, !!row && /Clans are parties now/.test(row) && /Saloon/.test(row), row);
  await shot(A, '5-guildhall');
  await tap(A, '[data-hall-row="clan"]');
  const win = await until(async () => txt(A, '[data-panel="clan"][data-clanparty]'), 6000);
  rec.ok('5. ...its row opens the clan window, which says so too', !!win && /Clans are parties now/i.test(win) && /Saloon/.test(win), win);
  await shot(A, '5-clanwindow');
  await tap(A, '[data-clanparty-find]');
  const plist2 = await until(async () => A.page.evaluate(() => !!document.querySelector('.bt-plist') && !document.querySelector('[data-panel="clan"]')), 6000);
  rec.ok('5. ...and its Find a party opens the player list (the window closing)', !!plist2);
  await A.page.evaluate(() => { if (window._uiPanels && window._uiPanels.playerList) window._uiPanels.playerList(false); });

  /* ── 6. no new clans ── */
  M.got.length = 0;
  M.send({ type: 'clan_create', payload: { name: 'Another', tag: 'ANTR' } });
  const refused = await until(async () => M.got.find((m) => m.type === 'clan_error'), 5000);
  rec.ok(`6. a clan_create is refused: "${refused && refused.payload && refused.payload.text}"`, !!refused && /Clans are parties now/.test(refused.payload.text || ''), refused && refused.payload);

  /* ── 7 ── */
  rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 3));
  alive = false;
  stopA();
  M.close(); N.close();
  await A.ctx.close().catch(() => {});
}
