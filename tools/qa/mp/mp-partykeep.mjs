/* ═══ v2.3.3284: A PARTY THAT LASTS (server/src/party.js, src/game/partyRows.js) ═══
 *
 * The owner: a party "that stays persistent until you remove yourself from the
 * party and it becomes 'alliance' at 20+ people", then "Go recommended".  Step
 * 1: the party is stored, keeps its offline members and grows past four; the
 * strip shows six.  A real phone leads; its friends are bare sockets speaking
 * the game's protocol.  In the DEFAULT room: the login door's account check
 * (/api/account/login) reads the default room only, so after a reload in a
 * room of its own the phone could not come back as itself -- the harness made
 * a new character, in no party.
 *   1. a party of five (past the old four): the strip says 5/50, one row each;
 *   2. a friend logs out: they stay, their row offline and last;
 *   3. two more join: seven -- six rows, you first, then the online ones
 *      nearest you, and "+1 more · 6 online";
 *   4. the phone reloads (a logout and a login): the party is back, the friend
 *      who left still on it, offline;
 *   5. the friend logs back in: online again;
 *   6. leaving takes two taps: the first says "Leave?" and leaves nothing, the
 *      second leaves -- the strip gone, and the friends' roster without you;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs partykeep
 */
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

function sock(wsPort, name, id) {
  const w = { x: 0, y: 0, ws: null, synced: false, z: 'town', got: [], id };
  w.open = () => new Promise((resolve, reject) => {
    w.synced = false;
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?rf=1`);
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
  w.move = (x, y, z = 'wheel') => {
    w.x = x; w.y = y; w.z = z;
    w.send({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false });
  };
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await new Promise((r) => setTimeout(r, 300)); w.move(x, y, 'wheel'); };
  w.close = () => { try { w.ws.close(); } catch {} };
  return w;
}

/* A real finger (CDP), as a phone taps */
async function tap(P, sel) {
  const c = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
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

/* the strip as drawn */
const strip = (P) => P.page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-party-row]')];
  const head = rows.length ? rows[0].parentElement.firstChild : null;
  const more = document.querySelector('[data-party-more]');
  const leave = document.querySelector('[data-party-leave]');
  const S = window._gameState.current;
  return {
    head: head ? head.textContent.replace(/\s+/g, ' ').trim() : null,
    rows: rows.map((r) => ({ state: r.getAttribute('data-party-row'), text: r.textContent.replace(/\s+/g, ' ').trim() })),
    more: more ? more.textContent.trim() : null,
    leave: leave ? { armed: leave.getAttribute('data-party-leave'), text: leave.textContent.trim() } : null,
    party: S._party ? { n: S._party.members.length, max: S._party.max, off: S._party.members.filter((m) => m.off).map((m) => m.name) } : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `partykeep-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Leader', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errs = [];
  A.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(A);
  const inWheel = async () => {
    for (let i = 0; i < 120; i++) {
      if ((await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
      await A.page.waitForTimeout(500);
    }
    return false;
  };
  rec.ok('the phone in the Wheel (guard)', await inWheel());
  let stopAlive = false;
  (async () => { while (!stopAlive) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
  await A.page.waitForTimeout(2000);
  const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId }));
  const until = async (fn, ms, gap = 200) => {
    const t0 = Date.now();
    for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await A.page.waitForTimeout(gap); }
  };
  const tag = Math.random().toString(36).slice(2, 8);
  const NAMES = ['Bea', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus'];
  const DIST = { Bea: 120, Cal: 300, Dee: 900, Eli: 1600, Fay: 2500, Gus: 60 };
  const F = {};
  for (const n of NAMES) { F[n] = sock(wsPort, n, 'pk' + n.toLowerCase() + tag); }
  let alive = true;
  (async () => { while (alive) { await new Promise((r) => setTimeout(r, 4000)); if (!alive) break; for (const n of NAMES) { try { if (F[n].synced && F[n].ws.readyState === 1) F[n].move(F[n].x, F[n].y); } catch {} } } })();
  const invite = async (n) => {
    await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, F[n].id);
    await until(async () => F[n].got.some((m) => m.type === 'party_invited'), 6000);
    F[n].send({ type: 'party_accept', target: me.id });
  };
  const partyN = (k) => until(async () => { const s = await strip(A); return s.party && s.party.n === k ? s : null; }, 8000);

  /* ── 1. five, past the old four ── */
  for (const n of ['Bea', 'Cal', 'Dee', 'Eli']) { await F[n].open(); await F[n].place(me.x + DIST[n], me.y + 20); await invite(n); }
  const s1 = await partyN(5);
  await A.page.waitForTimeout(2500);
  const s1b = await strip(A);
  rec.ok(`a party of five, past the old four: the strip says "${s1b.head}" and draws a row each`,
    !!s1 && s1b.party && s1b.party.max === 50 && /5\/50/.test(s1b.head || '') && s1b.rows.length === 5 && !s1b.more, s1b);
  await shot(A, '1-five');

  /* ── 2. a friend logs out ── */
  F.Eli.close();
  const s2 = await until(async () => { const s = await strip(A); return s.rows.length === 5 && s.rows[4].state === 'off' ? s : null; }, 8000);
  rec.ok(`a friend logs out: they stay, their row offline and last ("${s2 ? s2.rows[4].text : '?'}")`,
    !!s2 && /Eli/.test(s2.rows[4].text) && /offline/.test(s2.rows[4].text) && s2.party.n === 5 && s2.party.off.join() === 'Eli', s2 || await strip(A));
  await shot(A, '2-offline');

  /* ── 3. seven ── */
  for (const n of ['Fay', 'Gus']) { await F[n].open(); await F[n].place(me.x + DIST[n], me.y + 20); await invite(n); }
  await partyN(7);
  const s3 = await until(async () => { const s = await strip(A); return s.rows.length === 6 && s.more && /Gus/.test(s.rows[1].text) ? s : null; }, 10000);
  const order = s3 ? s3.rows.map((r) => (r.text.match(/Leader|Bea|Cal|Dee|Eli|Fay|Gus/) || ['?'])[0]) : null;
  rec.ok(`seven: six rows, you first, then the online friends nearest you (${order ? order.join(', ') : '?'})`,
    !!order && order.join() === ['Leader', 'Gus', 'Bea', 'Cal', 'Dee', 'Fay'].join(), s3 || await strip(A));
  rec.ok(`...and "${s3 ? s3.more : '?'}" for the offline friend past the sixth row`, !!s3 && /\+1 more/.test(s3.more) && /6 online/.test(s3.more), s3 && s3.more);
  await shot(A, '3-seven');

  /* ── 4. the phone reloads ── */
  stopAlive = true;
  await A.page.waitForTimeout(600);
  /* a logout and a login: the door, Continue, and this phone's own character
     (the harness's returning-device road, enterWorld) */
  await A.page.reload();
  await H.enterWorld(A);
  await inWheel();
  const meAgain = await H.readState(A, (S) => S.myId);
  rec.ok('the phone comes back as the same player (guard)', meAgain === me.id, { was: me.id, now: meAgain });
  stopAlive = false;
  (async () => { while (!stopAlive) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
  const s4 = await until(async () => { const s = await strip(A); return s.party && s.party.n === 7 ? s : null; }, 15000);
  rec.ok('the phone logs out and back in: the party of seven is back, the friend who left still on it, offline',
    !!s4 && s4.party.off.join() === 'Eli' && /7\/50/.test(s4.head || ''), s4 || await strip(A));

  /* ── 5. the friend logs back in ── */
  await F.Eli.open();
  await F.Eli.place(me.x + DIST.Eli, me.y + 20);
  const s5 = await until(async () => { const s = await strip(A); return s.party && s.party.n === 7 && !s.party.off.length ? s : null; }, 10000);
  rec.ok('the friend logs back in: online again, on the same party', !!s5, s5 || await strip(A));

  /* ── 6. leaving takes two taps ── */
  await tap(A, '[data-party-leave]');
  await A.page.waitForTimeout(400);
  const s6a = await strip(A);
  rec.ok(`the first tap on ✖ says "${s6a.leave ? s6a.leave.text : '?'}" and leaves nothing`,
    !!s6a.leave && s6a.leave.armed === 'armed' && /Leave\?/.test(s6a.leave.text) && s6a.party && s6a.party.n === 7, s6a);
  await tap(A, '[data-party-leave]');
  const s6b = await until(async () => { const s = await strip(A); return !s.party && !s.rows.length ? s : null; }, 6000);
  const theirs = F.Bea.got.filter((m) => m.type === 'party_state' && m.payload && m.payload.state === 'open').pop();
  rec.ok('the second tap leaves: the strip gone, and the friends\' roster without you, its leader handed on',
    !!s6b && !!theirs && !theirs.payload.members.some((m) => m.id === me.id) && theirs.payload.leader !== me.id, { s6b, theirs: theirs && theirs.payload && { leader: theirs.payload.leader, n: theirs.payload.members.length } });
  await shot(A, '6-left');

  alive = false;
  stopAlive = true;
  for (const n of NAMES) F[n].close();
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  await A.ctx.close().catch(() => {});
}
