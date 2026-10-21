/* ═══ v2.3.3313: THE ALLIANCE (server/src/alliance.js, src/game/alliance.js) ═══
 *
 * The owner: a party "that stays persistent until you remove yourself from the
 * party and it becomes 'alliance' at 20+ people", then "keep going on
 * recommended" to its four decisions (docs/specs/alliance.md).  A real phone
 * leads; its 19 friends, and a second alliance of 20, are bare sockets
 * speaking the game's protocol, raised to level 5 by the test lever
 * (/dev/combat: an alliance counts members at level 5 or more).  A second
 * phone, not in either, watches the leader's plate.
 *   1. 19 friends at level 5 join: the strip says ALLIANCE 20/50, and the
 *      Saloon's Alliance part says so, with the leader's name form;
 *   2. the leader names it in the Saloon, with real taps and typing: [IRN] on
 *      the strip's head, on the phone's own plate, on a friend's plate as the
 *      phone draws it, and on the leader's plate on the second phone;
 *   3. the board (a real tap): one alliance, [IRN] Iron Bros, 20 active;
 *   4. a war: a second alliance names itself GLD; the leader types its tag
 *      and taps Declare war: the Saloon shows the war, 0–0, with time left,
 *      and the other side was told;
 *   5. a friend leaves: 19 active, still an alliance (it stays down to 15),
 *      and the friend's plate on the phone loses the tag;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs alliance
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
      if (ev.data.indexOf('"party_') >= 0 || ev.data.indexOf('"alliance_') >= 0) { try { w.got.push(JSON.parse(ev.data)); } catch {} }
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
  /* standing still is not activity (index.js: a keepalive move whose
     signature never changes leaves lastRecv alone), so a bot says it is there
     as a phone does, `aw: 0` on a track -- or the worker's 2-minute idle sweep
     closes it (4006), as it did every one of the 19 on the first run */
  w.here = () => w.send({ type: 'track', data: { aw: 0 } });
  w.close = () => { try { w.ws.close(); } catch {} };
  w.lastParty = () => { const r = w.got.filter((m) => m.type === 'party_state'); return r.length ? r[r.length - 1].payload : null; };
  return w;
}

/* A real finger (CDP), as a phone taps */
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

/* type into an input as a phone keyboard does: a tap, then the keys.  The
   page's keep-alive (a Control press every 20 s) is held off meanwhile: one
   landing between two keys made the next letter a Ctrl shortcut, and the first
   run named the alliance "Ion Bros" and declared war on "GD". */
let holdAlive = null;
async function typeInto(P, sel, text) {
  if (!(await tap(P, sel))) return false;
  if (holdAlive) holdAlive.stop();
  await P.page.waitForTimeout(150);
  await P.page.focus(sel).catch(() => {});
  await P.page.keyboard.type(text, { delay: 30 });
  if (holdAlive) holdAlive.start();
  return true;
}

const head = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-party-head]');
  return el ? { kind: el.getAttribute('data-party-head'), text: el.parentElement.textContent.replace(/\s+/g, ' ').trim() } : null;
});

const saloon = (P) => P.page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const rows = [...document.querySelectorAll('[data-ally-board-row]')].map(txt);
  return {
    on: q('[data-ally-on]') ? q('[data-ally-on]').getAttribute('data-ally-on') : null,
    title: txt(q('[data-ally-title]')),
    nameForm: !!q('[data-ally-nameform]'),
    warForm: !!q('[data-ally-warform]'),
    warOn: txt(q('[data-ally-war-on]')),
    score: txt(q('[data-ally-score]')),
    error: txt(q('[data-ally-error]')),
    board: rows,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `alliance-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Leader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errs = [];
  A.page.on('pageerror', (e) => errs.push('A: ' + String(e && e.message || e)));
  await H.enterWorld(A);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  rec.ok('the phone in the Wheel (guard)', await inWheel(A));
  let stopA = H.keepAlive(A);
  holdAlive = { stop: () => stopA(), start: () => { stopA = H.keepAlive(A); } };
  await A.page.waitForTimeout(1500);
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId }));
  /* v2.3.3538: ONE LEVEL -- the level is the best weapon, so the sword at 5 */
  const lv = await H.devOp(wsPort, 'combat', me.id, { skill: 'sword', level: 5 });
  rec.ok('the phone raised to level 5 by the test lever (guard)', lv && lv.ok && lv.charLevel === 5, lv);
  const until = async (fn, ms, gap = 250) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };
  const tag = Math.random().toString(36).slice(2, 7);
  const t0 = Date.now();
  const F = [];
  for (let i = 0; i < 19; i++) F.push(sock(wsPort, 'Bro' + i, 'al' + tag + 'f' + i));
  const G = [];
  for (let i = 0; i < 20; i++) G.push(sock(wsPort, 'Gold' + i, 'al' + tag + 'g' + i));
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 4000)); if (!alive) break; for (const w of [...F, ...G]) { try { if (w.synced && w.ws.readyState === 1) { w.move(w.x, w.y); w.here(); } } catch {} } } })();

  /* ── 1. twenty at level 5 ── */
  for (let i = 0; i < F.length; i++) {
    const w = F[i];
    await w.open();
    await w.place(me.x + 60 + (i % 5) * 40, me.y + 40 + Math.floor(i / 5) * 40);
    await H.devOp(wsPort, 'combat', w.id, { skill: 'sword', level: 5 });   /* v2.3.3538: level 5 is the sword at 5 */
    await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, w.id);
    await until(async () => w.got.some((m) => m.type === 'party_invited'), 6000);
    w.send({ type: 'party_accept', target: me.id });
    await until(async () => (await H.readState(A, (S) => (S._party ? S._party.members.length : 0))) === i + 2, 6000);
  }
  const h1 = await until(async () => { const h = await head(A); return h && h.kind === 'alliance' ? h : null; }, 10000);
  rec.ok(`20 active members make it an alliance: the strip says "${h1 ? h1.text : '?'}"`, !!h1 && /ALLIANCE/.test(h1.text) && /20\/50/.test(h1.text), h1 || await head(A));
  await A.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open('party'));
  const s1 = await until(async () => { const s = await saloon(A); return s.on === '1' ? s : null; }, 6000);
  rec.ok('the Saloon\'s Alliance part says it is one, and gives the leader the name form', !!s1 && s1.nameForm && /Unnamed alliance/.test(s1.title || ''), s1 || await saloon(A));
  await shot(A, '1-alliance');

  /* ── 2. naming it ── */
  await typeInto(A, '[data-ally-name]', 'Iron Bros');
  await typeInto(A, '[data-ally-tag]', 'irn');
  await tap(A, '[data-ally-save]');
  const named = await until(async () => (await H.readState(A, (S) => S._party && S._party.ally && S._party.ally.tag)) === 'IRN', 8000);
  const h2 = await head(A);
  const s2 = await saloon(A);
  rec.ok(`the leader names it with real taps: the Saloon says "${s2.title}", the strip "${h2 ? h2.text : '?'}"`,
    !!named && /\[IRN\] Iron Bros/.test(s2.title || '') && !!h2 && /\[IRN\]/.test(h2.text), { s2, h2 });
  const selfPlate = await until(async () => { const t = await A.page.evaluate(() => window.__btSelfPlate || null); return t && /^\[IRN\] /.test(t) ? t : null; }, 6000);
  rec.ok(`...the phone's own plate reads "${selfPlate || '?'}"`, !!selfPlate && /^\[IRN\] Leader/.test(selfPlate), selfPlate);
  const friendPlate = await until(async () => {
    const t = await A.page.evaluate((id) => (window.__btPeerBadge && window.__btPeerBadge[id] ? window.__btPeerBadge[id].name : null), F[0].id);
    return t && /^\[IRN\] /.test(t) ? t : null;
  }, 8000);
  rec.ok(`...a friend's plate as the phone draws it: "${friendPlate || '?'}"`, !!friendPlate && /^\[IRN\] Bro0/.test(friendPlate), friendPlate);
  await shot(A, '2-named');
  /* the watcher: a second phone, in nothing */
  const W = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true, world: 'wheel', viewport: PHONE, touch: true });
  W.page.on('pageerror', (e) => errs.push('W: ' + String(e && e.message || e)));
  await H.enterWorld(W);
  await inWheel(W);
  const stopW = H.keepAlive(W);
  const leaderOnW = await until(async () => {
    const t = await W.page.evaluate((id) => (window.__btPeerBadge && window.__btPeerBadge[id] ? window.__btPeerBadge[id].name : null), me.id);
    return t && /^\[IRN\] /.test(t) ? t : null;
  }, 20000, 500);
  rec.ok(`...and on a second phone, not in the party, the leader's plate reads "${leaderOnW || '?'}"`, !!leaderOnW && /^\[IRN\] Leader/.test(leaderOnW),
    leaderOnW || await W.page.evaluate((id) => {
      const S = window._gameState.current, o = S.others && S.others[id];
      return { zone: S.currentZone, me: S.player && [Math.round(S.player.x), Math.round(S.player.y)], peer: o ? { x: Math.round(o.x), y: Math.round(o.y), zone: o.zone, tag: o.allyTag, away: !!o._away, fa: !!o._fa } : null,
        badges: window.__btPeerBadge ? Object.keys(window.__btPeerBadge).length : -1, others: Object.keys(S.others || {}).length };
    }, me.id));
  await shot(W, '2-watcher');

  /* ── 3. the board ── */
  await tap(A, '[data-ally-board]');
  const s3 = await until(async () => { const s = await saloon(A); return s.board.length ? s : null; }, 8000);
  rec.ok(`the board (a real tap): ${s3 ? JSON.stringify(s3.board) : '?'}`,
    !!s3 && s3.board.length === 1 && /\[IRN\] Iron Bros/.test(s3.board[0]) && /20 active/.test(s3.board[0]), s3 || await saloon(A));
  await shot(A, '3-board');

  /* ── 4. a war ── */
  for (const w of G) { await w.open(); await w.place(me.x - 400, me.y + 200); await H.devOp(wsPort, 'combat', w.id, { skill: 'bow', level: 5 }); }   /* v2.3.3538 */
  for (let i = 1; i < G.length; i++) {
    G[0].send({ type: 'party_invite', payload: { target: G[i].id } });
    await until(async () => G[i].got.some((m) => m.type === 'party_invited'), 6000);
    G[i].send({ type: 'party_accept', payload: { target: G[0].id } });
    await new Promise((r) => setTimeout(r, 150));
  }
  const gOn = await until(async () => { const p = G[0].lastParty(); return p && p.ally && p.ally.on ? p : null; }, 10000);
  rec.ok('a second party of 20 bots becomes an alliance (guard)', !!gOn, G[0].lastParty() && G[0].lastParty().ally);
  G[0].send({ type: 'alliance_name', payload: { name: 'Gold Crew', tag: 'GLD' } });
  const gNamed = await until(async () => { const p = G[0].lastParty(); return p && p.ally && p.ally.tag === 'GLD' ? p : null; }, 8000);
  rec.ok('...and names itself GLD (guard)', !!gNamed, G[0].lastParty() && G[0].lastParty().ally);
  await typeInto(A, '[data-ally-foe]', 'gld');
  await tap(A, '[data-ally-war]');
  const s4 = await until(async () => { const s = await saloon(A); return s.warOn ? s : null; }, 8000);
  rec.ok(`the leader types their tag and taps Declare war: "${s4 ? s4.warOn.slice(0, 80) : '?'}"`,
    !!s4 && /War with \[GLD\] Gold Crew/.test(s4.warOn) && s4.score === '0–0' && /min left/.test(s4.warOn), s4 || await saloon(A));
  const gWar = await until(async () => { const p = G[0].lastParty(); return p && p.ally && p.ally.war && p.ally.war.them && p.ally.war.them.tag === 'IRN' ? p : null; }, 6000);
  rec.ok('...and the other side was told (their roster shows the war on [IRN])', !!gWar, G[0].lastParty() && G[0].lastParty().ally);
  await shot(A, '4-war');

  /* ── 5. a friend leaves ── */
  F[0].send({ type: 'party_leave' });
  const s5 = await until(async () => {
    const p = await H.readState(A, (S) => (S._party && S._party.ally ? { n: S._party.members.length, on: S._party.ally.on, active: S._party.ally.active } : null));
    return p && p.n === 19 ? p : null;
  }, 8000);
  rec.ok(`a friend leaves: ${s5 ? s5.active : '?'} active, still an alliance (it stays down to 15)`, !!s5 && s5.on === true && s5.active === 19,
    s5 || { phone: await H.readState(A, (S) => ({ party: S._party ? { n: S._party.members.length, on: S._party.ally && S._party.ally.on } : null, ws: !!(S.channel), idle: !!S._idleLoggedOut })),
      f0: { ready: F[0].ws && F[0].ws.readyState, closed: F[0].closed || null, t0, last: F[0].lastParty() && { state: F[0].lastParty().state, n: F[0].lastParty().members ? F[0].lastParty().members.length : 0 } },
      closedBots: [...F, ...G].filter((w) => w.closed).map((w) => w.name + ':' + w.closed.code + ':' + Math.round((w.closed.at - t0) / 1000) + 's') });
  const leftPlate = await until(async () => {
    const t = await A.page.evaluate((id) => (window.__btPeerBadge && window.__btPeerBadge[id] ? window.__btPeerBadge[id].name : null), F[0].id);
    return t && !/^\[/.test(t) ? t : null;
  }, 8000);
  rec.ok(`...and their plate on the phone loses the tag: "${leftPlate || '?'}"`, !!leftPlate && /^Bro0/.test(leftPlate), leftPlate);

  alive = false;
  stopA(); stopW();
  for (const w of [...F, ...G]) w.close();
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  await A.ctx.close().catch(() => {});
  await W.ctx.close().catch(() => {});
}
